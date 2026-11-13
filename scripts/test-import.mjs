import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const APP = path.resolve('dist/EasyMarkdown.html');
const url = pathToFileURL(APP).href + '?shot=1&demo=1';
const MD_FIXTURE = path.resolve('.fixtures/导入测试.md');
const PNG_FIXTURE = path.resolve('.fixtures/测试图片.png');

const browser = await chromium.launch({ headless: true, executablePath: EDGE });
const context = await browser.newContext({ viewport: { width: 1512, height: 950 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  [${detail}]` : ''}`);
}

await page.goto(url, { waitUntil: 'load' });
await page.waitForSelector('#previewPage h1');
await page.waitForTimeout(500);

await page.setInputFiles('#fileInput', MD_FIXTURE);
await page.waitForTimeout(900);
check('导入 Markdown 文件', (await page.textContent('.tab.active .tab-title')).includes('导入测试'));
check('导入文档预览', (await page.textContent('#previewPage h1')).includes('导入测试'));

await page.locator('.cm-content').click();
await page.keyboard.press('Control+End');
await page.setInputFiles('#imageInput', PNG_FIXTURE);
await page.waitForTimeout(1000);
check('插入图片使用资源路径', (await page.evaluate(() => {
  const tree = JSON.parse(localStorage.getItem('easymarkdown:workspace:v1') || '[]');
  const file = tree.find((node) => node.name === '导入测试.md');
  return file ? /\]\(assets\/img-[^)]+\.png\)/.test(file.content) : false;
})));
check('图片数据存入资源表', (await page.evaluate(() => {
  const assets = JSON.parse(localStorage.getItem('easymarkdown:assets:v1') || '{}');
  return Object.values(assets).some((value) => String(value).includes('data:image/png;base64,'));
})));
check('预览渲染内嵌图片', (await page.locator('#previewPage img').count()) >= 1);
check('图片有实际宽度', await page.evaluate(() => {
  const img = document.querySelector('#previewPage img');
  return !!img && img.complete && img.naturalWidth > 0;
}));

await page.keyboard.press('Control+P');
await page.waitForSelector('#paletteOverlay');
await page.waitForTimeout(300);
await page.screenshot({ path: 'ui-palette-final.png' });
await page.keyboard.press('Escape');
await page.waitForTimeout(250);

const downloadPromise = page.waitForEvent('download', { timeout: 6000 }).catch(() => null);
await page.click('#exportBtn');
await page.waitForSelector('.popover [data-export="html"]');
await page.click('.popover [data-export="html"]');
const download = await downloadPromise;
if (download) {
  const exportPath = path.resolve('.fixtures/export-test.html');
  await download.saveAs(exportPath);
  const exported = fs.readFileSync(exportPath, 'utf8');
  check('导出 HTML 内嵌图片', exported.includes('data:image/png;base64'));
  check('导出 HTML 为干净文章结构', exported.includes('class="markdown-body"') && !exported.includes('code-copy'));
} else {
  check('导出 HTML 内嵌图片', false, 'no download');
  check('导出 HTML 为干净文章结构', false, 'no download');
}

check('无 JS 错误', errors.length === 0, errors.slice(0, 3).join(' | '));
await page.screenshot({ path: 'ui-image-inserted.png' });

await browser.close();
const failed = results.filter((item) => !item.ok);
console.log(`\n${results.length - failed.length}/${results.length} 通过`);
if (failed.length) process.exitCode = 1;
