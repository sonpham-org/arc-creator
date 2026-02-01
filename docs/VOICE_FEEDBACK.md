# Voice Feedback - Implementation Plan

## Goal

Let users give voice feedback on puzzles instead of (or in addition to) typing. Must be cost-effective on Railway.

## Architecture: Client-First, Server-Fallback

```
Browser
  |
  |--> [Web Speech API] -- FREE, covers ~90% of users (Chrome, Edge, Safari)
  |       |
  |       +--> Success: send transcript text to server (no audio leaves client)
  |       +--> Fail (Firefox/unsupported):
  |               |
  |               +--> Record audio blob client-side (WebM/Opus, max 60s)
  |               +--> POST to /api/transcribe
  |                       |
  |                       +--> Proxy to Deepgram API ($200 free credit on signup)
  |                       +--> Return transcript text
  |
  +--> Transcript populates the feedback textarea
```

**Key principle**: Railway server never does transcription compute. It either receives text directly (Web Speech API path) or acts as a thin proxy to an external STT API.

## Phase 1: Web Speech API Only ($0/month)

Use the browser-native `SpeechRecognition` API. Zero server cost.

**Browser support**:
- Chrome/Edge: Full support via `webkitSpeechRecognition`
- Safari (macOS/iOS): Supported since 14.1
- Firefox: Not supported (show "Voice not supported" message)

**Implementation**:
1. Add a microphone button next to the feedback textarea on the puzzle detail page
2. On click, start `SpeechRecognition` with `continuous: true` and `interimResults: true`
3. Stream interim results into the textarea in real-time
4. On stop, finalize transcript and let user edit before submitting
5. No changes to backend needed - transcript is just text feedback

**UI considerations**:
- Microphone icon button with recording indicator (pulsing red dot)
- Show interim/partial text in grey, finalized text in black
- "Voice not supported in this browser" tooltip on Firefox

## Phase 2: Deepgram Fallback for Firefox ($0 with free credits)

For browsers without Web Speech API support.

**Why Deepgram**: $200 free credit on signup, no expiry. At $0.0043/min, that's ~46,500 minutes of audio. For 30-second feedback clips, that's ~93,000 transcriptions before paying anything.

**Implementation**:
1. Add `/api/transcribe` route (thin proxy to Deepgram)
2. Client records audio via `MediaRecorder` API (WebM/Opus, capped at 60 seconds)
3. Send compressed blob to server (~30-50KB for 30s clip)
4. Server forwards to Deepgram, returns transcript
5. Server does NOT store audio - transcribe and discard

**Cost controls**:
- Hard 60-second recording limit on client
- Rate limit the `/api/transcribe` endpoint (e.g., 5 requests/min per IP)
- Environment variable to disable server-side transcription if credits run out

## Phase 3: Audio Storage (Optional, only if needed)

If you later want users to replay voice feedback:
- Use Cloudflare R2 (10GB free, no egress fees)
- At ~40KB per clip, that's ~250,000 clips before paying
- Add `voice_transcript` and `audio_url` columns to feedback table

## STT Provider Pricing Comparison

| Provider | Per Minute | Free Tier | Notes |
|---|---|---|---|
| Web Speech API | $0.000 | Unlimited | Browser-native, primary approach |
| Deepgram | $0.0043 | $200 credit | Best server-side value |
| OpenAI Whisper API | $0.006 | None | High accuracy alternative |
| Google Cloud STT | $0.024 | 60 min/month | Expensive beyond free tier |
| Self-hosted Whisper | Railway CPU bill | N/A | DO NOT USE - no GPU on Railway, 10-30x slower than real-time |

## What NOT To Do

- **Do not self-host Whisper on Railway**. No GPU available, so a 30-second clip takes 5-15 minutes on CPU. The Railway compute cost exceeds the Deepgram API cost.
- **Do not store audio blobs unless you have a specific need**. Transcribe and discard.
- **Do not use Google Cloud STT** unless you're under 60 min/month. It's 5.5x more expensive than Deepgram.

## Database Changes

```sql
-- Only needed: store the transcript as text alongside existing feedback
ALTER TABLE "Generation" ADD COLUMN "voiceTranscript" TEXT;
```

No audio storage, no blob columns, no file system changes.

## Files to Modify

1. `src/app/puzzle/[id]/page.tsx` - Add microphone button to feedback section
2. `src/components/VoiceFeedbackButton.tsx` - New component (Web Speech API + fallback logic)
3. `src/app/api/transcribe/route.ts` - New API route (Phase 2 only, thin Deepgram proxy)
4. `prisma/schema.prisma` - Add `voiceTranscript` field to Generation model

## Estimated Railway Cost Impact

- **Phase 1**: $0 additional cost
- **Phase 2**: ~$0.01/month additional (proxy requests are negligible CPU)
- **Phase 3**: $0 if using Cloudflare R2 free tier
