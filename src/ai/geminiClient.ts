import axios from 'axios';

const ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface GeminiCallOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  model?: string;
}

export function geminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export async function callGemini(
  systemInstruction: string,
  userPrompt: string,
  options: GeminiCallOptions = {},
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in .env');

  const model = options.model || process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const url = `${ENDPOINT_BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const generationConfig: Record<string, unknown> = {
    temperature: options.temperature ?? 0.7,
    maxOutputTokens: options.maxTokens ?? 4000,
  };
  if (options.jsonMode) generationConfig.responseMimeType = 'application/json';

  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig,
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const maxAttempts = 4;
  let lastError: GeminiError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res;
    try {
      res = await axios.post(url, body, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 180000,
      });
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;
      const apiMsg = data?.error?.message || err.message;
      lastError = new GeminiError(`Gemini API error (${status || 'network'}): ${apiMsg}`, status, data);

      if (isTransient(status) && attempt < maxAttempts) {
        const wait = backoffMs(attempt, data);
        console.log(`  Gemini busy (${status}) — retry ${attempt}/${maxAttempts - 1} in ${(wait / 1000).toFixed(1)}s…`);
        await sleep(wait);
        continue;
      }
      throw lastError;
    }

    const candidate = res.data?.candidates?.[0];
    if (!candidate) {
      throw new GeminiError('Gemini returned no candidates.', res.status, res.data);
    }
    if (candidate.finishReason && candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS') {
      throw new GeminiError(`Gemini stopped: ${candidate.finishReason}`, res.status, res.data);
    }

    const parts = candidate.content?.parts || [];
    const text = parts.map((p: any) => p.text || '').join('').trim();
    if (!text) throw new GeminiError('Gemini returned empty content.', res.status, res.data);
    return text;
  }

  throw lastError || new GeminiError('Gemini retries exhausted.');
}

function isTransient(status: number | undefined): boolean {
  if (!status) return true;
  if (status === 429) return true;
  if (status >= 500 && status <= 599) return true;
  return false;
}

function backoffMs(attempt: number, errorData: any): number {
  const retryInfo = errorData?.error?.details?.find?.(
    (d: any) => d['@type']?.includes('RetryInfo'),
  );
  if (retryInfo?.retryDelay) {
    const delaySec = parseFloat(String(retryInfo.retryDelay).replace('s', ''));
    if (!isNaN(delaySec) && delaySec > 0) return Math.min(delaySec * 1000, 30000);
  }
  const base = Math.min(2000 * 2 ** (attempt - 1), 16000);
  return base + Math.floor(Math.random() * 1000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class GeminiError extends Error {
  status?: number;
  data?: unknown;
  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = 'GeminiError';
    this.status = status;
    this.data = data;
  }

  shouldFallback(): boolean {
    if (!this.status) return true;
    if ([401, 402, 403, 404, 429].includes(this.status)) return true;
    if (this.status >= 500) return true;
    return false;
  }
}
