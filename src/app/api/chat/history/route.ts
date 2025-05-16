import { NextRequest, NextResponse } from 'next/server';
import { redis, CHAT_HISTORY_PREFIX, CHAT_INDEX_KEY, MAX_CHAT_HISTORY } from '@/lib/redis';
import { ChatSession } from '@/lib/types';

// GET /api/chat/history - Fetches top N recent chat sessions
export async function GET(req: NextRequest) {
  try {
    await redis.connect().catch(() => { /* ignore connection errors if already connected */ });
    // Get the top N chat IDs from the sorted set (newest first)
    const chatIds = await redis.zrevrange(CHAT_INDEX_KEY, 0, Number(MAX_CHAT_HISTORY) - 1);

    if (chatIds.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // Fetch all chat sessions in a single pipelined MGET command
    const pipeline = redis.pipeline();
    chatIds.forEach(id => pipeline.get(`${CHAT_HISTORY_PREFIX}${id}`));
    const results = await pipeline.exec();

    const chatSessions: ChatSession[] = results
      ?.map(([err, data]) => (data ? JSON.parse(data as string) : null))
      .filter(session => session !== null) as ChatSession[];

    // Ensure they are sorted by lastUpdated (zrevrange should maintain order)
    // but explicitly sort again if needed or if pipeline doesn't guarantee it for MGET
    chatSessions.sort((a, b) => b.lastUpdated - a.lastUpdated);

    return NextResponse.json(chatSessions, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json({ error: 'Failed to fetch chat history', details: error.message }, { status: 500 });
  }
}

// POST /api/chat/history - Saves or updates a chat session
export async function POST(req: NextRequest) {
  try {
    await redis.connect().catch(() => { /* ignore connection errors if already connected */ });
    const sessionData = await req.json();

    const sessionId = sessionData.id; // Now required session.id passed from client
    if (!sessionId) throw new Error(`Chat session ID is undefined.`);
    const sessionKey = `${CHAT_HISTORY_PREFIX}${sessionId}`;
    const sessionToSave: ChatSession = {
      ...sessionData,
      id: sessionId,
      lastUpdated: Date.now(),
    };

    const pipeline = redis.pipeline();
    // Store the chat session JSON
    pipeline.set(sessionKey, JSON.stringify(sessionToSave));
    // Add/update in the sorted set for recency, score is timestamp
    pipeline.zadd(CHAT_INDEX_KEY, sessionToSave.lastUpdated, sessionId);

    // Trim the sorted set to maintain MAX_CHAT_HISTORY
    // Get current size
    // const currentSize = await redis.zcard(CHAT_INDEX_KEY); // This is not pipeline safe
    // If after adding, size > MAX_CHAT_HISTORY, remove the oldest
    // This logic is a bit complex to do atomically without Lua or watching.
    // A simpler approach: always trim to the desired range.
    // ZREMRANGEBYRANK keeps elements from rank 0 to MAX_CHAT_HISTORY - 1 (if sorted by score ascending)
    // Since we sort by timestamp descending for zrevrange, for zremrangebyrank (ascending scores):
    // we want to remove items from rank 0 up to (total_count - MAX_CHAT_HISTORY - 1)
    // A simpler approach: after adding, if zcard > MAX_CHAT_HISTORY, remove oldest.
    // For now, let's do a check and remove after.
    await pipeline.exec(); // Execute save and add to index

    // Trim logic (after initial save)
    const currentSize = await redis.zcard(CHAT_INDEX_KEY);
    if (currentSize > Number(MAX_CHAT_HISTORY)) {
      const idsToRemove = await redis.zrange(CHAT_INDEX_KEY, 0, currentSize - Number(MAX_CHAT_HISTORY) - 1);
      if (idsToRemove.length > 0) {
        const removalPipeline = redis.pipeline();
        idsToRemove.forEach(id => {
          removalPipeline.del(`${CHAT_HISTORY_PREFIX}${id}`); // Delete the session data
          removalPipeline.zrem(CHAT_INDEX_KEY, id);       // Remove from sorted set
        });
        await removalPipeline.exec();
        // console.log(`Trimmed ${idsToRemove.length} old chat sessions.`);
      }
    }

    return NextResponse.json(sessionToSave, { status: 201 });
  } catch (error: any) {
    console.error('Error saving chat session:', error);
    return NextResponse.json({ error: 'Failed to save chat session', details: error.message }, { status: 500 });
  }
}