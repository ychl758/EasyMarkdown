import { chromium } from 'playwright-core';
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('.');
const VERSION = process.env.EASYMD_VERSION || '0.5.0';
const EXE = path.join(ROOT, `release/EasyMarkdown-${VERSION}-portable.exe`);
const USER_DATA = path.join(ROOT, '.fixtures/portable-userdata');
const WORKSPACE = path.join(ROOT, '.fixtures/portable-workspace');
const PORT = 9333;

fs.rmSync(USER_DATA, { recursive: true, force: true });
fs.rmSync(WORKSPACE, { recursive: true, force: true });

function killApp() {
  try {
    execSync('taskkill /F /IM EasyMarkdown.exe /T', { stdio: 'ignore' });
  } catch {}
  try {
    execSync(`taskkill /F /IM "${path.basename(EXE)}" /T`, { stdio: 'ignore' });
  } catch {}
}

async function waitForCdp() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (response.ok) return true;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return false;
}

async function launchAndConnect() {
  const env = {
    ...process.env,
    EASYMD_USER_DATA: USER_DATA,
    EASYMD_WORKSPACE: WORKSPACE,
    EASYMD_DISABLE_UPDATE: '1',
  };
  delete env.ELECTRON_RUN_AS_NODE;
  spawn(EXE, [`--remote-debugging-port=${PORT}`], {
    cwd: ROOT,
    env,
    detached: false,
    stdio: 'ignore',
  });
  const ready = await waitForCdp();
  if (!ready) throw new Error('CDP port did not open');
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
  const pages = browser.contexts().flatMap((context) => context.pages());
  const page = pages.find((item) => item.url().startsWith('app://')) || pages[0];
  await page.waitForSelector('#newFileBtn', { timeout: 30000 });
  await page.waitForTimeout(800);
  return { browser, page };
}

killApp();
let { browser, page } = await launchAndConnect();
console.log('PORTABLE_URL:', page.url());
console.log('PORTABLE_TITLE:', await page.title());
await page.click('#newFileBtn');
await page.waitForSelector('.overlay .modal-input');
await page.fill('.overlay .modal-input', '便携版记忆测试');
await page.click('.overlay [data-ok]');
await page.waitForTimeout(1000);
console.log('PORTABLE_TREE:', await page.locator('.tree-row.file', { hasText: '便携版记忆测试' }).count());
console.log('PORTABLE_DISK_FILE:', fs.existsSync(path.join(WORKSPACE, '便携版记忆测试.md')));
await page.screenshot({ path: 'screenshots/portable-exe.png' });
await page.evaluate(() => window.close());
await browser.close();
await new Promise((resolve) => setTimeout(resolve, 2500));
killApp();

({ browser, page } = await launchAndConnect());
console.log('PORTABLE_AFTER_RELAUNCH_TREE:', await page.locator('.tree-row.file', { hasText: '便携版记忆测试' }).count());
console.log('PORTABLE_AFTER_RELAUNCH_TABS:', (await page.locator('.tab-title').allTextContents()).join(' | '));
await browser.close();
killApp();
console.log('PORTABLE_DONE');
