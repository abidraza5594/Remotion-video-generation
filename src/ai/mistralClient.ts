import axios from 'axios';
import { ensureMistral, loadConfig } from '../utils/configManager';

const ENDPOINT = 'https://api.mistral.ai/v1/chat/completions';

export interface MistralMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface MistralCallOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  model?: string;
}

export async function callMistral(
  messages: MistralMessage[],
  options: MistralCallOptions = {},
): Promise<string> {
  const apiKey = ensureMistral();
  const cfg = loadConfig();
  const body: Record<string, unknown> = {
    model: options.model || cfg.mistralModel,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 4000,
  };
  if (options.jsonMode) body.response_format = { type: 'json_object' };

  const res = await axios.post(ENDPOINT, body, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 120000,
  });

  const content = res.data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Mistral returned no content.');
  return content as string;
}

export function extractJSON<T>(raw: string): T {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();

  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  let start = -1;
  if (firstBrace === -1 && firstBracket === -1) {
    throw new Error('No JSON object/array found in response.');
  } else if (firstBrace === -1) start = firstBracket;
  else if (firstBracket === -1) start = firstBrace;
  else start = Math.min(firstBrace, firstBracket);

  const openChar = text[start];
  const closeChar = openChar === '{' ? '}' : ']';

  let depth = 0;
  let end = -1;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === openChar) depth++;
    else if (c === closeChar) {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) throw new Error('Could not find matching close brace.');

  const slice = text.slice(start, end + 1);
  try {
    return JSON.parse(slice) as T;
  } catch (err: any) {
    throw new Error('Failed to parse JSON: ' + err.message + '\nRaw: ' + slice.slice(0, 500));
  }
}
