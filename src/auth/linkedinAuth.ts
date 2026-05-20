import axios from 'axios';
import crypto from 'crypto';
import { loadConfig } from '../utils/configManager';
import { logger } from '../utils/logger';
import { openInBrowser } from '../utils/browserOpener';
import { startCallbackServer, CALLBACK_BASE } from './callbackServer';
import { saveAccount, getActiveAccount, listAccounts } from './tokenStore';
import type { LinkedInAccount } from '../types';

const REDIRECT_PATH = '/auth/linkedin/callback';
const REDIRECT_URI = `${CALLBACK_BASE}${REDIRECT_PATH}`;
const SCOPES = ['openid', 'profile', 'email', 'w_member_social'];

export async function loginLinkedIn(): Promise<LinkedInAccount> {
  const cfg = loadConfig();
  if (!cfg.linkedin.clientId || !cfg.linkedin.clientSecret) {
    throw new Error('LinkedIn credentials missing. Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in .env');
  }

  const state = crypto.randomBytes(16).toString('hex');
  const authUrl =
    'https://www.linkedin.com/oauth/v2/authorization' +
    `?response_type=code` +
    `&client_id=${encodeURIComponent(cfg.linkedin.clientId)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPES.join(' '))}` +
    `&state=${state}`;

  const server = await startCallbackServer();
  try {
    logger.info('Opening browser for LinkedIn login...');
    logger.info(`If your browser does not open, visit:\n  ${authUrl}`);
    openInBrowser(authUrl);

    const cb = await server.waitForCallback('linkedin');
    if (cb.state !== state) throw new Error('LinkedIn OAuth state mismatch (possible CSRF).');

    const tokenRes = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: cb.code!,
        client_id: cfg.linkedin.clientId,
        client_secret: cfg.linkedin.clientSecret,
        redirect_uri: REDIRECT_URI,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const accessToken: string = tokenRes.data.access_token;
    const expiresIn: number = tokenRes.data.expires_in || 5183944;

    const userRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const account: LinkedInAccount = {
      access_token: accessToken,
      expires_in: expiresIn,
      token_created_at: Date.now(),
      person_id: userRes.data.sub,
      display_name: userRes.data.name || `${userRes.data.given_name || ''} ${userRes.data.family_name || ''}`.trim(),
      email: userRes.data.email || '',
    };

    saveAccount('linkedin', account);
    logger.success(`LinkedIn connected: ${account.display_name}`);
    return account;
  } finally {
    await server.close();
  }
}

export async function getAuthorizedLinkedIn(): Promise<LinkedInAccount> {
  const account = getActiveAccount('linkedin');
  if (!account) throw new Error('No LinkedIn account connected. Run: npm run auth:linkedin');

  const expiryMs = account.token_created_at + account.expires_in * 1000;
  if (Date.now() >= expiryMs) {
    throw new Error('LinkedIn token expired. Run: npm run auth:linkedin');
  }
  return account;
}

export async function checkLinkedInStatus(): Promise<{
  connected: boolean;
  account?: LinkedInAccount;
  needsReauth?: boolean;
  daysUntilExpiry?: number;
}> {
  const account = getActiveAccount('linkedin');
  if (!account) return { connected: false };

  const expiryMs = account.token_created_at + account.expires_in * 1000;
  const msLeft = expiryMs - Date.now();
  const daysUntilExpiry = Math.round(msLeft / (24 * 3600 * 1000));

  if (msLeft <= 0) return { connected: false, needsReauth: true, account, daysUntilExpiry };
  return { connected: true, account, daysUntilExpiry };
}

export function listLinkedInAccounts(): LinkedInAccount[] {
  return listAccounts('linkedin') as LinkedInAccount[];
}
