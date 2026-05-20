import chalk from 'chalk';
import Table from 'cli-table3';
import inquirer from 'inquirer';
import { checkYouTubeStatus, loginYouTube, listYouTubeAccounts } from './youtubeAuth';
import { checkInstagramStatus, loginInstagram, listInstagramAccounts } from './instagramAuth';
import { checkLinkedInStatus, loginLinkedIn, listLinkedInAccounts } from './linkedinAuth';
import { removeAccount, setActiveAccount } from './tokenStore';
import { platformConfigured } from '../utils/configManager';
import { logger } from '../utils/logger';
import type { Platform } from '../types';

export interface PlatformStatus {
  platform: Platform;
  connected: boolean;
  display: string;
  needsReauth?: boolean;
  configured: boolean;
  expiryWarning?: string;
}

export async function gatherStatus(): Promise<PlatformStatus[]> {
  const [yt, ig, li] = await Promise.all([
    checkYouTubeStatus().catch(() => ({ connected: false })),
    checkInstagramStatus().catch(() => ({ connected: false })),
    checkLinkedInStatus().catch(() => ({ connected: false })),
  ]);

  const results: PlatformStatus[] = [];

  results.push({
    platform: 'youtube',
    connected: yt.connected,
    configured: platformConfigured('youtube'),
    needsReauth: 'needsReauth' in yt ? yt.needsReauth : undefined,
    display: yt.connected && 'account' in yt && yt.account
      ? `@${yt.account.channel_name}`
      : 'Not connected',
  });

  let igWarn: string | undefined;
  if (ig.connected && 'daysUntilExpiry' in ig && typeof ig.daysUntilExpiry === 'number' && ig.daysUntilExpiry <= 7) {
    igWarn = `Token expires in ${ig.daysUntilExpiry} days`;
  }
  results.push({
    platform: 'instagram',
    connected: ig.connected,
    configured: platformConfigured('instagram'),
    needsReauth: 'needsReauth' in ig ? ig.needsReauth : undefined,
    display: ig.connected && 'account' in ig && ig.account
      ? `@${ig.account.username}`
      : 'Not connected',
    expiryWarning: igWarn,
  });

  let liWarn: string | undefined;
  if (li.connected && 'daysUntilExpiry' in li && typeof li.daysUntilExpiry === 'number' && li.daysUntilExpiry <= 7) {
    liWarn = `Token expires in ${li.daysUntilExpiry} days — run: npm run auth:linkedin`;
  }
  results.push({
    platform: 'linkedin',
    connected: li.connected,
    configured: platformConfigured('linkedin'),
    needsReauth: 'needsReauth' in li ? li.needsReauth : undefined,
    display: li.connected && 'account' in li && li.account
      ? li.account.display_name
      : 'Not connected',
    expiryWarning: liWarn,
  });

  return results;
}

export function renderStatusTable(statuses: PlatformStatus[]): void {
  const table = new Table({
    head: [chalk.bold('Platform'), chalk.bold('Status')],
    colWidths: [16, 50],
    style: { head: ['cyan'], border: ['gray'] },
  });

  for (const s of statuses) {
    const label =
      s.platform === 'youtube' ? 'YouTube' :
      s.platform === 'instagram' ? 'Instagram' :
      'LinkedIn';

    let status: string;
    if (!s.configured) {
      status = chalk.gray(`Not configured (.env missing keys)`);
    } else if (s.connected) {
      status = chalk.green('✓ Connected ') + chalk.white(s.display);
      if (s.expiryWarning) status += '\n' + chalk.yellow('⚠ ' + s.expiryWarning);
    } else if (s.needsReauth) {
      status = chalk.yellow('⚠ Needs re-login — ') + s.display;
    } else {
      status = chalk.red('✗ Not connected');
    }
    table.push([label, status]);
  }

  console.log(table.toString());
}

export async function startupAuthCheck(): Promise<PlatformStatus[]> {
  logger.section('Social Account Status');
  const statuses = await gatherStatus();
  renderStatusTable(statuses);

  const missingConfigured = statuses.filter((s) => s.configured && !s.connected);
  if (missingConfigured.length === 0) return statuses;

  const { choice } = await inquirer.prompt<{ choice: string }>([
    {
      type: 'list',
      name: 'choice',
      message: 'Some accounts are not connected. What would you like to do?',
      choices: [
        { name: 'Connect missing accounts now', value: 'connect' },
        { name: 'Continue with current accounts', value: 'continue' },
        { name: 'Manage accounts (disconnect / switch)', value: 'manage' },
      ],
    },
  ]);

  if (choice === 'connect') {
    for (const s of missingConfigured) {
      await connectFlow(s.platform);
    }
    return gatherStatus();
  }
  if (choice === 'manage') {
    await manageFlow();
    return gatherStatus();
  }
  return statuses;
}

export async function connectFlow(platform: Platform): Promise<void> {
  try {
    if (platform === 'youtube') await loginYouTube();
    if (platform === 'instagram') await loginInstagram();
    if (platform === 'linkedin') await loginLinkedIn();
  } catch (err: any) {
    logger.error(`${platform} login failed: ${err.message}`);
  }
}

export async function manageFlow(): Promise<void> {
  const yt = listYouTubeAccounts();
  const ig = listInstagramAccounts();
  const li = listLinkedInAccounts();

  const choices: Array<{ name: string; value: string }> = [];
  for (const a of yt) choices.push({ name: `Disconnect YouTube (@${a.channel_name})`, value: `disc:youtube:${a.channel_id}` });
  for (const a of ig) choices.push({ name: `Disconnect Instagram (@${a.username})`, value: `disc:instagram:${a.ig_user_id}` });
  for (const a of li) choices.push({ name: `Disconnect LinkedIn (${a.display_name})`, value: `disc:linkedin:${a.person_id}` });

  if (yt.length > 1) choices.push({ name: '── YouTube: switch active account', value: 'switch:youtube' });
  if (ig.length > 1) choices.push({ name: '── Instagram: switch active account', value: 'switch:instagram' });
  if (li.length > 1) choices.push({ name: '── LinkedIn: switch active account', value: 'switch:linkedin' });

  choices.push({ name: 'Disconnect all accounts', value: 'disc:all' });
  choices.push({ name: 'Back', value: 'back' });

  const { action } = await inquirer.prompt<{ action: string }>([
    { type: 'list', name: 'action', message: 'Manage accounts:', choices, pageSize: 12 },
  ]);

  if (action === 'back') return;
  if (action === 'disc:all') {
    removeAccount('youtube');
    removeAccount('instagram');
    removeAccount('linkedin');
    logger.success('All accounts disconnected.');
    return;
  }
  if (action.startsWith('disc:')) {
    const [, platform, id] = action.split(':');
    removeAccount(platform as Platform, id);
    logger.success(`Disconnected ${platform} account.`);
    return;
  }
  if (action.startsWith('switch:')) {
    const [, platform] = action.split(':');
    await switchActiveFlow(platform as Platform);
  }
}

export async function switchActiveFlow(platform: Platform): Promise<void> {
  const accounts = platform === 'youtube' ? listYouTubeAccounts()
                  : platform === 'instagram' ? listInstagramAccounts()
                  : listLinkedInAccounts();
  if (accounts.length < 2) {
    logger.info('Only one account stored — nothing to switch.');
    return;
  }

  const choices = accounts.map((a) => {
    const id = platform === 'youtube' ? (a as any).channel_id
              : platform === 'instagram' ? (a as any).ig_user_id
              : (a as any).person_id;
    const label = platform === 'youtube' ? `@${(a as any).channel_name}`
              : platform === 'instagram' ? `@${(a as any).username}`
              : (a as any).display_name;
    return { name: `${label}${a.is_active ? ' (active)' : ''}`, value: id };
  });

  const { id } = await inquirer.prompt<{ id: string }>([
    { type: 'list', name: 'id', message: `Pick active ${platform} account:`, choices },
  ]);
  setActiveAccount(platform, id);
  logger.success('Active account updated.');
}

export async function refreshAllTokens(): Promise<void> {
  await gatherStatus();
}
