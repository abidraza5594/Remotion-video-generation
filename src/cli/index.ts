#!/usr/bin/env node
import chalk from 'chalk';
import inquirer from 'inquirer';
import { logger } from '../utils/logger';
import { ensureDirs, PATHS } from '../utils/fileManager';
import { envFileExists, platformConfigured } from '../utils/configManager';
import {
  startupAuthCheck,
  connectFlow,
  manageFlow,
  gatherStatus,
  renderStatusTable,
} from '../auth/authManager';
import { pickTopic, pickFormat, runPipeline, offerSocialUpload, cleanupTemp } from './orchestrator';
import { removeAccount } from '../auth/tokenStore';
import type { Platform } from '../types';

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

async function authSubcommand(target: string): Promise<void> {
  if (target === 'status') {
    const statuses = await gatherStatus();
    renderStatusTable(statuses);
    return;
  }
  if (target === 'logout') {
    const statuses = await gatherStatus();
    const choices = [];
    if (statuses[0].connected) choices.push({ name: `Disconnect YouTube — ${statuses[0].display}`, value: 'youtube' });
    if (statuses[1].connected) choices.push({ name: `Disconnect Instagram — ${statuses[1].display}`, value: 'instagram' });
    if (statuses[2].connected) choices.push({ name: `Disconnect LinkedIn — ${statuses[2].display}`, value: 'linkedin' });
    choices.push({ name: 'Disconnect all', value: 'all' });
    choices.push({ name: 'Cancel', value: 'cancel' });

    const { pick } = await inquirer.prompt<{ pick: string }>([
      { type: 'list', name: 'pick', message: 'Disconnect which account?', choices },
    ]);
    if (pick === 'cancel') return;
    if (pick === 'all') {
      removeAccount('youtube');
      removeAccount('instagram');
      removeAccount('linkedin');
      logger.success('All accounts disconnected.');
    } else {
      removeAccount(pick as Platform);
      logger.success(`Disconnected ${pick}.`);
    }
    return;
  }
  if (target === 'switch') {
    await manageFlow();
    return;
  }
  if (target === 'youtube' || target === 'instagram' || target === 'linkedin') {
    if (!platformConfigured(target as Platform)) {
      logger.error(`${target} OAuth credentials are not set in .env`);
      logger.info(`Add the required keys to .env. See .env.example for the full list.`);
      return;
    }
    await connectFlow(target as Platform);
    return;
  }
  logger.error('Unknown --auth value: ' + target);
}

async function main(): Promise<void> {
  ensureDirs();

  logger.banner('Cinematic AI Video Studio');

  if (!envFileExists()) {
    logger.warn('No .env file found at project root.');
    logger.info('Copy .env.example to .env and fill in credentials before continuing.');
  }

  const authArg = parseArg('auth');
  if (authArg) {
    await authSubcommand(authArg);
    return;
  }

  await startupAuthCheck();

  logger.section('Topic Selection');
  const topicInfo = await pickTopic();
  logger.success(`Topic confirmed: "${topicInfo.topic}"`);

  logger.section('Video Format');
  const format = await pickFormat();
  logger.success(`Format: ${format === 'shorts' ? 'Shorts / Reels (9:16)' : 'Long Tutorial (16:9)'}`);

  logger.section('Generation Pipeline');
  const ctx = await runPipeline({ ...topicInfo, format });

  logger.section('Social Media');
  await offerSocialUpload(ctx);

  logger.section('Cleanup');
  await cleanupTemp();
  logger.success('Done.');
  logger.raw(chalk.cyan('\n📦 Final MP4: ') + chalk.white(ctx.videoPath || '(not produced)'));
}

main().catch((err: any) => {
  logger.error('Fatal error: ' + (err?.message || String(err)));
  if (process.env.DEBUG) console.error(err);
  process.exit(1);
});
