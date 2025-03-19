import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const filename = request.nextUrl.searchParams.get('file');
    if (!filename) {
      return new NextResponse('File parameter is required', { status: 400 });
    }

    // Get the base audio directory
    const audioBaseDir = path.join(process.cwd(), 'public', 'audio');

    // Construct the full file path
    const safePath = path.join(audioBaseDir, filename);

    // Ensure the file path is within the public/audio directory
    if (!safePath.startsWith(audioBaseDir)) {
      return new NextResponse('Invalid file path', { status: 400 });
    }

    try {
      const fileBuffer = await fs.readFile(safePath);
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': fileBuffer.length.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    } catch (error) {
      console.error('Error reading file:', error);
      return new NextResponse('File not found', { status: 404 });
    }
  } catch (error) {
    console.error('Error in audio route:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 