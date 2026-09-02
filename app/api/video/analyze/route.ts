import { NextResponse } from 'next/server';
import { analyzeVideoWithGemini } from '@/lib/gemini/video-analysis';
import type { AnalyzeVideoResponse } from '@/types/video-analysis';

export const runtime = 'nodejs';

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const SUPPORTED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);

function normalizeMimeType(type: string) {
  return type.toLowerCase().split(';')[0]?.trim() ?? '';
}

function formatMegabytes(bytes: number) {
  return `${Math.round(bytes / 1024 / 1024)}MB`;
}

function getSafeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes('NEXT_GOOGLE_API_KEY')) {
      return 'Missing Google API key. Set NEXT_GOOGLE_API_KEY in .env.local.';
    }
    if (error.message.includes('timed out')) {
      return 'Gemini took too long preparing the video. Try a shorter clip.';
    }
    if (error.message.includes('failed while preparing')) {
      return 'Gemini could not process this video. Try another MP4 or WebM file.';
    }
    if (error.name === 'ZodError' || error.message.includes('JSON')) {
      return 'Gemini returned a response this starter could not validate. Try analyzing again.';
    }
  }
  return 'Video analysis failed. Try a shorter MP4 or WebM clip.';
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const video = formData.get('video');

    if (!(video instanceof File)) {
      return NextResponse.json(
        { error: 'Upload a video file before analyzing.' },
        { status: 400 },
      );
    }

    const mimeType = normalizeMimeType(video.type);

    if (!SUPPORTED_VIDEO_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: 'Unsupported video type. Upload an MP4 or WebM video.' },
        { status: 400 },
      );
    }

    if (video.size > MAX_VIDEO_BYTES) {
      return NextResponse.json(
        {
          error: `Video is too large. Keep clips under ${formatMegabytes(MAX_VIDEO_BYTES)} for this starter.`,
        },
        { status: 400 },
      );
    }

    const analysis = await analyzeVideoWithGemini({
      video,
      mimeType,
    });

    return NextResponse.json({
      ...analysis,
      file: {
        name: video.name,
        type: mimeType,
        size: video.size,
      },
    } satisfies AnalyzeVideoResponse);
  } catch (error) {
    console.error('Video analysis failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}
