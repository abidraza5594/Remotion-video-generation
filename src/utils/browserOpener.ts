import { spawn } from 'child_process';
import os from 'os';

export function openInBrowser(url: string): void {
  const platform = os.platform();
  try {
    if (platform === 'win32') {
      spawn('cmd', ['/c', 'start', '""', url], { detached: true, stdio: 'ignore' }).unref();
    } else if (platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
    }
  } catch (err) {
    console.log('Could not auto-open browser. Visit this URL manually:\n  ' + url);
  }
}
