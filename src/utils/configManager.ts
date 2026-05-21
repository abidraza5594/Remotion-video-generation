import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface AppConfig {
  mistralApiKey: string;
  mistralModel: string;
  youtube: { clientId: string; clientSecret: string };
  meta: { appId: string; appSecret: string };
  linkedin: { clientId: string; clientSecret: string };
  ngrokAuthToken?: string;
}

function read(name: string, optional = false): string {
  const v = process.env[name];
  if (!v && !optional) {
    return '';
  }
  return v || '';
}

export function loadConfig(): AppConfig {
  return {
    mistralApiKey: read('MISTRAL_API_KEY'),
    mistralModel: read('MISTRAL_MODEL', true) || 'mistral-large-latest',
    youtube: {
      clientId: read('YOUTUBE_CLIENT_ID', true),
      clientSecret: read('YOUTUBE_CLIENT_SECRET', true),
    },
    meta: {
      appId: read('META_APP_ID', true),
      appSecret: read('META_APP_SECRET', true),
    },
    linkedin: {
      clientId: read('LINKEDIN_CLIENT_ID', true),
      clientSecret: read('LINKEDIN_CLIENT_SECRET', true),
    },
    ngrokAuthToken: read('NGROK_AUTHTOKEN', true) || undefined,
  };
}

export function ensureMistral(): string {
  const key = read('MISTRAL_API_KEY');
  if (!key) {
    throw new Error('MISTRAL_API_KEY not set in .env. Get one at https://console.mistral.ai/');
  }
  return key;
}

export function platformConfigured(platform: 'youtube' | 'instagram' | 'linkedin'): boolean {
  const cfg = loadConfig();
  if (platform === 'youtube') return !!(cfg.youtube.clientId && cfg.youtube.clientSecret);
  if (platform === 'instagram') return !!(cfg.meta.appId && cfg.meta.appSecret);
  if (platform === 'linkedin') return !!(cfg.linkedin.clientId && cfg.linkedin.clientSecret);
  return false;
}

export function envFileExists(): boolean {
  return fs.existsSync(path.resolve(process.cwd(), '.env'));
}

export function hasAnyAIProvider(): boolean {
  return !!(read('GEMINI_API_KEY', true) || read('MISTRAL_API_KEY', true));
}

export function aiProviderSummary(): string {
  const parts: string[] = [];
  if (read('GEMINI_API_KEY', true)) parts.push(`Gemini (${read('GEMINI_MODEL', true) || 'gemini-3.5-flash'})`);
  if (read('MISTRAL_API_KEY', true)) parts.push(`Mistral (${read('MISTRAL_MODEL', true) || 'mistral-large-latest'})`);
  return parts.length ? parts.join(' → fallback → ') : 'none configured';
}
