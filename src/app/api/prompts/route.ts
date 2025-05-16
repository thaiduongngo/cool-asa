import { NextRequest, NextResponse } from 'next/server';
import { redis, RECENT_PROMPTS_KEY, MAX_RECENT_PROMPTS } from '@/lib/redis';
import { RecentPrompt } from '@/lib/types'; // Assuming RecentPrompt has id and text

// GET /api/prompts - Fetches top N recent prompts
export async function GET(req: NextRequest) {
  try {
    await redis.connect().catch(() => { });
    // Get the top N prompt texts from the sorted set (newest first by score)
    const promptTexts = await redis.zrevrange(RECENT_PROMPTS_KEY, 0, Number(MAX_RECENT_PROMPTS) - 1);

    const recentPrompts: RecentPrompt[] = promptTexts.map(text => ({
      id: text, // Using the text itself as a unique ID for client-side keying
      text: text,
    }));

    return NextResponse.json(recentPrompts, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching recent prompts:', error);
    return NextResponse.json({ error: 'Failed to fetch recent prompts', details: error.message }, { status: 500 });
  }
}

// POST /api/prompts - Adds a new prompt and trims the list
export async function POST(req: NextRequest) {
  try {
    await redis.connect().catch(() => { });
    const { text }: { text: string } = await req.json();

    if (!text || typeof text !== 'string' || text.trim() === '') {
      return NextResponse.json({ error: 'Prompt text is required and cannot be empty' }, { status: 400 });
    }

    const trimmedText = text.trim();
    const timestamp = Date.now();

    const pipeline = redis.pipeline();
    // Add/update prompt with current timestamp as score
    pipeline.zadd(RECENT_PROMPTS_KEY, timestamp, trimmedText);
    // Trim the sorted set to maintain MAX_RECENT_PROMPTS
    // Removes elements from rank 0 up to (total_count - MAX_COUNT - 1)
    // This keeps the MAX_COUNT elements with the highest scores (newest)
    pipeline.zremrangebyrank(RECENT_PROMPTS_KEY, 0, -(Number(MAX_RECENT_PROMPTS) + 1));
    // The above zremrangebyrank keeps the newest MAX_RECENT_PROMPTS items.
    // If you have 7 items and MAX is 5, it removes items at rank 0 and 1 (the oldest 2).
    // -(MAX + 1) means "up to the element that is (MAX+1)th from the end if sorted by score ascending".
    // Since zremrangebyrank uses 0-based indexing for ranks from the lowest score,
    // and we want to keep the highest MAX_RECENT_PROMPTS scores,
    // we remove from rank 0 up to (total_elements - MAX_RECENT_PROMPTS - 1).

    await pipeline.exec();

    const newPrompt: RecentPrompt = { id: trimmedText, text: trimmedText };
    return NextResponse.json(newPrompt, { status: 201 });

  } catch (error: any) {
    console.error('Error adding recent prompt:', error);
    // Check for specific Redis errors if necessary
    return NextResponse.json({ error: 'Failed to add recent prompt', details: error.message }, { status: 500 });
  }
}