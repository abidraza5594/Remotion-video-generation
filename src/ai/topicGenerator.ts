import { callMistral, extractJSON } from './mistralClient';
import type { TopicSuggestion } from '../types';

export async function generateTopicSuggestions(): Promise<TopicSuggestion[]> {
  const raw = await callMistral(
    [
      {
        role: 'system',
        content:
          'You are a developer-content strategist. You return JSON only — no explanation, no markdown.',
      },
      {
        role: 'user',
        content: `Suggest 5 trending developer tutorial topics right now.
Focus on: React, Angular, AI tools, TypeScript, DevOps, Next.js, modern frontend.
Return JSON only with this exact shape:
{
  "topics": [
    {
      "title": "string (concrete, specific topic)",
      "hook": "string (one-line hook that grabs attention)",
      "difficulty": "beginner|intermediate|advanced",
      "estimatedDuration": number (seconds, between 60 and 1500),
      "whyTrending": "string (one sentence explaining current relevance)"
    }
  ]
}
Rules: exactly 5 topics, mix of difficulty levels, no markdown, no commentary.`,
      },
    ],
    { temperature: 0.85, jsonMode: true, maxTokens: 2000 },
  );

  const parsed = extractJSON<{ topics: TopicSuggestion[] } | TopicSuggestion[]>(raw);
  const topics: TopicSuggestion[] = Array.isArray(parsed) ? parsed : parsed.topics;

  if (!topics || topics.length === 0) throw new Error('Mistral returned no topics.');

  return topics.slice(0, 5).map((t) => ({
    title: t.title,
    hook: t.hook,
    difficulty: t.difficulty,
    estimatedDuration: Math.max(30, Math.min(1800, Math.round(t.estimatedDuration || 180))),
    whyTrending: t.whyTrending,
  }));
}
