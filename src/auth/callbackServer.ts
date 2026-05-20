import express from 'express';
import http from 'http';
import { logger } from '../utils/logger';

export interface CallbackResult {
  code?: string;
  state?: string;
  error?: string;
  raw: Record<string, string>;
}

const SUCCESS_HTML = `<!DOCTYPE html>
<html><head><title>Authentication Complete</title>
<style>
  body { margin: 0; height: 100vh; display: flex; align-items: center; justify-content: center;
         font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
         background: linear-gradient(135deg, #0D0D0D 0%, #1A1A2E 100%); color: #fff; }
  .box { padding: 48px; border-radius: 16px; background: rgba(255,255,255,0.04);
         border: 1px solid rgba(0,212,255,0.2); text-align: center;
         box-shadow: 0 0 60px rgba(0,212,255,0.15); }
  .check { font-size: 64px; color: #00FF88; margin-bottom: 16px; }
  h1 { margin: 0 0 12px; font-size: 28px; }
  p { color: #A0A0B0; margin: 0; }
  small { color: #555; margin-top: 24px; display: block; }
</style></head>
<body>
  <div class="box">
    <div class="check">&#10003;</div>
    <h1>Authentication Complete</h1>
    <p>You can close this tab and return to the terminal.</p>
    <small>Cinematic AI Studio</small>
  </div>
</body></html>`;

const ERROR_HTML = (msg: string) => `<!DOCTYPE html>
<html><head><title>Authentication Failed</title>
<style>
  body { margin: 0; height: 100vh; display: flex; align-items: center; justify-content: center;
         font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
         background: #0D0D0D; color: #fff; }
  .box { padding: 48px; border-radius: 16px; background: rgba(255,99,99,0.05);
         border: 1px solid rgba(255,99,99,0.4); text-align: center; max-width: 480px; }
  h1 { color: #ff6363; margin: 0 0 12px; }
  pre { color: #ffb3b3; white-space: pre-wrap; word-break: break-word; }
</style></head>
<body><div class="box"><h1>Authentication Failed</h1><pre>${msg}</pre></div></body></html>`;

export interface CallbackServer {
  waitForCallback(pathName: string, timeoutMs?: number): Promise<CallbackResult>;
  close(): Promise<void>;
}

export async function startCallbackServer(port = 3456): Promise<CallbackServer> {
  const app = express();
  const pending: Record<string, (result: CallbackResult) => void> = {};

  app.get('/auth/:provider/callback', (req, res) => {
    const provider = req.params.provider;
    const params = req.query as Record<string, string>;
    const result: CallbackResult = {
      code: params.code,
      state: params.state,
      error: params.error_description || params.error,
      raw: params,
    };

    if (result.error) {
      res.status(400).send(ERROR_HTML(result.error));
    } else if (!result.code) {
      res.status(400).send(ERROR_HTML('No authorization code received.'));
    } else {
      res.send(SUCCESS_HTML);
    }

    const cb = pending[provider];
    if (cb) {
      delete pending[provider];
      cb(result);
    }
  });

  app.get('/health', (_req, res) => res.json({ ok: true }));

  const server: http.Server = await new Promise((resolve, reject) => {
    const s = app.listen(port, (err?: Error) => {
      if (err) reject(err);
      else resolve(s);
    });
    s.on('error', reject);
  });

  return {
    waitForCallback(pathName: string, timeoutMs = 5 * 60 * 1000): Promise<CallbackResult> {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          delete pending[pathName];
          reject(new Error(`Auth timeout for ${pathName} after ${timeoutMs / 1000}s`));
        }, timeoutMs);

        pending[pathName] = (result) => {
          clearTimeout(timer);
          if (result.error) reject(new Error(result.error));
          else if (!result.code) reject(new Error('No authorization code received'));
          else resolve(result);
        };
      });
    },
    close(): Promise<void> {
      return new Promise((resolve) => {
        server.close(() => resolve());
      });
    },
  };
}

export const CALLBACK_PORT = 3456;
export const CALLBACK_BASE = `http://localhost:${CALLBACK_PORT}`;
