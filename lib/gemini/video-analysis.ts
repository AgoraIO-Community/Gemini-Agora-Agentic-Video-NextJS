import { VIDEO_ANALYSIS_PROMPT } from './video-analysis-prompt';
import { getGeminiClient } from './client';
import { videoAnalysisSchema } from './video-analysis-schema';
import type { VideoAnalysis } from '@/types/video-analysis';

const GEMINI_VIDEO_MODEL = 'gemini-3.7-flash';
const FILE_READY_TIMEOUT_MS = 90_000;
const FILE_READY_POLL_MS = 2_000;

type GeminiFileState = 'PROCESSING' | 'ACTIVE' | 'FAILED' | string | undefined;

function normalizeFileState(state: unknown): GeminiFileState {
  if (typeof state === 'string') return state;
  if (state && typeof state === 'object' && 'name' in state) {
    const namedState = (state as { name?: unknown }).name;
    return typeof namedState === 'string' ? namedState : undefined;
  }
  return undefined;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced ? fenced[1] : trimmed;
  return JSON.parse(candidate);
}

async function waitForFileReady(
  ai: ReturnType<typeof getGeminiClient>,
  file: Awaited<ReturnType<ReturnType<typeof getGeminiClient>['files']['upload']>>,
) {
  const startedAt = Date.now();
  let current = file;

  while (normalizeFileState(current.state) === 'PROCESSING') {
    if (Date.now() - startedAt > FILE_READY_TIMEOUT_MS) {
      throw new Error('Gemini timed out while preparing the video');
    }

    await new Promise((resolve) => setTimeout(resolve, FILE_READY_POLL_MS));
    if (!current.name) {
      throw new Error('Gemini upload did not return a file name');
    }
    current = await ai.files.get({ name: current.name });
  }

  const state = normalizeFileState(current.state);
  if (state === 'FAILED') {
    throw new Error('Gemini failed while preparing the video');
  }
  if (state !== 'ACTIVE') {
    throw new Error(`Gemini returned an unexpected video state: ${state ?? 'unknown'}`);
  }

  return current;
}

export async function analyzeVideoWithGemini({
  video,
  mimeType,
}: {
  video: File;
  mimeType: string;
}): Promise<VideoAnalysis> {
  const ai = getGeminiClient();

  let uploadedFile = await ai.files.upload({
    file: video,
    config: { mimeType },
  });

  uploadedFile = await waitForFileReady(ai, uploadedFile);

  if (!uploadedFile.uri || !uploadedFile.mimeType) {
    throw new Error('Gemini upload did not return a usable video URI');
  }

  const interaction = await ai.interactions.create({
    model: GEMINI_VIDEO_MODEL,
    input: [
      {
        type: 'video',
        uri: uploadedFile.uri,
        mime_type: uploadedFile.mimeType,
        processing: 'agentic',
      },
      {
        type: 'text',
        text: VIDEO_ANALYSIS_PROMPT,
      },
    ],
  });

  const outputText = interaction.output_text;
  if (!outputText) {
    throw new Error('Gemini returned an empty video analysis');
  }

  const parsed = extractJson(outputText);
  return videoAnalysisSchema.parse(parsed);
}
