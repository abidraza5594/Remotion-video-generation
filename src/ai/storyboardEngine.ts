import { callAIForJSON } from './aiRouter';
import { logger } from '../utils/logger';
import type { Scene, Storyboard, VideoFormat } from '../types';

export interface StoryboardOptions {
  topic: string;
  format: VideoFormat;
  estimatedDuration: number;
  style?: string;
}

export async function generateStoryboard(opts: StoryboardOptions): Promise<Storyboard> {
  const isShorts = opts.format === 'shorts';
  const duration = isShorts
    ? Math.max(30, Math.min(150, opts.estimatedDuration))
    : Math.max(240, Math.min(1800, opts.estimatedDuration));

  const width = isShorts ? 1080 : 1920;
  const height = isShorts ? 1920 : 1080;

  const sceneRules = isShorts
    ? `- Scene count is DYNAMIC based on topic depth: simple topic = 6-8 scenes, medium = 8-10 scenes, complex/code-heavy topic = 10-14 scenes.
- Hook must land within first 3 seconds.
- Energetic, fast pacing — each scene 6-12 seconds.
- Cover the topic THOROUGHLY: hook → problem → 3+ explanation/code scenes → demo → summary → outro.
- For coding topics, include 3-5 code scenes (different aspects, examples, gotchas).`
    : `- Scene count is DYNAMIC based on topic depth: simple = 8-10 scenes, medium = 10-14 scenes, complex/code-heavy = 14-20 scenes.
- Deep explanations, cinematic pacing — each scene 20-60 seconds.
- For coding topics, include at least 5 code scenes with progressive complexity.
- Structure: hook → motivation → core concepts → multiple code examples → live demo → edge cases → summary → outro.`;

  const prompt = `You are a YouTube tutorial storyboard writer for cinematic developer tutorials.

Topic: ${opts.topic}
Style: ${opts.style || 'tutorial'}
Video format: ${opts.format}
Target duration: ${duration} seconds
Canvas: ${width}x${height}

Generate a complete storyboard as JSON only. No explanation, no markdown.
Use this EXACT schema:
{
  "title": "string",
  "topic": "string",
  "format": "${opts.format}",
  "totalDuration": number (seconds, approximately ${duration}),
  "fps": 30,
  "scenes": [
    {
      "id": "scene_1",
      "type": "hook|intro|problem|explanation|code|demo|summary|outro",
      "startTime": number (seconds, sequential),
      "duration": number (seconds, will be auto-corrected by audio length),
      "narration": "string (what the narrator says — explanation/code scenes: 3-5 full sentences with substantive info. Hook: 2 sentences. Summary: 4-6 short takeaway sentences. Outro: 1-2 sentences. NEVER one phrase.)",
      "visualDescription": "string (INTERNAL notes about the visual — NOT shown to viewer)",
      "codeSnippet": "string or null (only for code scenes — real working code, NOT pseudocode)",
      "language": "string or null (javascript, typescript, python, etc.)",
      "cursorActions": [
        {
          "time": number (seconds from scene start),
          "action": "move|click|highlight|zoom",
          "target": "string (descriptive label)",
          "x": number (0 to ${width}),
          "y": number (0 to ${height}),
          "duration": number (seconds for animation)
        }
      ],
      "animations": [
        {
          "time": number (seconds from scene start),
          "type": "typeCode|highlightLine|zoomIn|zoomOut|fadeIn|slideIn",
          "target": "string",
          "value": "string or null",
          "duration": number
        }
      ],
      "textOverlays": [
        {
          "time": number (seconds from scene start),
          "text": "string (headline: 3-6 words MAX. caption: a substantive bullet point, 6-14 words, no padding. NEVER short keywords.)",
          "style": "headline|caption|code|highlight",
          "position": "top|center|bottom"
        }
      ]
    }
  ]
}

For every explanation/code/demo/problem scene, include:
  - 1 headline overlay (3-6 word title for the scene)
  - 3-5 caption overlays (substantive bullet points the viewer reads — full mini-thoughts, NOT keywords)
For every summary scene: 4-6 caption overlays, each a discrete takeaway.

Rules:
- COVER THE TOPIC THOROUGHLY — do not be brief. Every important aspect of the topic must get a dedicated scene.
- Every scene must have narration synced with cursor actions
- Code scenes MUST include a real, runnable codeSnippet (5-15 lines, proper indentation, real-world example — NOT pseudocode, NOT trivial one-liners)
- For each code scene, the animations array MUST include at least ONE "highlightLine" event with a numeric "value" pointing to the most important line — this drives the visible cursor pointer
- Cursor moves like a real instructor — purposeful, deliberate, every cursorAction with action="highlight" or "click" should land near where the visual interest is
${sceneRules}
- Narration should be conversational and natural — full sentences, no bullet-point speech
- For ${opts.format === 'shorts' ? 'Shorts' : 'long form'}: ${
    isShorts ? 'punchy, high-energy phrases' : 'measured, explanatory tone'
  }
- Each textOverlay headline should be SHORT (3-6 words). Captions can be longer (one full sentence).
- Cursor coordinates must be within ${width}x${height}
- All numeric values must be numbers, not strings
- DO NOT skip the "summary" scene — list 3-5 takeaways
- DO NOT skip the "outro" scene — short, narration drives the CTA
`;

  const { data, provider } = await callAIForJSON<Storyboard>({
    systemPrompt: 'You are an expert tutorial storyboard generator. You output strict JSON only. You cover topics in depth with many scenes.',
    userPrompt: prompt,
    temperature: 0.7,
    maxTokens: 16000,
  });
  logger.info(`Storyboard generated by: ${provider}`);
  return normalizeStoryboard(data, opts);
}

function normalizeStoryboard(sb: Storyboard, opts: StoryboardOptions): Storyboard {
  if (!sb.scenes || sb.scenes.length === 0) {
    throw new Error('Storyboard has no scenes.');
  }

  let cursor = 0;
  const scenes: Scene[] = sb.scenes.map((s, idx) => {
    const duration = Math.max(1, Number(s.duration) || 3);
    const scene: Scene = {
      id: s.id || `scene_${idx + 1}`,
      type: (s.type as Scene['type']) || 'explanation',
      startTime: cursor,
      duration,
      narration: (s.narration || '').trim() || 'Continuing the tutorial.',
      visualDescription: s.visualDescription || '',
      codeSnippet: s.codeSnippet || null,
      language: s.language || null,
      cursorActions: Array.isArray(s.cursorActions) ? s.cursorActions : [],
      animations: Array.isArray(s.animations) ? s.animations : [],
      textOverlays: Array.isArray(s.textOverlays) ? s.textOverlays : [],
    };
    cursor += duration;
    return scene;
  });

  return {
    title: sb.title || opts.topic,
    topic: opts.topic,
    format: opts.format,
    totalDuration: cursor,
    fps: 30,
    scenes,
  };
}

export function recalculateTimings(storyboard: Storyboard): Storyboard {
  let cursor = 0;
  for (const scene of storyboard.scenes) {
    scene.startTime = cursor;
    cursor += scene.duration;
  }
  storyboard.totalDuration = cursor;
  return storyboard;
}
