import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { PATHS } from '../utils/fileManager';
import type {
  AuthStore,
  Platform,
  YouTubeAccount,
  InstagramAccount,
  LinkedInAccount,
} from '../types';

const ALGO = 'aes-256-cbc';

function getMachineKey(): Buffer {
  const machineId = `${os.hostname()}::${os.userInfo().username}::cinematic-ai-studio`;
  return crypto.scryptSync(machineId, 'cinematic-studio-salt-v1', 32);
}

interface EncryptedPayload {
  iv: string;
  data: string;
  version: 1;
}

function encrypt(plain: string): EncryptedPayload {
  const key = getMachineKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return { iv: iv.toString('hex'), data: encrypted.toString('hex'), version: 1 };
}

function decrypt(payload: EncryptedPayload): string {
  const key = getMachineKey();
  const iv = Buffer.from(payload.iv, 'hex');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.data, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function readStore(): AuthStore {
  if (!fs.existsSync(PATHS.authFile)) return {};
  try {
    const raw = fs.readFileSync(PATHS.authFile, 'utf-8').trim();
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === 1 && typeof parsed.iv === 'string' && typeof parsed.data === 'string') {
      const decrypted = decrypt(parsed as EncryptedPayload);
      return JSON.parse(decrypted) as AuthStore;
    }
    return parsed as AuthStore;
  } catch (err) {
    console.warn('Could not read .auth.json. Treating as empty.');
    return {};
  }
}

export function writeStore(store: AuthStore): void {
  const json = JSON.stringify(store);
  const encrypted = encrypt(json);
  fs.writeFileSync(PATHS.authFile, JSON.stringify(encrypted, null, 2), { mode: 0o600 });
}

export function getActiveAccount<T extends Platform>(
  platform: T,
): T extends 'youtube' ? YouTubeAccount | null
  : T extends 'instagram' ? InstagramAccount | null
  : LinkedInAccount | null {
  const store = readStore();
  const list = (store[platform] || []) as Array<YouTubeAccount | InstagramAccount | LinkedInAccount>;
  if (!list.length) return null as any;
  const active = list.find((a) => a.is_active) || list[0];
  return active as any;
}

export function setActiveAccount(platform: Platform, identifier: string): void {
  const store = readStore();
  const list = (store[platform] || []) as Array<YouTubeAccount | InstagramAccount | LinkedInAccount>;
  for (const a of list) {
    a.is_active = matchesIdentifier(platform, a, identifier);
  }
  store[platform] = list as any;
  writeStore(store);
}

function matchesIdentifier(
  platform: Platform,
  account: YouTubeAccount | InstagramAccount | LinkedInAccount,
  identifier: string,
): boolean {
  if (platform === 'youtube') {
    const yt = account as YouTubeAccount;
    return yt.channel_id === identifier || yt.channel_name === identifier;
  }
  if (platform === 'instagram') {
    const ig = account as InstagramAccount;
    return ig.ig_user_id === identifier || ig.username === identifier;
  }
  const li = account as LinkedInAccount;
  return li.person_id === identifier || li.display_name === identifier;
}

export function saveAccount(platform: 'youtube', acc: YouTubeAccount): void;
export function saveAccount(platform: 'instagram', acc: InstagramAccount): void;
export function saveAccount(platform: 'linkedin', acc: LinkedInAccount): void;
export function saveAccount(platform: Platform, acc: YouTubeAccount | InstagramAccount | LinkedInAccount): void {
  const store = readStore();
  const list = (store[platform] || []) as Array<YouTubeAccount | InstagramAccount | LinkedInAccount>;

  const idKey =
    platform === 'youtube' ? (a: any) => a.channel_id :
    platform === 'instagram' ? (a: any) => a.ig_user_id :
    (a: any) => a.person_id;

  const newId = idKey(acc);
  const filtered = list.filter((a) => idKey(a) !== newId);

  for (const a of filtered) a.is_active = false;
  acc.is_active = true;

  filtered.push(acc);
  store[platform] = filtered as any;
  writeStore(store);
}

export function removeAccount(platform: Platform, identifier?: string): boolean {
  const store = readStore();
  const list = (store[platform] || []) as Array<YouTubeAccount | InstagramAccount | LinkedInAccount>;
  if (!list.length) return false;

  if (!identifier) {
    delete store[platform];
    writeStore(store);
    return true;
  }

  const filtered = list.filter((a) => !matchesIdentifier(platform, a, identifier));
  if (filtered.length === list.length) return false;

  if (filtered.length && !filtered.some((a) => a.is_active)) {
    filtered[0].is_active = true;
  }

  if (filtered.length === 0) {
    delete store[platform];
  } else {
    store[platform] = filtered as any;
  }
  writeStore(store);
  return true;
}

export function listAccounts(platform: Platform): Array<YouTubeAccount | InstagramAccount | LinkedInAccount> {
  const store = readStore();
  return (store[platform] || []) as Array<YouTubeAccount | InstagramAccount | LinkedInAccount>;
}
