import express from 'express';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { logger } from '../utils/logger';
import { loadConfig } from '../utils/configManager';

export interface PublicHost {
  publicUrl: string;
  close: () => Promise<void>;
}

const PORT = 3789;

export async function hostVideoPublicly(videoPath: string): Promise<PublicHost> {
  if (!fs.existsSync(videoPath)) throw new Error('Video file not found for hosting.');

  const cfg = loadConfig();
  const app = express();
  const filename = 'video.mp4';

  app.get(`/${filename}`, (req, res) => {
    const stat = fs.statSync(videoPath);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Type', 'video/mp4');
    fs.createReadStream(videoPath).pipe(res);
  });

  const server: http.Server = await new Promise((resolve, reject) => {
    const s = app.listen(PORT, (err?: Error) => (err ? reject(err) : resolve(s)));
    s.on('error', reject);
  });

  let publicUrl: string;
  let ngrokListener: any = null;

  try {
    const ngrokOpts: any = { addr: PORT };
    if (cfg.ngrokAuthToken) ngrokOpts.authtoken = cfg.ngrokAuthToken;

    const ngrok = await import('@ngrok/ngrok').catch(() => null);
    if (!ngrok) {
      throw new Error('@ngrok/ngrok not installed. Run: npm install @ngrok/ngrok');
    }
    ngrokListener = await (ngrok as any).connect(ngrokOpts);
    const tunnelUrl: string = typeof ngrokListener === 'string' ? ngrokListener : ngrokListener.url();
    publicUrl = `${tunnelUrl.replace(/\/$/, '')}/${filename}`;
    logger.info(`Video hosted at: ${publicUrl}`);
  } catch (err: any) {
    server.close();
    throw new Error(
      'Could not start ngrok tunnel: ' + err.message +
        '\nFix: install ngrok npm package and optionally set NGROK_AUTHTOKEN in .env',
    );
  }

  return {
    publicUrl,
    close: async () => {
      try {
        if (ngrokListener) {
          if (typeof ngrokListener.close === 'function') await ngrokListener.close();
        }
      } catch {
        /* ignore */
      }
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
