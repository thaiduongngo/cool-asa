import { NextRequest, NextResponse } from 'next/server';
import { redis, CHAT_HISTORY_PREFIX, CHAT_INDEX_KEY } from '@/lib/redis';
import { ChatSession } from '@/lib/types';

// GET /api/chat/history/[chatId] - Fetches a single chat session
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ chatId: string }> }
) {
  try {
    await redis.connect().catch(() => { });
    const { chatId } = await context.params;
    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    const sessionData = await redis.get(`${CHAT_HISTORY_PREFIX}${chatId}`);
    if (!sessionData) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
    }

    const session: ChatSession = JSON.parse(sessionData);
    return NextResponse.json(session, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching chat session by ID:', error);
    return NextResponse.json({ error: 'Failed to fetch chat session', details: error.message }, { status: 500 });
  }
}

// DELETE /api/chat/history/[chatId] - Deletes a chat session
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ chatId: string }> }
) {
  try {
    await redis.connect().catch(() => { });
    const { chatId } = await context.params;
    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    const pipeline = redis.pipeline();
    pipeline.del(`${CHAT_HISTORY_PREFIX}${chatId}`); // Delete session data
    pipeline.zrem(CHAT_INDEX_KEY, chatId);          // Remove from sorted set
    const results = await pipeline.exec();

    // Check if deletion from main store was successful (result[0][1] > 0 if key existed)
    if (results && results[0] && results[0][1] === 0) {
      // results[0] is for DEL, results[0][1] is the number of keys deleted
      console.warn(`Chat session ${chatId} not found for deletion or already deleted.`);
      // Still attempt to remove from index if it was there
    }


    return NextResponse.json({ message: 'Chat session deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting chat session:', error);
    return NextResponse.json({ error: 'Failed to delete chat session', details: error.message }, { status: 500 });
  }
}