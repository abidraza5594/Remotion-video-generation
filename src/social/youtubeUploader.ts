import fs from 'fs';
import { google } from 'googleapis';
import { getAuthorizedYouTubeClient } from '../auth/youtubeAuth';
import { logger } from '../utils/logger';
import type { YouTubeCopy } from '../types';

export interface YouTubeUploadOptions {
  videoPath: string;
  thumbnailPath?: string;
  copy: YouTubeCopy;
  privacyStatus?: 'public' | 'unlisted' | 'private';
  format: 'shorts' | 'long';
}

export interface YouTubeUploadResult {
  videoId: string;
  url: string;
}

export async function uploadToYouTube(opts: YouTubeUploadOptions): Promise<YouTubeUploadResult> {
  if (!fs.existsSync(opts.videoPath)) throw new Error(`Video not found: ${opts.videoPath}`);

  const oauth2 = await getAuthorizedYouTubeClient();
  await oauth2.getAccessToken();
  const youtube = google.youtube({ version: 'v3', auth: oauth2 });

  const description = buildDescription(opts.copy, opts.format);
  const fileSize = fs.statSync(opts.videoPath).size;

  let lastPct = -1;
  let res;
  try {
    res = await youtube.videos.insert(
      {
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: opts.copy.title.slice(0, 100),
            description,
            tags: opts.copy.tags,
            categoryId: '28',
            defaultLanguage: 'en',
            defaultAudioLanguage: 'en',
          },
          status: {
            privacyStatus: opts.privacyStatus || 'public',
            selfDeclaredMadeForKids: false,
          },
        },
        media: {
          body: fs.createReadStream(opts.videoPath),
        },
      },
      {
        onUploadProgress: (evt) => {
          const pct = Math.round((evt.bytesRead / fileSize) * 100);
          if (pct !== lastPct) {
            lastPct = pct;
            logger.progress('YouTube', pct, 100, `${(evt.bytesRead / 1048576).toFixed(1)}MB`);
          }
        },
      },
    );
  } catch (err: any) {
    throw new Error(formatYouTubeError(err));
  }

  const videoId = res.data.id;
  if (!videoId) throw new Error('YouTube upload returned no video ID.');

  if (opts.thumbnailPath && fs.existsSync(opts.thumbnailPath)) {
    try {
      await youtube.thumbnails.set({
        videoId,
        media: { body: fs.createReadStream(opts.thumbnailPath) },
      });
      logger.success('Thumbnail uploaded.');
    } catch (err: any) {
      logger.warn('Thumbnail upload failed: ' + err.message);
    }
  }

  return { videoId, url: `https://youtu.be/${videoId}` };
}

function formatYouTubeError(err: any): string {
  const status = err?.response?.status || err?.code;
  const apiError = err?.response?.data?.error;
  const reason = apiError?.errors?.[0]?.reason;
  const message = apiError?.message || err?.message || String(err);

  if (status === 401) {
    return `${message}. YouTube token expired or was revoked. Run: npm run auth:youtube`;
  }
  if (status === 403 && reason === 'insufficientPermissions') {
    return `${message}. Reconnect YouTube so the upload scope is granted: npm run auth:youtube`;
  }
  if (status === 403 && reason === 'quotaExceeded') {
    return `${message}. Your YouTube Data API quota is exhausted for today.`;
  }
  if (status === 403 && reason === 'uploadLimitExceeded') {
    return `${message}. This channel has hit YouTube's upload limit.`;
  }
  return reason ? `${message} (${reason})` : message;
}

function buildDescription(copy: YouTubeCopy, format: 'shorts' | 'long'): string {
  const lines: string[] = [];
  lines.push(copy.description.trim());
  if (copy.chapters && copy.chapters.length > 0 && format === 'long') {
    lines.push('');
    lines.push('⏱ Chapters');
    for (const c of copy.chapters) lines.push(`${c.time} — ${c.title}`);
  }
  lines.push('');
  lines.push('🔗 Connect');
  lines.push('• Subscribe for more developer tutorials');
  lines.push('');
  if (copy.tags && copy.tags.length) {
    lines.push(copy.tags.slice(0, 8).map((t) => '#' + t.replace(/\s+/g, '')).join(' '));
  }
  return lines.join('\n').slice(0, 4900);
}
