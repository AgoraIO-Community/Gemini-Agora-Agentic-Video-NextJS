import { GoogleGenAI } from '@google/genai';

export function getGeminiClient() {
  const apiKey = process.env.NEXT_GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('Missing required environment variable: NEXT_GOOGLE_API_KEY');
  }

  return new GoogleGenAI({ apiKey });
}
