import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const APP = path.resolve('dist/EasyMarkdown.html');
const url = pathToFileURL(APP).href + '?shot=1&demo=1';

const browser = await chromium.launch({ headless: true, executablePath: EDGE });

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  [${detail}]` : ''}`);
}
const errors = [];

/* ---------- 桌面：文件 CRUD / 筛选 / 侧栏 ---------- */
{
  const context = await browser.newContext({
    viewport: { width: 1512, height: 950 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`PAGEERROR: ${error.message}`));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForSelector('#previewPage h1');
  await page.waitForTimeout(500);

  await page.click('#newFileBtn');
  await page.waitForSelector('.overlay .modal-input');
  await page.fill('.overlay .modal-input', '自动化测试文件');
  await page.click('.overlay [data-ok]');
  await page.waitForTimeout(600);
  check('新建文件', (await page.textContent('.tab.active .tab-title')).includes('自动化测试文件'));

  await page.locator('.tab.active').hover();
  await page.locator('.tree-row.active [data-more]').click();
  await page.waitForSelector('.popover [data-act="rename"]');
  await page.click('.popover [data-act="rename"]');
  await page.waitForSelector('.overlay .modal-input');
  await page.fill('.overlay .modal-input', '重命名后的文件');
  await page.click('.overlay [data-ok]');
  await page.waitForTimeout(500);
  check('重命名文件', (await page.textContent('.tab.active .tab-title')).includes('重命名后的文件'));

  await page.locator('.tree-row.active [data-more]').click();
  await page.waitForSelector('.popover [data-act="delete"]');
  await page.click('.popover [data-act="delete"]');
  await page.waitForSelector('.overlay .btn.danger');
  await page.click('.overlay .btn.danger');
  await page.waitForTimeout(600);
  check('删除文件', (await page.locator('.tree-row.file', { hasText: '重命名后的文件' }).count()) === 0);

  await page.fill('#filterInput', '会议');
  await page.waitForTimeout(300);
  check('筛选文件', (await page.locator('.tree-row.file').count()) === 1, String(await page.locator('.tree-row.file').count()));
  await page.fill('#filterInput', '');
  await page.waitForTimeout(300);

  await page.locator('.tree-row.folder', { hasText: 'docs' }).click();
  await page.waitForTimeout(300);
  check('展开文件夹', (await page.locator('.tree-row.file').count()) === 8, String(await page.locator('.tree-row.file').count()));

  await page.click('#sidebarToggle');
  await page.waitForTimeout(350);
  check('收起侧栏', (await page.getAttribute('#app', 'class')).includes('sidebar-collapsed'));
  await page.screenshot({ path: 'ui-sidebar-collapsed.png' });
  await page.click('#sidebarToggle');
  await page.waitForTimeout(300);

  await page.locator('.tree-row.file', { hasText: '开始使用.md' }).click();
  await page.waitForTimeout(400);
  await page.click('.seg[data-mode="preview"]');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'ui-preview-final.png' });
  await context.close();
}

/* ---------- 移动端 ---------- */
{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`MOBILE PAGEERROR: ${error.message}`));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForSelector('#previewPage h1', { state: 'attached' });
  await page.waitForTimeout(600);

  check('移动端默认仅编辑', (await page.getAttribute('#workspace', 'class')).includes('mode-editor'));
  await page.screenshot({ path: 'ui-mobile-editor.png' });

  await page.click('#sidebarToggle');
  await page.waitForTimeout(400);
  check('移动端侧栏抽屉', (await page.getAttribute('#app', 'class')).includes('sidebar-open'));
  await page.screenshot({ path: 'ui-mobile-sidebar.png' });

  await page.click('#sidebarBackdrop', { position: { x: 350, y: 300 } });
  await page.waitForTimeout(350);
  await page.click('.seg[data-mode="preview"]');
  await page.waitForTimeout(500);
  check('移动端预览模式', (await page.getAttribute('#workspace', 'class')).includes('mode-preview'));
  await page.screenshot({ path: 'ui-mobile-preview.png' });
  await context.close();
}

check('无 JS 错误', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();
const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} 通过`);
if (failed.length) {
  console.log('失败项：' + failed.map((item) => item.name).join('、'));
  process.exitCode = 1;
}
