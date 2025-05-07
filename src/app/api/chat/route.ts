import { NextRequest, NextResponse } from 'next/server';
import { model } from '@/lib/gemini';
import { Part } from '@google/generative-ai';
import { Prompt } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, history, fileData }: Prompt = body;

    if (!prompt && !fileData) {
      return NextResponse.json({ error: 'Prompt or file is required' }, { status: 400 });
    }

    // --- Prepare content parts ---
    const userParts: Part[] = [];

    // Add file data first if present
    if (fileData) {
      // Validate again on server-side just in case
      if (!fileData.mimeType || !fileData.base64Data) {
        return NextResponse.json({ error: 'Invalid file data received' }, { status: 400 });
      }
      userParts.push({
        inlineData: {
          mimeType: fileData.mimeType,
          data: fileData.base64Data,
        },
      });
    }

    // Add text prompt if present
    if (prompt) {
      userParts.push({ text: prompt });
    }

    // --- Start generation stream ---
    // Combine history with the new user message
    const contents = [...history, { role: 'user' as const, parts: userParts }];

    const stream = await model.generateContentStream({ contents });

    // --- Create a ReadableStream to send back to the client ---
    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of stream.stream) {
            // Ensure chunk has text before encoding/enqueuing
            const text = chunk.text?.(); // Use optional chaining
            if (text) {
              controller.enqueue(encoder.encode(text));
            } else {
              // Log if a chunk doesn't have text, might indicate end or other data
              // console.log("Received chunk without text:", chunk);
            }
          }
        } catch (error) {
          console.error("Error during stream generation:", error);
          const errorMessage = error instanceof Error ? error.message : "Unknown streaming error";
          // Try to enqueue an error message if the stream is still open
          try {
            controller.enqueue(encoder.encode(`\nSTREAM_ERROR: ${errorMessage}`));
          } catch (enqueueError) {
            console.error("Failed to enqueue error message:", enqueueError);
          }
          // Close the stream with an error signal if possible
          controller.error(error); // Signal error to the reader
        } finally {
          // Ensure the stream is closed properly
          try {
            controller.close();
          } catch (closeError) {
            console.error("Error closing stream controller:", closeError);
          }
        }
      },
      cancel(reason) {
        console.log('Stream cancelled:', reason);
        // Add any cleanup logic here if needed when the client cancels
      }
    });

    // --- Return the stream response ---
    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8', // Or application/octet-stream
        'X-Content-Type-Options': 'nosniff', // Prevent MIME sniffing
      },
    });

  } catch (error: any) {
    console.error('API Error:', error);
    // Improved error reporting
    let errorMessage = "Internal Server Error";
    let statusCode = 500;

    if (error.message?.includes('API key not valid')) {
      errorMessage = "Invalid API Key. Please check your GOOGLE_API_KEY.";
      statusCode = 401; // Unauthorized
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}