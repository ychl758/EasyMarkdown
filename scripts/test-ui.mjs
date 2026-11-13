import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
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
  viewport: { width: 1512, height: 950 },
  deviceScaleFactor: 1,
  acceptDownloads: true,
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
await page.waitForTimeout(700);

check('页面标题正确', (await page.title()).includes('开始使用'));
check('预览渲染 H1', (await page.textContent('#previewPage h1')).includes('开始使用'));
check('文件树可见 6 个文件（docs 默认收起）', (await page.locator('.tree-row.file').count()) === 6, String(await page.locator('.tree-row.file').count()));
check('初始 2 个标签页', (await page.locator('.tab').count()) === 2);

const taskBoxes = page.locator('#previewPage .task-checkbox');
const taskCount = await taskBoxes.count();
check('任务清单渲染', taskCount === 4, String(taskCount));
if (taskCount >= 3) {
  await taskBoxes.nth(2).click();
  await page.waitForTimeout(1100);
  const source = await page.evaluate(() => {
    const tree = JSON.parse(localStorage.getItem('easymarkdown:workspace:v1') || '[]');
    const file = tree.find((node) => node.id === 'welcome');
    return file ? file.content : '';
  });
  check('勾选任务更新源码', source.includes('- [x] 切换一次深色主题'));
}

await page.locator('.tree-row.file', { hasText: '流程图与图表.md' }).click();
await page.waitForTimeout(500);
await page.waitForSelector('#previewPage .mermaid-block svg', { timeout: 15000 });
check('Mermaid 图表渲染', (await page.locator('#previewPage .mermaid-block svg').count()) >= 3, String(await page.locator('#previewPage .mermaid-block svg').count()));
check('Mermaid 无渲染错误', (await page.locator('#previewPage .mermaid-error').count()) === 0);

await page.click('[data-action="insert"]');
await page.waitForSelector('.popover [data-insert="table"]');
check('插入菜单', (await page.locator('.popover [data-insert]').count()) === 4, String(await page.locator('.popover [data-insert]').count()));
await page.click('.popover [data-insert="table"]');
await page.waitForTimeout(900);
const inserted = await page.evaluate(() => {
  const tree = JSON.parse(localStorage.getItem('easymarkdown:workspace:v1') || '[]');
  const file = tree.find((node) => node.id === 'diagrams');
  return file ? file.content : '';
});
check('插入表格', inserted.includes('| 列 1 |'));

const mermaidExportPromise = page.waitForEvent('download', { timeout: 8000 }).catch(() => null);
await page.click('#exportBtn');
await page.waitForSelector('.popover [data-export="html"]');
await page.click('.popover [data-export="html"]');
const mermaidExport = await mermaidExportPromise;
if (mermaidExport) {
  const exportPath = path.resolve('.fixtures/export-diagrams.html');
  await mermaidExport.saveAs(exportPath);
  const exported = fs.readFileSync(exportPath, 'utf8');
  check('导出 HTML 内嵌 Mermaid', exported.includes('mermaid-block') && exported.includes('<svg') && !exported.includes('class="mermaid-source"'));
} else {
  check('导出 HTML 内嵌 Mermaid', false, 'no download');
}

await page.locator('.tree-row.file', { hasText: '产品随想.md' }).click();
await page.waitForTimeout(500);
check('切换文件激活标签', (await page.textContent('.tab.active .tab-title')).includes('产品随想'));
check('切换文件更新预览', (await page.textContent('#previewPage h1')).includes('关于写作工具'));

await page.locator('.cm-content').click();
await page.keyboard.press('Control+End');
await page.keyboard.type('\n\n交互测试段落。');
await page.waitForTimeout(1300);
check('输入内容进入预览', (await page.textContent('#previewPage')).includes('交互测试段落'));
check('自动保存状态', (await page.textContent('#saveText')).includes('已保存'));
const savedContent = await page.evaluate(() => {
  const tree = JSON.parse(localStorage.getItem('easymarkdown:workspace:v1') || '[]');
  const file = tree.find((node) => node.id === 'thoughts');
  return file ? file.content : '';
});
check('localStorage 保存内容', savedContent.includes('交互测试段落'));

const beforeTheme = await page.getAttribute('html', 'data-theme');
await page.click('#themeBtn');
await page.waitForTimeout(300);
const afterTheme = await page.getAttribute('html', 'data-theme');
check('主题切换', beforeTheme !== afterTheme, `${beforeTheme} -> ${afterTheme}`);
await page.screenshot({ path: 'ui-after-theme.png' });
await page.click('#themeBtn');
await page.waitForTimeout(250);

await page.keyboard.press('Control+P');
await page.waitForSelector('#paletteOverlay');
check('命令面板打开', await page.isVisible('#paletteOverlay'));
await page.fill('.palette-input', '语法');
await page.waitForTimeout(300);
check('命令面板搜索', (await page.locator('.palette-item').count()) > 0, String(await page.locator('.palette-item').count()));
await page.screenshot({ path: 'ui-palette.png' });
await page.keyboard.press('Enter');
await page.waitForTimeout(600);
check('命令面板打开文件', (await page.textContent('.tab.active .tab-title')).includes('Markdown 语法速查'));

await page.locator('.sidebar-tab', { hasText: '大纲' }).click();
await page.waitForTimeout(350);
const outlineCount = await page.locator('#outline .outline-item').count();
check('大纲生成', outlineCount > 0, String(outlineCount));
await page.screenshot({ path: 'ui-outline.png' });
if (outlineCount > 1) {
  await page.locator('#outline .outline-item').nth(1).click();
  await page.waitForTimeout(900);
  const scrollTop = await page.evaluate(() => document.getElementById('previewScroll').scrollTop);
  check('点击大纲跳转', scrollTop > 0, String(Math.round(scrollTop)));
  const offset = await page.evaluate(() => {
    const heading = document.querySelectorAll('#previewPage h1,#previewPage h2,#previewPage h3,#previewPage h4,#previewPage h5,#previewPage h6')[1];
    const scroller = document.getElementById('previewScroll');
    return heading ? heading.getBoundingClientRect().top - scroller.getBoundingClientRect().top : -999;
  });
  check('大纲跳转定位准确', offset > 0 && offset < 160, String(Math.round(offset)));
}

await page.click('.seg[data-mode="preview"]');
await page.waitForTimeout(350);
check('切换纯预览模式', (await page.getAttribute('#workspace', 'class')).includes('mode-preview'));
await page.screenshot({ path: 'ui-preview-mode.png' });
await page.click('.seg[data-mode="split"]');
await page.waitForTimeout(350);

const tabsBefore = await page.locator('.tab').count();
await page.locator('.tab.active .tab-close').click();
await page.waitForTimeout(500);
const tabsAfter = await page.locator('.tab').count();
check('关闭标签页', tabsAfter === tabsBefore - 1, `${tabsBefore} -> ${tabsAfter}`);

const downloadPromise = page.waitForEvent('download', { timeout: 6000 }).catch(() => null);
await page.click('#exportBtn');
await page.waitForSelector('.popover [data-export="html"]');
await page.click('.popover [data-export="html"]');
const download = await downloadPromise;
check('导出 HTML 触发下载', !!download, download ? download.suggestedFilename() : 'no download');

await page.reload({ waitUntil: 'load' });
await page.waitForSelector('#previewPage h1');
await page.waitForTimeout(600);
const persisted = await page.evaluate(() => localStorage.getItem('easymarkdown:workspace:v1') || '');
check('刷新后草稿保留', persisted.includes('交互测试段落'));

check('无 JS 错误', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();
const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} 通过`);
if (failed.length) {
  console.log('失败项：' + failed.map((item) => item.name).join('、'));
  process.exitCode = 1;
}
