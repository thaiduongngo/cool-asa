import { NextRequest, NextResponse } from 'next/server';
import { redis, RECENT_PROMPTS_KEY } from '@/lib/redis';

// POST /api/prompts/delete - Deletes a specific prompt by its text
export async function POST(req: NextRequest) {
  try {
    await redis.connect().catch(() => { });
    const { text }: { text: string } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Prompt text is required for deletion' }, { status: 400 });
    }

    const result = await redis.zrem(RECENT_PROMPTS_KEY, text);

    if (result > 0) {
      return NextResponse.json({ message: 'Prompt deleted successfully' }, { status: 200 });
    } else {
      return NextResponse.json({ message: 'Prompt not found or already deleted' }, { status: 404 });
    }
  } catch (error: any) {
    console.error('Error deleting recent prompt:', error);
    return NextResponse.json({ error: 'Failed to delete recent prompt', details: error.message }, { status: 500 });
  }
}