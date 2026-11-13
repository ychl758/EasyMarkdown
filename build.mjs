import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'dist');
const outFile = path.join(outDir, 'EasyMarkdown.html');
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));

await build({
  entryPoints: [path.join(root, 'src/editor-entry.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome110'],
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"' },
  outfile: path.join(root, 'src/vendor.js'),
  logLevel: 'info',
});

const [html, css, app, vendor, mermaid, interFont] = await Promise.all([
  readFile(path.join(root, 'src/index.html'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'src/app.js'), 'utf8'),
  readFile(path.join(root, 'src/vendor.js'), 'utf8'),
  readFile(path.join(root, 'node_modules/mermaid/dist/mermaid.min.js'), 'utf8'),
  readFile(
    path.join(
      root,
      'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'
    )
  ),
]);

const safeScript = (code) => code.replace(/<\/script/gi, '<\\/script');
const mermaidCode = mermaid.replace(/\/\/# sourceMappingURL=.*$/gm, '');
const interB64 = interFont.toString('base64');

const output = html
  .split('/*__STYLES__*/').join(css)
  .split('/*__MERMAID__*/').join(safeScript(mermaidCode))
  .split('/*__VENDOR__*/').join(safeScript(vendor))
  .split('/*__APP__*/').join(safeScript(app))
  .split('__APP_VERSION__').join(pkg.version)
  .split('__INTER_WOFF2__').join(interB64);

await mkdir(outDir, { recursive: true });
await writeFile(outFile, output, 'utf8');

const mb = (Buffer.byteLength(output, 'utf8') / 1024 / 1024).toFixed(2);
console.log(`\n✓ 已生成单文件应用: ${outFile}`);
console.log(`  大小: ${mb} MB`);
