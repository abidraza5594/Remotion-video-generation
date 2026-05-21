import fs from 'fs';
import path from 'path';
import { Branding, DEFAULT_BRANDING } from './branding';

const CONFIG_PATH = path.resolve(process.cwd(), 'config', 'branding.json');

export function loadBranding(): Branding {
  if (!fs.existsSync(CONFIG_PATH)) return { ...DEFAULT_BRANDING };
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    return {
      channelName: typeof raw.channelName === 'string' ? raw.channelName : DEFAULT_BRANDING.channelName,
      subscribeText: typeof raw.subscribeText === 'string' && raw.subscribeText
        ? raw.subscribeText
        : DEFAULT_BRANDING.subscribeText,
      ctaLine: typeof raw.ctaLine === 'string' ? raw.ctaLine : DEFAULT_BRANDING.ctaLine,
      handles: Array.isArray(raw.handles) ? raw.handles.filter((h: unknown) => typeof h === 'string') : [],
      showSubscribeButton: typeof raw.showSubscribeButton === 'boolean'
        ? raw.showSubscribeButton
        : DEFAULT_BRANDING.showSubscribeButton,
      outroEnabled: typeof raw.outroEnabled === 'boolean'
        ? raw.outroEnabled
        : DEFAULT_BRANDING.outroEnabled,
    };
  } catch (err: any) {
    console.warn(`Could not parse config/branding.json (${err.message}). Using defaults.`);
    return { ...DEFAULT_BRANDING };
  }
}
