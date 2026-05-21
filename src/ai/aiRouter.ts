import { callMistral, extractJSON, MistralMessage } from './mistralClient';
import { callGemini, geminiConfigured, GeminiError } from './geminiClient';
import { logger } from '../utils/logger';

export interface AICallOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export type ProviderUsed = 'gemini' | 'mistral';

export interface AICallResult {
  text: string;
  provider: ProviderUsed;
}

export async function callAI(opts: AICallOptions): Promise<AICallResult> {
  if (geminiConfigured()) {
    try {
      const text = await callGemini(opts.systemPrompt, opts.userPrompt, {
        temperature: opts.temperature,
        maxTokens: opts.maxTokens,
        jsonMode: opts.jsonMode,
      });
      return { text, provider: 'gemini' };
    } catch (err: any) {
      const shouldFallback = !(err instanceof GeminiError) || err.shouldFallback();
      if (shouldFallback) {
        const reason = err?.message || String(err);
        logger.warn(`Gemini failed — falling back to Mistral. (${truncate(reason, 180)})`);
      } else {
        throw err;
      }
    }
  }

  const messages: MistralMessage[] = [];
  if (opts.systemPrompt) messages.push({ role: 'system', content: opts.systemPrompt });
  messages.push({ role: 'user', content: opts.userPrompt });

  const text = await callMistral(messages, {
    temperature: opts.temperature,
    maxTokens: opts.maxTokens,
    jsonMode: opts.jsonMode,
  });
  return { text, provider: 'mistral' };
}

export async function callAIForJSON<T>(opts: AICallOptions): Promise<{ data: T; provider: ProviderUsed }> {
  const { text, provider } = await callAI({ ...opts, jsonMode: true });
  try {
    const data = extractJSON<T>(text);
    return { data, provider };
  } catch (err: any) {
    throw new Error(`Failed to parse JSON from ${provider}: ${err.message}`);
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}
