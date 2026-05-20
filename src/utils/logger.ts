import chalk from 'chalk';

export const logger = {
  banner(title: string) {
    const line = '═'.repeat(40);
    console.log(chalk.cyan('╔' + line + '╗'));
    console.log(chalk.cyan('║') + chalk.bold.white(title.padStart((40 + title.length) / 2).padEnd(40)) + chalk.cyan('║'));
    console.log(chalk.cyan('╚' + line + '╝'));
  },
  section(title: string) {
    console.log('\n' + chalk.bold.magenta('━━━ ' + title + ' ━━━'));
  },
  info(msg: string) {
    console.log(chalk.cyan('ℹ ') + msg);
  },
  success(msg: string) {
    console.log(chalk.green('✓ ') + msg);
  },
  warn(msg: string) {
    console.log(chalk.yellow('⚠ ') + msg);
  },
  error(msg: string) {
    console.log(chalk.red('✗ ') + msg);
  },
  step(msg: string) {
    console.log(chalk.gray('⟳ ') + msg);
  },
  progress(prefix: string, current: number, total: number, suffix = '') {
    const pct = total === 0 ? 0 : (current / total) * 100;
    const barLen = 30;
    const filled = Math.round((pct / 100) * barLen);
    const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
    process.stdout.write(`\r${chalk.cyan(prefix)} [${chalk.green(bar)}] ${pct.toFixed(1)}% ${suffix}`);
    if (current >= total) process.stdout.write('\n');
  },
  divider() {
    console.log(chalk.gray('─'.repeat(50)));
  },
  raw(...args: unknown[]) {
    console.log(...args);
  },
};
