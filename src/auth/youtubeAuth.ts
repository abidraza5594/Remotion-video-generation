import { google, Auth } from 'googleapis';
import { loadConfig } from '../utils/configManager';
import { logger } from '../utils/logger';
import { openInBrowser } from '../utils/browserOpener';
import { startCallbackServer, CALLBACK_BASE } from './callbackServer';
import { saveAccount, getActiveAccount, listAccounts } from './tokenStore';
import type { YouTubeAccount } from '../types';

const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.readonly',
];

const REDIRECT_PATH = '/auth/youtube/callback';
const REDIRECT_URI = `${CALLBACK_BASE}${REDIRECT_PATH}`;

export function createOAuthClient(): Auth.OAuth2Client {
  const cfg = loadConfig();
  if (!cfg.youtube.clientId || !cfg.youtube.clientSecret) {
    throw new Error('YouTube OAuth credentials missing. Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in .env');
  }
  return new google.auth.OAuth2(cfg.youtube.clientId, cfg.youtube.clientSecret, REDIRECT_URI);
}

export async function loginYouTube(): Promise<YouTubeAccount> {
  const oauth2 = createOAuthClient();
  const authUrl = oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: YOUTUBE_SCOPES,
    prompt: 'consent',
    response_type: 'code',
    include_granted_scopes: true,
  });

  const server = await startCallbackServer();
  try {
    logger.info('Opening browser for YouTube (Google) login...');
    logger.info(`If your browser does not open, visit:\n  ${authUrl}`);
    openInBrowser(authUrl);

    const result = await server.waitForCallback('youtube');
    const { tokens } = await oauth2.getToken(result.code!);
    oauth2.setCredentials(tokens);

    const youtube = google.youtube({ version: 'v3', auth: oauth2 });
    const channelRes = await youtube.channels.list({
      part: ['snippet'],
      mine: true,
    });
    const channel = channelRes.data.items?.[0];
    if (!channel) throw new Error('No YouTube channel found for this Google account.');

    const account: YouTubeAccount = {
      access_token: tokens.access_token || '',
      refresh_token: tokens.refresh_token || '',
      expiry_date: tokens.expiry_date || Date.now() + 3600 * 1000,
      channel_name: channel.snippet?.title || 'Unknown',
      channel_id: channel.id || '',
    };

    if (!account.refresh_token) {
      const existing = getActiveAccount('youtube');
      if (existing?.refresh_token) account.refresh_token = existing.refresh_token;
    }

    saveAccount('youtube', account);
    logger.success(`YouTube connected: ${account.channel_name}`);
    return account;
  } finally {
    await server.close();
  }
}

export async function getAuthorizedYouTubeClient(): Promise<Auth.OAuth2Client> {
  const account = getActiveAccount('youtube');
  if (!account) throw new Error('No YouTube account connected. Run: npm run auth:youtube');

  const oauth2 = createOAuthClient();
  oauth2.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.expiry_date,
  });

  oauth2.on('tokens', (tokens) => {
    const updated: YouTubeAccount = {
      ...account,
      access_token: tokens.access_token || account.access_token,
      refresh_token: tokens.refresh_token || account.refresh_token,
      expiry_date: tokens.expiry_date || account.expiry_date,
    };
    saveAccount('youtube', updated);
  });

  const needsRefresh = !account.expiry_date || account.expiry_date < Date.now() + 5 * 60 * 1000;
  if (needsRefresh && account.refresh_token) {
    try {
      const { credentials } = await oauth2.refreshAccessToken();
      const updated: YouTubeAccount = {
        ...account,
        access_token: credentials.access_token || account.access_token,
        refresh_token: credentials.refresh_token || account.refresh_token,
        expiry_date: credentials.expiry_date || Date.now() + 3600 * 1000,
      };
      saveAccount('youtube', updated);
      oauth2.setCredentials(credentials);
    } catch (err) {
      throw new Error('YouTube token refresh failed. Run: npm run auth:youtube');
    }
  }

  return oauth2;
}

export async function checkYouTubeStatus(): Promise<{
  connected: boolean;
  account?: YouTubeAccount;
  needsReauth?: boolean;
  message?: string;
}> {
  const account = getActiveAccount('youtube');
  if (!account) return { connected: false };

  if (!account.refresh_token) {
    return { connected: false, needsReauth: true, message: 'Missing refresh token' };
  }

  const expired = account.expiry_date < Date.now();
  if (expired) {
    try {
      await getAuthorizedYouTubeClient();
      return { connected: true, account: getActiveAccount('youtube')! };
    } catch {
      return { connected: false, needsReauth: true, account, message: 'Refresh failed' };
    }
  }
  return { connected: true, account };
}

export function listYouTubeAccounts(): YouTubeAccount[] {
  return listAccounts('youtube') as YouTubeAccount[];
}
