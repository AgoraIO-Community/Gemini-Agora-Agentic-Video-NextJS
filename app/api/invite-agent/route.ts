import { NextRequest, NextResponse } from 'next/server';
import {
  AgoraClient,
  Agent,
  Area,
  ExpiresIn,
  Gemini,
  GeminiSTT,
  MiniMaxTTS,
} from 'agora-agents';
import { ClientStartRequest, AgentResponse } from '@/types/conversation';
import { DEFAULT_AGENT_UID } from '@/lib/agora';
import { storeAgentSession } from '@/app/api/agent-sessions';
import { videoAnalysisSchema } from '@/lib/gemini/video-analysis-schema';
import type { VideoAnalysis } from '@/types/video-analysis';

// System prompt that defines the agent's personality and behavior.
// Swap this out to change what the agent talks about.
const ADA_PROMPT = `You are **Ada**, an agentic developer advocate from **Agora**. You help developers understand and build with Agora's Conversational AI platform.

# What Agora Actually Is
Agora is a real-time communications company. The product you represent is the **Agora Conversational AI Engine** — it lets developers add voice AI agents to any app by connecting ASR, LLM, and TTS into a real-time pipeline over Agora's SD-RTN (Software Defined Real-Time Network). Key facts:
- The product is called the **Conversational AI Engine** (not "Chorus", not "Harmony", or any other name you might invent)
- It runs a full ASR → LLM → TTS pipeline with sub-500ms latency
- This quickstart uses Gemini for ASR and LLM, with managed MiniMax for TTS
- Agora's SD-RTN is its global real-time network infrastructure — not "SDRTN"
- MCP in this context means **Model Context Protocol** (Anthropic's open standard for connecting AI models to tools/data), not "multi-channel processing"
- Agora does not have a product called Chorus, Harmony, or any similar name — do not invent product names

# Honesty Rule
If you don't know a specific fact about Agora, say so plainly and suggest checking docs.agora.io. Never invent product names, feature names, or capabilities.

# Persona & Tone
- Friendly, technically credible, concise. You're a peer who builds things, not a support agent.
- Plain English. No marketing fluff.

# Core Behavior Guidelines
- **Default to brief**: This is a voice conversation. Keep most replies to 1–2 sentences. Only go longer if the user explicitly asks for detail or the answer genuinely requires it.
- **Never list or enumerate**: No bullet points, no numbered steps. Say the single most important thing.
- **Clarify before answering**: For anything complex, ask one focused question first.
- **Ask at most one question per turn**: Never stack questions.
- **Guide, don't lecture**: Unlock the next step, not everything at once.`;

// First thing the agent says when a user joins the channel.
// Set NEXT_AGENT_GREETING in .env.local to override.
const GREETING =
  process.env.NEXT_AGENT_GREETING ??
  `Hi there! I understand the video now. Ask me what happened, and I can point you to the key moments.`;

// agentUid identifies the AI in the RTC channel — must match NEXT_PUBLIC_AGENT_UID on the client
const agentUid = process.env.NEXT_PUBLIC_AGENT_UID ?? String(DEFAULT_AGENT_UID);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function formatVideoContext(videoAnalysis: VideoAnalysis): string {
  const moments = videoAnalysis.moments
    .map(
      (moment) =>
        `${moment.timestampLabel} (${Math.round(moment.timestampSeconds)}s) - ${moment.title}: ${moment.description}`,
    )
    .join('\n');

  return [
    'You are a conversational AI assistant discussing a previously uploaded or recorded video with the user.',
    '',
    'You have been provided verified Gemini analysis of that video. Use this video context as your primary source when answering questions about the video.',
    'If the user asks where something happened, mention the relevant timestamp. If the answer cannot be determined from the provided video context, say so instead of inventing information.',
    'Do not pretend you are continuously watching a live video stream. You are discussing the previously analyzed clip.',
    'Keep spoken answers concise and conversational.',
    '',
    'VIDEO CONTEXT:',
    `Summary: ${videoAnalysis.summary}`,
    '',
    'Important moments:',
    moments,
    '',
    `Detailed context: ${videoAnalysis.context}`,
  ].join('\n');
}

export async function POST(request: NextRequest) {
  try {
    // --- 1. Parse request ---

    const body: ClientStartRequest = await request.json();
    const { requester_id, channel_name } = body;

    // Validate required env vars on first request so misconfiguration surfaces
    // with a clear error message rather than a silent failure.
    const appId = requireEnv('NEXT_PUBLIC_AGORA_APP_ID');
    const appCertificate = requireEnv('NEXT_AGORA_APP_CERTIFICATE');

    if (!channel_name || !requester_id) {
      return NextResponse.json(
        { error: 'channel_name and requester_id are required' },
        { status: 400 },
      );
    }

    const videoAnalysis = body.video_analysis
      ? videoAnalysisSchema.parse(body.video_analysis)
      : null;
    const agentInstructions = videoAnalysis
      ? `${ADA_PROMPT}\n\n${formatVideoContext(videoAnalysis)}`
      : ADA_PROMPT;

    const geminiSttApiKey = requireEnv('NEXT_GOOGLE_API_KEY');

    // --- 2. Build and start the agent ---

    const client = new AgoraClient({
      area: Area.US,
      appId,
      appCertificate,
    });

    // Pipeline under test: GeminiSTT → Gemini → Agora-managed MiniMax TTS.
    const agent = new Agent({
      client,
      instructions: agentInstructions,
      greeting: GREETING,
      failureMessage: 'Please wait a moment.',
      turnDetection: {
        language: 'en-US',
        config: {
          speech_threshold: 0.5,
          start_of_speech: {
            mode: 'vad',
            vad_config: {
              interrupt_duration_ms: 160, // ms of speech before interruption triggers
              prefix_padding_ms: 300, // audio captured before speech is detected
            },
          },
          end_of_speech: {
            mode: 'vad',
            vad_config: {
              silence_duration_ms: 480,
            },
          },
        },
      },
      advancedFeatures: { enable_rtm: true, enable_tools: true },
      parameters: {
        audio_scenario: 'chorus',
        data_channel: 'rtm',
        enable_error_message: true,
        enable_metrics: true,
      },
    })
      .withStt(
        new GeminiSTT({
          apiKey: geminiSttApiKey,
          languageCodes: ['en-US'],
          customVocabulary: ['Agora', 'Gemini'],
          wordTimestamp: false,
        }),
      )
      .withLlm(
        new Gemini({
          apiKey: geminiSttApiKey,
          model: 'gemini-3.6-flash',
          systemMessages: [{ parts: [{ text: agentInstructions }], role: 'user' }],
          greetingMessage: GREETING,
          failureMessage: 'Please wait a moment.',
          maxHistory: 15,
        }),
      )
      .withTts(
        new MiniMaxTTS({
          model: 'speech_2_6_turbo',
          voiceId: 'English_captivating_female1',
        }),
      );

    const session = agent.createSession({
      channel: channel_name,
      agentUid,
      remoteUids: [requester_id],
      idleTimeout: 30,
      expiresIn: ExpiresIn.hours(1),
      debug: true,
    });

    const agentId = await session.start();
    storeAgentSession(agentId, session);

    return NextResponse.json({
      agent_id: agentId,
      create_ts: Math.floor(Date.now() / 1000),
      state: 'RUNNING',
    } as AgentResponse);
  } catch (error) {
    console.error('Error starting conversation:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to start conversation',
      },
      { status: 500 },
    );
  }
}
