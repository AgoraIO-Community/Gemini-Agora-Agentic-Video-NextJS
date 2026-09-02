# Agora + Gemini Agentic Video Voice Assistant

Build an AI that can watch a video, understand important moments, and talk about it in real time.

```text
Video
  |
Gemini Agentic Video
  |
Structured Video Context
  |
Agora Conversational AI
  |
Voice Conversation
```

This starter is designed for hackathons and developer recipes. It keeps the Agora Conversational AI voice pipeline from the original quickstart, then adds a recorded/uploaded video understanding layer powered by Gemini 3.7 Flash.

## What It Does

1. Upload an MP4/WebM video or record a short browser-camera clip.
2. Analyze the clip with Gemini Agentic Video Understanding.
3. Review a concise summary and timestamped important moments.
4. Start an Agora voice conversation.
5. Ask natural spoken questions about the analyzed video.
6. Jump back to relevant timestamps from moment cards or timestamped transcript text.

The core demo is:

**Watch -> Understand -> Talk**

## Architecture

```text
Recorded/uploaded video
        |
Gemini Files API
        |
Gemini 3.7 Flash with processing=agentic
        |
Validated structured context
        |
Agora Conversational AI invite
        |
Microphone -> Gemini STT -> Gemini LLM -> MiniMax TTS -> Agora RTC audio
```

This starter does not stream live Agora video directly into Gemini. The MVP architecture is:

```text
Agora real-time conversation
+
recorded/uploaded video
+
Gemini Agentic Video analysis
```

## Agora Provides

- real-time voice communication
- RTC
- RTM
- Conversational AI agent lifecycle
- low-latency audio interaction
- live transcript, agent state, and latency metrics
- managed MiniMax TTS

## Gemini Provides

- video understanding
- agentic timeline exploration
- reasoning
- Gemini STT
- Gemini LLM

## Build Something With It

This starter intentionally handles the infrastructure while leaving the product idea open.

Try turning it into:

**Sports**  
"Where did my form break?"

**Education**  
"Where did the professor explain transformers?"

**Repair**  
"When did the machine start behaving incorrectly?"

**Interviews**  
"Where did my answer become unclear?"

**Gaming**  
"What mistake caused me to lose this fight?"

**Cooking**  
"When did the technique change?"

Replace the generic analysis prompt in `lib/gemini/video-analysis-prompt.ts` with domain-specific instructions for your hackathon idea.

## Prerequisites

- [Node.js 22 or newer](https://nodejs.org/en/download/)
- [pnpm](https://pnpm.io/installation)
- [Agora CLI](https://github.com/AgoraIO/cli)
- An Agora project with Conversational AI access enabled
- A Google API key with access to Gemini

## Setup

```bash
pnpm install

agora login

agora project use <project>

agora project env write .env.local --with-secrets
```

Then add your Google API key:

```env
NEXT_GOOGLE_API_KEY=...
```

Run the checks and start the app:

```bash
pnpm run doctor
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Configuration is defined in `env.local.example`.

| Variable | Required | Description |
| --- | :---: | --- |
| `NEXT_PUBLIC_AGORA_APP_ID` | Yes | Agora project App ID. |
| `NEXT_AGORA_APP_CERTIFICATE` | Yes | Server-only Agora App Certificate. |
| `NEXT_GOOGLE_API_KEY` | Yes | Server-side Google API key used by Gemini STT, Gemini LLM, and Gemini video understanding. |
| `NEXT_PUBLIC_AGENT_UID` | No | Agent RTC UID. Defaults to `123456`. |
| `NEXT_AGENT_GREETING` | No | Optional opening line for the voice agent. |

Do not expose `NEXT_AGORA_APP_CERTIFICATE` or `NEXT_GOOGLE_API_KEY` to the browser.

## Project Structure

```text
app/api/generate-agora-token/    RTC + RTM token generation
app/api/invite-agent/            Conversational AI agent start route
app/api/stop-conversation/       Agent stop route
app/api/video/analyze/           Gemini video analysis route
components/video/                Upload, recorder, player, and moments UI
components/ConversationComponent Existing Agora voice conversation UI
lib/gemini/                      Gemini client, prompt, schema, and analysis helper
types/                           Shared TypeScript types
docs/ai/RECIPE.md                Architecture recipe
```

## Commands

```bash
pnpm install       # Install dependencies
pnpm run doctor    # Check prerequisites and environment
pnpm dev           # Run the development server
pnpm run lint      # Check lint rules
pnpm run build     # Create a production build
pnpm run verify    # Run doctor, lint, typecheck, API checks, and build
```

## Security Notes

- Gemini API key stays server-only.
- Agora App Certificate stays server-only.
- Uploaded videos are validated by MIME type and size.
- Videos are not persisted by this starter.
- User filenames are displayed only; they are not used as filesystem paths.
- Full video contents and secrets are not logged.

## Documentation

- [Implementation recipe](docs/ai/RECIPE.md)
- [Architecture guide](docs/ai/L1/02_architecture.md)
- [Contributing guide](CONTRIBUTING.md)

## License

Released under the [MIT License](LICENSE).
