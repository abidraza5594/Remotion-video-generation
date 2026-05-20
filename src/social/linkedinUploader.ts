import axios from 'axios';
import fs from 'fs';
import { getAuthorizedLinkedIn } from '../auth/linkedinAuth';
import { logger } from '../utils/logger';
import type { LinkedInCopy } from '../types';

export interface LinkedInUploadOptions {
  videoPath: string;
  copy: LinkedInCopy;
  topic: string;
}

export interface LinkedInUploadResult {
  postId: string;
  url?: string;
}

export async function uploadToLinkedIn(opts: LinkedInUploadOptions): Promise<LinkedInUploadResult> {
  if (!fs.existsSync(opts.videoPath)) throw new Error('Video file not found.');

  const account = await getAuthorizedLinkedIn();
  const authHeader = {
    Authorization: `Bearer ${account.access_token}`,
    'X-Restli-Protocol-Version': '2.0.0',
  };

  logger.step('Registering LinkedIn upload...');
  const registerRes = await axios.post(
    'https://api.linkedin.com/v2/assets?action=registerUpload',
    {
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-video'],
        owner: `urn:li:person:${account.person_id}`,
        serviceRelationships: [
          {
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent',
          },
        ],
      },
    },
    { headers: { ...authHeader, 'Content-Type': 'application/json' } },
  );

  const uploadUrl: string =
    registerRes.data.value.uploadMechanism[
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
    ].uploadUrl;
  const asset: string = registerRes.data.value.asset;

  logger.step('Uploading video to LinkedIn...');
  const fileSize = fs.statSync(opts.videoPath).size;
  let lastPct = -1;
  const stream = fs.createReadStream(opts.videoPath);
  stream.on('data', (chunk) => {
    const bytes = (stream as any).bytesRead || 0;
    const pct = Math.round((bytes / fileSize) * 100);
    if (pct !== lastPct) {
      lastPct = pct;
      logger.progress('LinkedIn', pct, 100);
    }
  });

  await axios.put(uploadUrl, stream, {
    headers: {
      ...authHeader,
      'Content-Type': 'application/octet-stream',
      'Content-Length': fileSize,
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  logger.step('Waiting for LinkedIn to process video...');
  await waitForAssetReady(asset, account.access_token);

  logger.step('Creating LinkedIn post...');
  const shareText = buildShareText(opts.copy);
  const postRes = await axios.post(
    'https://api.linkedin.com/v2/ugcPosts',
    {
      author: `urn:li:person:${account.person_id}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: shareText },
          shareMediaCategory: 'VIDEO',
          media: [
            {
              status: 'READY',
              description: { text: opts.topic },
              media: asset,
              title: { text: opts.copy.headline.slice(0, 200) },
            },
          ],
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    },
    { headers: { ...authHeader, 'Content-Type': 'application/json' } },
  );

  const postId: string = postRes.data.id || postRes.headers['x-restli-id'] || '';
  const url = postId
    ? `https://www.linkedin.com/feed/update/${encodeURIComponent(postId)}`
    : undefined;

  return { postId, url };
}

async function waitForAssetReady(asset: string, accessToken: string): Promise<void> {
  const id = asset.replace('urn:li:digitalmediaAsset:', '');
  const maxPolls = 30;
  for (let i = 0; i < maxPolls; i++) {
    await sleep(4000);
    try {
      const res = await axios.get(`https://api.linkedin.com/v2/assets/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}`, 'X-Restli-Protocol-Version': '2.0.0' },
      });
      const status = res.data?.recipes?.[0]?.status;
      logger.progress('Processing', i + 1, maxPolls, status || '');
      if (status === 'AVAILABLE') return;
      if (status === 'PROCESSING_FAILED' || status === 'CLIENT_ERROR') {
        throw new Error('LinkedIn asset processing failed.');
      }
    } catch (err: any) {
      if (i === maxPolls - 1) throw err;
    }
  }
  logger.warn('LinkedIn processing slow — proceeding with READY status anyway.');
}

function buildShareText(copy: LinkedInCopy): string {
  const lines: string[] = [];
  lines.push(copy.headline);
  lines.push('');
  lines.push(copy.body);
  if (copy.bulletPoints && copy.bulletPoints.length) {
    lines.push('');
    for (const point of copy.bulletPoints) lines.push(`• ${point}`);
  }
  if (copy.cta) {
    lines.push('');
    lines.push(copy.cta);
  }
  if (copy.hashtags && copy.hashtags.length) {
    lines.push('');
    lines.push(copy.hashtags.join(' '));
  }
  return lines.join('\n').slice(0, 3000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
