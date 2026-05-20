import axios from 'axios';
import { getAuthorizedInstagram } from '../auth/instagramAuth';
import { hostVideoPublicly } from './publicHost';
import { logger } from '../utils/logger';
import type { InstagramCopy } from '../types';

export interface InstagramUploadOptions {
  videoPath: string;
  copy: InstagramCopy;
}

export interface InstagramUploadResult {
  mediaId: string;
  permalink?: string;
}

const GRAPH_BASE = 'https://graph.facebook.com/v18.0';

export async function uploadToInstagram(opts: InstagramUploadOptions): Promise<InstagramUploadResult> {
  const account = await getAuthorizedInstagram();
  const caption = buildCaption(opts.copy);

  const host = await hostVideoPublicly(opts.videoPath);
  try {
    logger.step('Creating Reels media container...');
    const createRes = await axios.post(
      `${GRAPH_BASE}/${account.ig_user_id}/media`,
      null,
      {
        params: {
          media_type: 'REELS',
          video_url: host.publicUrl,
          caption,
          share_to_feed: true,
          access_token: account.access_token,
        },
      },
    );

    const creationId: string = createRes.data.id;
    if (!creationId) throw new Error('Instagram returned no creation ID.');

    logger.step('Waiting for Instagram to process video...');
    await waitForReady(creationId, account.access_token);

    logger.step('Publishing reel...');
    const publishRes = await axios.post(
      `${GRAPH_BASE}/${account.ig_user_id}/media_publish`,
      null,
      {
        params: { creation_id: creationId, access_token: account.access_token },
      },
    );

    const mediaId: string = publishRes.data.id;
    if (!mediaId) throw new Error('Instagram returned no media ID.');

    let permalink: string | undefined;
    try {
      const permRes = await axios.get(`${GRAPH_BASE}/${mediaId}`, {
        params: { fields: 'permalink', access_token: account.access_token },
      });
      permalink = permRes.data.permalink;
    } catch {
      /* permalink optional */
    }

    return { mediaId, permalink };
  } finally {
    await host.close();
  }
}

async function waitForReady(creationId: string, accessToken: string): Promise<void> {
  const maxPolls = 60;
  for (let i = 0; i < maxPolls; i++) {
    await sleep(5000);
    const res = await axios.get(`${GRAPH_BASE}/${creationId}`, {
      params: { fields: 'status_code,status', access_token: accessToken },
    });
    const code: string = res.data.status_code;
    logger.progress('Processing', i + 1, maxPolls, code);
    if (code === 'FINISHED') return;
    if (code === 'ERROR' || code === 'EXPIRED') {
      throw new Error(`Instagram processing failed: ${code} — ${res.data.status || ''}`);
    }
  }
  throw new Error('Instagram processing timeout (5 minutes).');
}

function buildCaption(copy: InstagramCopy): string {
  const lines: string[] = [];
  lines.push(copy.hook);
  lines.push('');
  lines.push(copy.body);
  if (copy.cta) {
    lines.push('');
    lines.push(copy.cta);
  }
  if (copy.hashtags && copy.hashtags.length) {
    lines.push('');
    lines.push('.');
    lines.push('.');
    lines.push(copy.hashtags.join(' '));
  }
  return lines.join('\n').slice(0, 2200);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
