import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const APP = path.resolve('dist/EasyMarkdown.html');
const url = pathToFileURL(APP).href + '?shot=1&demo=1';

const browser = await chromium.launch({
  headless: true,
  executablePath: EDGE,
  args: ['--force-color-profile=srgb'],
});
const context = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(`PAGEERROR: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`CONSOLE: ${message.text()}`);
});

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  [${detail}]` : ''}`);
}

await page.goto(url, { waitUntil: 'load' });
await page.waitForSelector('#previewPage h1');
await page.waitForTimeout(500);

check('预览编辑模式按钮存在', (await page.locator('[data-mode="preview-edit"]').count()) === 1);
await page.click('[data-mode="preview-edit"]');
await page.waitForTimeout(300);

check(
  '工作区进入预览编辑模式',
  (await page.getAttribute('#workspace', 'class')).includes('mode-preview-edit')
);
check(
  '段落与标题可直接编辑',
  (await page.locator('#previewPage [contenteditable="true"]').count()) >= 2,
  String(await page.locator('#previewPage [contenteditable="true"]').count())
);
check(
  '复杂块标记为源码编辑',
  (await page.locator('#previewPage [data-md-edit="source"]').count()) >= 3,
  String(await page.locator('#previewPage [data-md-edit="source"]').count())
);

const paragraph = page.locator('#previewPage p[contenteditable="true"]').first();
await paragraph.click();
await page.keyboard.press('End');
await page.keyboard.type(' 预览内编辑');
await page.keyboard.press('Enter');
await page.waitForTimeout(500);
check(
  '段落修改回到预览',
  (await page.locator('#previewPage p').first().textContent()).includes('预览内编辑')
);

await page.click('[data-mode="editor"]');
await page.waitForTimeout(300);
check(
  '段落修改写回 Markdown 源码',
  (await page.locator('.cm-content').innerText()).includes('预览内编辑')
);

await page.click('[data-mode="preview-edit"]');
await page.waitForTimeout(300);
const table = page.locator('#previewPage table').first();
await table.dblclick();
await page.waitForTimeout(200);
const tableEditor = page.locator('.preview-source-edit textarea');
check('表格双击打开源码编辑', (await tableEditor.count()) === 1);
const tableSource = await tableEditor.inputValue();
check('表格源码包含 Markdown 分隔行', tableSource.includes('| --- |'));
await tableEditor.fill(tableSource.replace('快捷键', '快捷键X'));
await tableEditor.press('Control+Enter');
await page.waitForTimeout(500);
check(
  '表格修改回到预览',
  (await page.locator('#previewPage table').first().textContent()).includes('快捷键X')
);

const codeBlock = page.locator('#previewPage .code-block').first();
await codeBlock.dblclick();
await page.waitForTimeout(200);
const codeEditor = page.locator('.preview-source-edit textarea');
check('代码块双击打开源码编辑', (await codeEditor.count()) === 1);
await codeEditor.press('Escape');
await page.waitForTimeout(400);
check('Esc 取消后代码块恢复', (await page.locator('#previewPage .code-block').count()) >= 1);

await page.click('[data-mode="preview"]');
await page.waitForTimeout(300);
check(
  '只读预览不再可编辑',
  (await page.locator('#previewPage [contenteditable="true"]').count()) === 0
);
check('无 JS 错误', errors.length === 0, errors.join(' | '));

await browser.close();

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} 通过`);
if (failed.length) process.exitCode = 1;
