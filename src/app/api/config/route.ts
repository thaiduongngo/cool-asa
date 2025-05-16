import { NextRequest, NextResponse } from 'next/server';

const MAX_FILE_SIZE_MB = process.env.MAX_FILE_SIZE_MB ?? 10;
const ALLOWED_FILE_TYPES = process.env.ALLOWED_FILE_TYPES?.replaceAll("'", "").replaceAll(" ", "").split(',');

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json(
      {
        maxFileSizeMB: MAX_FILE_SIZE_MB,
        allowedFileTypes: ALLOWED_FILE_TYPES,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching config:', error);
    return NextResponse.json({ error: 'Failed to fetch config', details: error.message }, { status: 500 });
  }
}