# Cinematic AI Video Studio

Fully automated cinematic AI tutorial video generation with social media auto-posting.

One command (`npm run generate-video`) takes you from idea to a published YouTube + Instagram + LinkedIn post.

---

## Features

- **Single entry point** — interactive CLI that runs the entire pipeline.
- **AI topic discovery + storyboard** via Mistral AI.
- **Free voice narration** via Microsoft Edge TTS.
- **Cinematic Remotion scenes** with spring-driven cursor, animated code typing, TikTok-style captions, smooth transitions.
- **Two formats** — vertical Shorts/Reels (1080×1920) or horizontal long-form tutorials (1920×1080).
- **FFmpeg export** with audio merge + thumbnail extraction.
- **OAuth-based auto-publishing** to YouTube, Instagram Reels, and LinkedIn — encrypted token storage, automatic refresh.

---

## Prerequisites

- **Node.js 18+** (20 LTS recommended)
- **Python 3.9+** and [`edge-tts`](https://pypi.org/project/edge-tts/) installed in PATH:
  ```bash
  pip install edge-tts
  edge-tts --list-voices    # sanity check
  ```
- **FFmpeg** — `ffmpeg-static` is bundled, but a system-wide install is also fine. `ffprobe` is required for audio duration extraction (ships with most ffmpeg builds).
- **ngrok** — auto-bundled via `@ngrok/ngrok`. For higher rate limits, add a free `NGROK_AUTHTOKEN` to `.env`.

---

## Installation

```bash
npm install
cp .env.example .env
# edit .env with your API keys (see below)
```

---

## Environment Variables (.env)

```
MISTRAL_API_KEY=...
MISTRAL_MODEL=mistral-large-latest

YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...

META_APP_ID=...
META_APP_SECRET=...

LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...

NGROK_AUTHTOKEN=   # optional but recommended for Instagram uploads
```

`.env` and `.auth.json` are both gitignored. Tokens in `.auth.json` are AES-256 encrypted with a machine-specific key.

---

## OAuth App Setup

### YouTube (Google Cloud)

1. Open https://console.cloud.google.com/ → create a project.
2. **APIs & Services → Library** → enable **YouTube Data API v3**.
3. **APIs & Services → Credentials** → **Create OAuth client ID** → Application type: **Desktop / Web**. Use **Web** so you can set a redirect URI.
4. Authorized redirect URI:
   ```
   http://localhost:3456/auth/youtube/callback
   ```
5. **OAuth consent screen** → set User Type to **External**, add yourself as a test user.
6. Required scopes:
   - `https://www.googleapis.com/auth/youtube.upload`
   - `https://www.googleapis.com/auth/youtube`
   - `https://www.googleapis.com/auth/youtube.readonly`
7. Copy **Client ID** and **Client Secret** into `.env`.

### Instagram (Meta Developer)

1. Open https://developers.facebook.com/ → **My Apps** → **Create App** → **Business**.
2. Add the **Facebook Login** + **Instagram Graph API** products.
3. **Facebook Login → Settings** → add valid OAuth redirect URI:
   ```
   http://localhost:3456/auth/instagram/callback
   ```
4. Required scopes: `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`, `pages_show_list`, `business_management`.
5. Link your Instagram **Professional** account to a Facebook **Page** (Meta requires this — personal accounts cannot publish via API).
6. Copy **App ID** and **App Secret** into `.env`.
7. In dev mode, add yourself as a test user under **Roles → Test Users**.

### LinkedIn (LinkedIn Developer)

1. Open https://www.linkedin.com/developers/ → **Create App** linked to a company page.
2. Add the **Sign In with LinkedIn using OpenID Connect** + **Share on LinkedIn** + **Marketing Developer Platform** products (Marketing access requires approval — but `w_member_social` is granted out-of-the-box with Share).
3. **Auth → Redirect URLs**:
   ```
   http://localhost:3456/auth/linkedin/callback
   ```
4. Required scopes: `openid`, `profile`, `email`, `w_member_social`.
5. Copy **Client ID** and **Client Secret** into `.env`.

---

## Usage

```bash
npm run generate-video
```

The CLI walks you through:

1. **Auth check** — displays status table of all 3 platforms, lets you connect missing accounts.
2. **Topic** — AI picks 5 trending dev topics, or you type your own.
3. **Format** — Shorts (9:16) or Long form (16:9).
4. **Pipeline** — storyboard generation → narration → audio merge → Remotion render → FFmpeg export.
5. **Posting** — select platforms; AI generates SEO-tuned copy per platform; uploads.

### Individual Commands

```bash
npm run auth:youtube       # connect/reconnect YouTube
npm run auth:instagram     # connect/reconnect Instagram
npm run auth:linkedin      # connect/reconnect LinkedIn
npm run auth:status        # show connection table
npm run auth:logout        # disconnect one or all accounts
npm run auth:switch        # switch active account (multi-account)
npm run render:preview     # open Remotion Studio for live tweaking
npm run clean              # wipe temp/ and output/
```

---

## How It Works

```
       npm run generate-video
                │
        [ Auth status check ]
                │
        [ Topic + format ]
                │
   ┌────────────┴────────────┐
   │   Mistral AI generates   │
   │  storyboard JSON         │
   └────────────┬────────────┘
                │
        [ Edge TTS per scene ]
                │
  durations measured by ffprobe
                │
   [ scene durations recalculated ]
                │
   storyboard.json + timing.json
        written to disk
                │
        [ Remotion render ]
                │
   [ FFmpeg merge audio + video ]
                │
   thumbnail extracted from frame 0
                │
        output/final_<stamp>.mp4
                │
       [ Mistral SEO per platform ]
                │
  YouTube / Instagram / LinkedIn upload
```

### Format rules

| | Shorts | Long form |
|---|---|---|
| Canvas | 1080×1920 | 1920×1080 |
| Duration | 15–90 s | 5–30 min |
| Cursor speed | Fast, energetic | Slow, deliberate |
| Transitions | zoom-punch + cross-dissolve | cross-dissolve |
| Captions | Always on (TikTok-style) | Optional |
| Code typing | 40 chars/sec | 22 chars/sec |

### Cursor animation

`CursorOverlay` reads `cursorKeyframes` from `timing.json` and interpolates between waypoints with a spring — never linear. Click frames trigger a scale-down/scale-back pulse plus an expanding ripple ring; `highlight` events draw a glowing accent rectangle at the target.

### Code scene

`AnimatedCode` typewrites the snippet character-by-character at the configured rate, with full Prism syntax highlighting and a glowing line-highlight bar that springs to the active line.

---

## Project Layout

```
src/
├── cli/                CLI + orchestrator
├── auth/               OAuth + encrypted token storage
├── ai/                 Mistral integration
├── tts/                Edge TTS + audio duration + merger
├── remotion/
│   ├── compositions/   Main composition
│   ├── scenes/         Hook, Code, Explanation, Summary, Outro, Router
│   ├── components/     CursorOverlay, AnimatedCode, CaptionBar, Transition, Background
│   ├── design/         tokens + animations
│   └── generated/      auto-written storyboard.json + timing.json
├── export/             FFmpeg pipeline + timing builder
├── social/             YouTube, Instagram, LinkedIn uploaders
├── utils/              logger, configManager, fileManager, browserOpener
└── types.ts            shared types
```

---

## Troubleshooting

**`edge-tts CLI not found`** — install with `pip install edge-tts` and ensure it's in your PATH.

**`ffprobe spawn failed`** — install FFmpeg system-wide (`brew install ffmpeg`, `choco install ffmpeg`, or `apt install ffmpeg`).

**YouTube `403 quotaExceeded`** — daily YouTube API quota is 10,000 units. One upload costs ~1,600. Request a higher quota in Google Cloud Console.

**Instagram `(#9004) videos must be at least 3 seconds`** — ensure your storyboard produces ≥3s of content.

**LinkedIn `Unprocessable Entity`** — your app may not have `w_member_social` enabled. Re-check the Auth tab in the LinkedIn Developer Portal.

**ngrok session-limit reached** — add a free auth token: https://dashboard.ngrok.com/, then set `NGROK_AUTHTOKEN=...` in `.env`.

---

## Security Notes

- `.auth.json` is encrypted with AES-256-CBC. The key is derived from your hostname + username, so the file is not portable between machines.
- Tokens are never logged to the terminal — only platform names, account display names, and expiry dates.
- All OAuth flows use a local `http://localhost:3456/...` redirect; the callback server starts only when needed and closes immediately after.

---

## License

MIT — build, ship, remix.
