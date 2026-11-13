import { _electron as electron } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('.');
const ELECTRON = path.join(ROOT, 'node_modules/electron/dist/electron.exe');

async function launch(userData, workspace) {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  env.EASYMD_USER_DATA = userData;
  env.EASYMD_WORKSPACE = workspace;
  env.EASYMD_DISABLE_UPDATE = '1';
  const app = await electron.launch({ executablePath: ELECTRON, args: ['.'], cwd: ROOT, env });
  const page = await app.firstWindow();
  return { app, page };
}

const UD1 = path.join(ROOT, '.fixtures/final-userdata');
const WS1 = path.join(ROOT, '.fixtures/final-workspace');
const UD2 = path.join(ROOT, '.fixtures/empty-userdata');
const WS2 = path.join(ROOT, '.fixtures/empty-workspace');
for (const dir of [UD1, WS1, UD2, WS2]) fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(WS1, { recursive: true });
fs.writeFileSync(
  path.join(WS1, '欢迎.md'),
  `# 我的工作区

这是自己的文件夹，左侧树来自磁盘。

## 今天要做的事

- [x] 建一个工作区
- [x] 写第一篇文档
- [ ] 导出一份 HTML

| 文件 | 状态 |
| --- | --- |
| 欢迎.md | 正在编辑 |
| 流程图.md | 已完成 |

\`\`\`js
const editor = 'EasyMarkdown';
console.log(editor);
\`\`\`

> 写作是把思绪摊开的过程。
`,
  'utf8'
);
fs.writeFileSync(
  path.join(WS1, '流程图.md'),
  `# 流程图

Mermaid 代码块会直接渲染。

\`\`\`mermaid
flowchart LR
  A[打开文件夹] --> B{有文件?}
  B -->|有| C[直接编辑]
  B -->|没有| D[新建文件]
  C --> E[Ctrl+S 保存]
  D --> E
\`\`\`

\`\`\`mermaid
sequenceDiagram
  participant U as 用户
  participant E as EasyMarkdown
  U->>E: 输入 Markdown
  E-->>U: 实时预览
\`\`\`
`,
  'utf8'
);

let { app, page } = await launch(UD1, WS1);
await page.waitForSelector('#previewPage h1', { timeout: 30000 });
await page.waitForTimeout(900);
console.log('DEMO_COUNT:', await page.locator('.tree-row.file', { hasText: '开始使用' }).count());
await page.screenshot({ path: 'screenshots/v5-final-welcome.png' });
await page.locator('.tree-row.file', { hasText: '流程图.md' }).click();
await page.waitForSelector('#previewPage .mermaid-block svg', { timeout: 20000 });
await page.waitForTimeout(600);
await page.screenshot({ path: 'screenshots/v5-final-diagrams.png' });
await page.keyboard.press('Control+P');
await page.waitForSelector('#paletteOverlay');
await page.waitForTimeout(300);
await page.screenshot({ path: 'screenshots/v5-final-palette.png' });
await app.close();

({ app, page } = await launch(UD2, WS2));
await page.waitForSelector('#emptyState', { timeout: 30000 });
await page.waitForTimeout(700);
await page.screenshot({ path: 'screenshots/v5-final-empty.png' });
await app.close();
console.log('final shots ready');
