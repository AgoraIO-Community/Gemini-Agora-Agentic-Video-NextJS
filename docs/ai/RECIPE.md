# Agora + Gemini Agentic Video Voice Assistant Recipe

## Problem

Hackathon teams often want an AI assistant that can understand a video and then discuss it naturally. Building that from scratch usually means solving unrelated infrastructure first: realtime audio, speech recognition, agent lifecycle, TTS playback, video upload, model prompting, and timestamp grounding.

This starter packages those foundations while leaving the product idea open.

## Architecture

```text
Upload / Record Video
        |
Gemini Files API
        |
Gemini 3.7 Flash Agentic Video Understanding
        |
Structured JSON: summary, moments, context
        |
Agora Conversational AI agent instructions
        |
Voice conversation over Agora RTC + RTM
```

The key split is intentional:

- Agora provides realtime conversation and communication.
- Gemini provides video understanding and reasoning.

This is not a live continuous Gemini video-streaming architecture. The starter analyzes uploaded or recorded clips, then lets the user talk about the resulting structured context.

## Agora Responsibilities

Agora owns the realtime voice experience:

- RTC channel connection
- RTM transcript/state/metrics events
- token generation
- Conversational AI agent invitation
- agent lifecycle and stop flow
- microphone publishing
- agent audio playback
- managed MiniMax TTS

The existing voice pipeline remains:

```text
Microphone -> Gemini STT -> Gemini LLM -> MiniMax TTS -> Agora RTC -> Browser
```

## Gemini Responsibilities

Gemini owns analysis and reasoning:

- Files API upload for reusable video input
- Gemini 3.7 Flash Interactions API
- `processing=agentic` video understanding
- structured summary and timeline generation
- Gemini STT and Gemini LLM in the existing Agora voice pipeline

## Agentic Video Workflow

The browser sends a selected MP4/WebM clip to `app/api/video/analyze/route.ts`.

The route:

1. validates MIME type and size
2. uploads the file to Gemini
3. polls for `PROCESSING`, `ACTIVE`, or `FAILED`
4. stops polling after a bounded timeout
5. asks Gemini 3.7 Flash to analyze the video with agentic processing
6. parses and validates the returned JSON with Zod
7. returns structured context to the browser

The reusable prompt lives in `lib/gemini/video-analysis-prompt.ts`.

## Video -> Context -> Conversation

After analysis, the frontend passes the validated video context into `/api/invite-agent` when starting the Agora Conversational AI session.

The invite route appends instructions telling the LLM:

- it is discussing a previously analyzed video
- the provided video context is the primary source
- timestamps should be mentioned when useful
- unknown details should not be invented
- responses should stay concise for voice

This keeps the Agora architecture intact while grounding the voice agent in Gemini's video analysis.

## Timestamp Grounding

Important Moment cards call `video.currentTime = timestampSeconds`, making timeline navigation reliable for the MVP.

The live transcript also detects common timestamp shapes such as `00:14` and makes them clickable when the agent says them.

## Extension Ideas

Teams can replace the generic prompt with domain-specific analysis:

- sports coach: form, repetitions, fatigue, positioning
- classroom assistant: concepts, examples, confusing transitions
- repair assistant: visible defects, state changes, unsafe steps
- interview coach: clarity, confidence, pacing, missed signals
- gaming coach: decisions, mistakes, timing, turning points
- cooking assistant: technique, sequence, texture and doneness cues
- accessibility assistant: factual scene narration and key changes

Keep the starter focused. Add product-specific depth in the prompt and UI copy before adding databases, auth, storage, dashboards, or RAG infrastructure.
