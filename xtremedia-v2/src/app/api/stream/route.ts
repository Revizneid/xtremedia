import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const songId = searchParams.get('id');
  const customUrl = searchParams.get('url');

  let audioUrl = customUrl;

  if (songId) {
    const song = await db.getSongById(songId);
    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }
    audioUrl = song.audioUrl;
  }

  if (!audioUrl) {
    return NextResponse.json({ error: 'No audio source specified' }, { status: 400 });
  }

  const rangeHeader = request.headers.get('range');

  // Case 1: Local File in public or uploads directory
  if (audioUrl.startsWith('/media/') || audioUrl.startsWith('media/') || !audioUrl.startsWith('http')) {
    const relativePath = audioUrl.startsWith('/') ? audioUrl.slice(1) : audioUrl;
    const localFilePath = path.join(process.cwd(), 'public', relativePath);

    if (fs.existsSync(localFilePath)) {
      const stat = fs.statSync(localFilePath);
      const fileSize = stat.size;

      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        const fileStream = fs.createReadStream(localFilePath, { start, end });
        // Convert Node readable stream to web ReadableStream
        const stream = new ReadableStream({
          start(controller) {
            fileStream.on('data', (chunk) => controller.enqueue(chunk));
            fileStream.on('end', () => controller.close());
            fileStream.on('error', (err) => controller.error(err));
          },
        });

        return new Response(stream, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize.toString(),
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }

      const fileStream = fs.createReadStream(localFilePath);
      const stream = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => controller.enqueue(chunk));
          fileStream.on('end', () => controller.close());
          fileStream.on('error', (err) => controller.error(err));
        },
      });

      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Length': fileSize.toString(),
          'Content-Type': 'audio/mpeg',
          'Accept-Ranges': 'bytes',
        },
      });
    }
  }

  // Case 2: Remote Streaming Proxy with Range Support
  try {
    const fetchHeaders: HeadersInit = {};
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const upstreamResponse = await fetch(audioUrl, {
      headers: fetchHeaders,
    });

    const headers = new Headers();
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Content-Type', upstreamResponse.headers.get('content-type') || 'audio/mpeg');
    headers.set('Cache-Control', 'public, max-age=3600');

    if (upstreamResponse.headers.has('content-range')) {
      headers.set('Content-Range', upstreamResponse.headers.get('content-range')!);
    }
    if (upstreamResponse.headers.has('content-length')) {
      headers.set('Content-Length', upstreamResponse.headers.get('content-length')!);
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status === 206 ? 206 : 200,
      headers,
    });
  } catch (err) {
    console.error('Streaming proxy error:', err);
    return NextResponse.json({ error: 'Failed to stream audio' }, { status: 502 });
  }
}
