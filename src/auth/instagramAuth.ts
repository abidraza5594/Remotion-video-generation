import axios from 'axios';
import { loadConfig } from '../utils/configManager';
import { logger } from '../utils/logger';
import { openInBrowser } from '../utils/browserOpener';
import { startCallbackServer, CALLBACK_BASE } from './callbackServer';
import { saveAccount, getActiveAccount, listAccounts } from './tokenStore';
import type { InstagramAccount } from '../types';

const REDIRECT_PATH = '/auth/instagram/callback';
const REDIRECT_URI = `${CALLBACK_BASE}${REDIRECT_PATH}`;
const GRAPH_BASE = 'https://graph.facebook.com/v18.0';
const SCOPES = [
  'instagram_basic',
  'instagram_content_publish',
  'pages_read_engagement',
  'pages_show_list',
  'business_management',
];

export async function loginInstagram(): Promise<InstagramAccount> {
  const cfg = loadConfig();
  if (!cfg.meta.appId || !cfg.meta.appSecret) {
    throw new Error('Meta credentials missing. Set META_APP_ID and META_APP_SECRET in .env');
  }

  const authUrl =
    `https://www.facebook.com/v18.0/dialog/oauth` +
    `?client_id=${encodeURIComponent(cfg.meta.appId)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPES.join(','))}` +
    `&response_type=code`;

  const server = await startCallbackServer();
  try {
    logger.info('Opening browser for Instagram (Facebook) login...');
    logger.info(`If your browser does not open, visit:\n  ${authUrl}`);
    openInBrowser(authUrl);

    const cb = await server.waitForCallback('instagram');
    const code = cb.code!;

    const shortRes = await axios.get(`${GRAPH_BASE}/oauth/access_token`, {
      params: {
        client_id: cfg.meta.appId,
        client_secret: cfg.meta.appSecret,
        redirect_uri: REDIRECT_URI,
        code,
      },
    });
    const shortToken: string = shortRes.data.access_token;

    const longRes = await axios.get(`${GRAPH_BASE}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: cfg.meta.appId,
        client_secret: cfg.meta.appSecret,
        fb_exchange_token: shortToken,
      },
    });
    const longToken: string = longRes.data.access_token;
    const expiresIn: number = longRes.data.expires_in || 60 * 24 * 3600;

    const pagesRes = await axios.get(`${GRAPH_BASE}/me/accounts`, {
      params: { access_token: longToken },
    });
    const pages: Array<{ id: string; name: string; access_token: string }> = pagesRes.data.data || [];
    if (!pages.length) {
      throw new Error('No Facebook Pages found. Create a Page and link an Instagram Professional account.');
    }

    let igUserId = '';
    let pageId = '';
    let pageToken = '';
    for (const page of pages) {
      const linkRes = await axios.get(`${GRAPH_BASE}/${page.id}`, {
        params: { fields: 'instagram_business_account', access_token: page.access_token },
      });
      const ig = linkRes.data.instagram_business_account;
      if (ig?.id) {
        igUserId = ig.id;
        pageId = page.id;
        pageToken = page.access_token;
        break;
      }
    }
    if (!igUserId) {
      throw new Error('No Instagram Professional account linked to your Facebook Pages.');
    }

    const igRes = await axios.get(`${GRAPH_BASE}/${igUserId}`, {
      params: { fields: 'name,username', access_token: pageToken || longToken },
    });

    const account: InstagramAccount = {
      access_token: pageToken || longToken,
      token_expiry: Date.now() + expiresIn * 1000,
      ig_user_id: igUserId,
      username: igRes.data.username || 'unknown',
      page_id: pageId,
    };

    saveAccount('instagram', account);
    logger.success(`Instagram connected: @${account.username}`);
    return account;
  } finally {
    await server.close();
  }
}

export async function refreshInstagramToken(account: InstagramAccount): Promise<InstagramAccount> {
  const res = await axios.get(`${GRAPH_BASE}/oauth/access_token`, {
    params: {
      grant_type: 'ig_refresh_token',
      access_token: account.access_token,
    },
  });
  const refreshed: InstagramAccount = {
    ...account,
    access_token: res.data.access_token || account.access_token,
    token_expiry: Date.now() + (res.data.expires_in || 60 * 24 * 3600) * 1000,
  };
  saveAccount('instagram', refreshed);
  return refreshed;
}

export async function getAuthorizedInstagram(): Promise<InstagramAccount> {
  const account = getActiveAccount('instagram');
  if (!account) throw new Error('No Instagram account connected. Run: npm run auth:instagram');

  const sevenDays = 7 * 24 * 3600 * 1000;
  if (account.token_expiry - Date.now() < sevenDays) {
    try {
      return await refreshInstagramToken(account);
    } catch {
      logger.warn('Instagram token refresh failed. You may need to re-login.');
    }
  }
  return account;
}

export async function checkInstagramStatus(): Promise<{
  connected: boolean;
  account?: InstagramAccount;
  needsReauth?: boolean;
  daysUntilExpiry?: number;
}> {
  const account = getActiveAccount('instagram');
  if (!account) return { connected: false };

  const msLeft = account.token_expiry - Date.now();
  const daysUntilExpiry = Math.round(msLeft / (24 * 3600 * 1000));

  if (msLeft <= 0) return { connected: false, needsReauth: true, account, daysUntilExpiry };
  return { connected: true, account, daysUntilExpiry };
}

export function listInstagramAccounts(): InstagramAccount[] {
  return listAccounts('instagram') as InstagramAccount[];
}
