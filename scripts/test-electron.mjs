import { _electron as electron } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('.');
const ELECTRON = path.join(ROOT, 'node_modules/electron/dist/electron.exe');
const USER_DATA = path.join(ROOT, '.fixtures/electron-userdata');
const WORKSPACE = path.join(ROOT, '.fixtures/electron-workspace');

fs.rmSync(USER_DATA, { recursive: true, force: true });
fs.rmSync(WORKSPACE, { recursive: true, force: true });

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
env.EASYMD_USER_DATA = USER_DATA;
env.EASYMD_WORKSPACE = WORKSPACE;
env.EASYMD_DISABLE_UPDATE = '1';

async function launch() {
  const app = await electron.launch({
    executablePath: ELECTRON,
    args: ['.'],
    cwd: ROOT,
    env,
  });
  const page = await app.firstWindow();
  await page.waitForSelector('#newFileBtn', { timeout: 30000 });
  await page.waitForTimeout(900);
  return { app, page };
}

let { app, page } = await launch();
console.log('URL:', page.url());
console.log('TITLE:', await page.title());
console.log('THEME:', await page.getAttribute('html', 'data-theme'));

await page.click('#newFileBtn');
await page.waitForSelector('.overlay .modal-input');
await page.fill('.overlay .modal-input', '桌面记忆测试');
await page.click('.overlay [data-ok]');
await page.waitForTimeout(1200);

console.log('ACTIVE_TAB:', await page.textContent('.tab.active .tab-title'));
console.log('TREE_HAS_FILE:', await page.locator('.tree-row.file', { hasText: '桌面记忆测试' }).count());

const diskFile = path.join(WORKSPACE, '桌面记忆测试.md');
console.log('DISK_FILE_EXISTS:', fs.existsSync(diskFile));

await page.locator('.cm-content').click();
await page.keyboard.press('Control+End');
await page.keyboard.type('\n桌面写入测试内容。');
await page.waitForTimeout(1300);
console.log(
  'DISK_CONTENT_HAS_EDIT:',
  fs.existsSync(diskFile) && fs.readFileSync(diskFile, 'utf8').includes('桌面写入测试内容')
);
await page.screenshot({ path: 'screenshots/electron-desktop.png' });
await app.close();

({ app, page } = await launch());
console.log('AFTER_RELAUNCH_TREE:', await page.locator('.tree-row.file', { hasText: '桌面记忆测试' }).count());
console.log('AFTER_RELAUNCH_TABS:', (await page.locator('.tab-title').allTextContents()).join(' | '));
console.log(
  'AFTER_RELAUNCH_CONTENT:',
  fs.existsSync(diskFile) && fs.readFileSync(diskFile, 'utf8').includes('桌面写入测试内容')
);

await page.click('[data-mode="preview-edit"]');
await page.waitForTimeout(300);
const heading = page.locator('#previewPage h1[contenteditable="true"]').first();
await heading.click();
await page.keyboard.press('End');
await page.keyboard.type(' 预览编辑');
await page.keyboard.press('Enter');
await page.waitForTimeout(1300);
console.log(
  'DISK_CONTENT_HAS_PREVIEW_EDIT:',
  fs.existsSync(diskFile) && fs.readFileSync(diskFile, 'utf8').includes('# 桌面记忆测试 预览编辑')
);
await page.screenshot({ path: 'screenshots/electron-desktop-relaunch.png' });
await app.close();
console.log('DONE');
