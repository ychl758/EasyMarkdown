const {
  app,
  BrowserWindow,
  Menu,
  dialog,
  ipcMain,
  net,
  protocol,
  session,
  shell,
} = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const crypto = require('node:crypto');
const { once } = require('node:events');

const APP_ID = 'com.easymarkdown.app';
const APP_URL = 'app://bundle/EasyMarkdown.html';
const TEXT_EXT = new Set(['.md', '.markdown', '.mdown', '.txt']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'assets', '.obsidian', '.vscode']);


app.setName('EasyMarkdown');
app.setAppUserModelId(APP_ID);

if (process.env.EASYMD_USER_DATA) {
  app.setPath('userData', path.resolve(process.env.EASYMD_USER_DATA));
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

let mainWindow = null;
let workspaceRoot = '';
let initialFile = findMarkdownArg(process.argv);
let pendingUpdate = null;

/* ---------------- GitHub 更新 ---------------- */

function updateRepo() {
  const override = process.env.EASYMD_UPDATE_REPO;
  if (override && /^[^/\s]+\/[^/\s]+$/.test(override)) return override;
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(app.getAppPath(), 'package.json'), 'utf8')
    );
    const raw = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
    const match = String(raw || '').match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/i);
    if (match) return `${match[1]}/${match[2]}`;
  } catch {
    /* dev or missing package.json */
  }
  return '';
}

function versionNumbers(value) {
  return String(value || '')
    .replace(/^v/i, '')
    .split('-')[0]
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);
}

function isNewer(latest, current) {
  const a = versionNumbers(latest);
  const b = versionNumbers(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const av = a[i] || 0;
    const bv = b[i] || 0;
    if (av !== bv) return av > bv;
  }
  return false;
}

function parseLatestYml(text) {
  const version = (text.match(/^version:\s*['"]?([^'"\s]+)/m) || [])[1];
  const filePath = (text.match(/^path:\s*['"]?([^'"\r\n]+?)['"]?\s*$/m) || [])[1];
  const sha512 = (text.match(/^sha512:\s*['"]?([^'"\s]+)/m) || [])[1];
  const size = Number((text.match(/^size:\s*(\d+)/m) || [])[1] || 0);
  if (!version || !filePath) return null;
  return { version, path: path.basename(filePath.trim()), sha512, size };
}

async function fetchLatestYml(repo, currentVersion) {
  const response = await net.fetch(
    `https://github.com/${repo}/releases/latest/download/latest.yml?t=${Date.now()}`,
    {
      headers: {
        'User-Agent': `EasyMarkdown/${currentVersion}`,
        'Cache-Control': 'no-cache',
      },
    }
  );
  if (!response.ok) return null;
  return parseLatestYml(await response.text());
}

async function checkForUpdates() {
  if (process.env.EASYMD_DISABLE_UPDATE === '1') {
    return { ok: false, disabled: true };
  }

  const repo = updateRepo();
  if (!repo) {
    return { ok: false, error: '未配置更新仓库' };
  }

  const currentVersion = app.getVersion();
  const headers = {
    'User-Agent': `EasyMarkdown/${currentVersion}`,
    Accept: 'application/vnd.github+json',
  };

  let release = null;
  try {
    const response = await net.fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers,
    });
    if (response.ok) release = await response.json();
  } catch {
    /* latest.yml is enough to check the version */
  }

  let latestYml = null;
  try {
    latestYml = await fetchLatestYml(repo, currentVersion);
  } catch {
    /* fall back to the release API */
  }

  const apiVersion = release?.tag_name ? String(release.tag_name).replace(/^v/i, '') : '';
  const version = apiVersion || latestYml?.version || '';
  if (!version) {
    return { ok: false, error: '无法读取最新版本' };
  }

  if (!isNewer(version, currentVersion)) {
    return { ok: true, available: false, currentVersion, latestVersion: version };
  }

  const assets = Array.isArray(release?.assets) ? release.assets : [];
  const installer = assets.find((asset) =>
    /^EasyMarkdown-Setup-[\w.-]+\.exe$/i.test(asset.name || '')
  );
  const useYml = latestYml && latestYml.version === version;
  const fileName = (useYml ? latestYml.path : installer?.name) || '';
  const baseName = path.basename(fileName);
  if (!/^EasyMarkdown-Setup-[\w.-]+\.exe$/i.test(baseName)) {
    return { ok: false, error: '最新版本没有可用的安装包' };
  }

  const sha512 = useYml ? latestYml.sha512 || '' : '';
  const digest = installer?.digest || '';
  const sha256 = digest.startsWith('sha256:') ? digest.slice('sha256:'.length) : '';
  const downloadUrl = useYml
    ? `https://github.com/${repo}/releases/latest/download/${encodeURIComponent(baseName)}`
    : installer.browser_download_url;

  pendingUpdate = {
    version,
    fileName: baseName,
    downloadUrl,
    sha512,
    sha256,
    size: useYml ? latestYml.size : Number(installer?.size) || 0,
    releaseUrl: release?.html_url || `https://github.com/${repo}/releases/latest`,
  };

  return {
    ok: true,
    available: true,
    currentVersion,
    latestVersion: version,
    manualOnly: !!process.env.PORTABLE_EXECUTABLE_DIR || !app.isPackaged,
    releaseUrl: pendingUpdate.releaseUrl,
  };
}

async function downloadUpdate(event) {
  const info = pendingUpdate;
  if (!info || !info.downloadUrl) throw new Error('没有待下载的更新');

  const dir = path.join(app.getPath('temp'), 'EasyMarkdown-update');
  await fsp.mkdir(dir, { recursive: true });
  const target = path.join(dir, info.fileName);
  await fsp.rm(target, { force: true });

  const response = await net.fetch(info.downloadUrl, {
    headers: { 'User-Agent': `EasyMarkdown/${app.getVersion()}` },
    redirect: 'follow',
  });
  if (!response.ok || !response.body) {
    throw new Error(`下载失败（HTTP ${response.status}）`);
  }

  const total = info.size || Number(response.headers.get('content-length')) || 0;
  const sha512 = crypto.createHash('sha512');
  const sha256 = crypto.createHash('sha256');
  const output = fs.createWriteStream(target);
  const reader = response.body.getReader();
  let received = 0;
  let lastProgress = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      received += chunk.length;
      sha512.update(chunk);
      sha256.update(chunk);
      if (!output.write(chunk)) await once(output, 'drain');
      const now = Date.now();
      if (now - lastProgress > 140 && event.sender && !event.sender.isDestroyed()) {
        lastProgress = now;
        event.sender.send('app:update-progress', {
          received,
          total,
          percent: total ? Math.min(100, Math.round((received / total) * 100)) : 0,
        });
      }
    }
    await new Promise((resolve, reject) => {
      output.end(resolve);
      output.once('error', reject);
    });
  } catch (err) {
    output.destroy();
    await fsp.rm(target, { force: true });
    throw err;
  }

  if (total && received !== total) {
    await fsp.rm(target, { force: true });
    throw new Error('下载文件不完整');
  }
  const actualSha512 = sha512.digest('base64');
  const actualSha256 = sha256.digest('hex');
  if (info.sha512 && actualSha512 !== info.sha512) {
    await fsp.rm(target, { force: true });
    throw new Error('安装包校验失败');
  }
  if (!info.sha512 && info.sha256 && actualSha256 !== info.sha256) {
    await fsp.rm(target, { force: true });
    throw new Error('安装包校验失败');
  }

  info.downloadPath = target;
  if (event.sender && !event.sender.isDestroyed()) {
    event.sender.send('app:update-progress', {
      received,
      total: total || received,
      percent: 100,
    });
  }
  return { ok: true, size: received };
}

async function installUpdate() {
  const file = pendingUpdate?.downloadPath;
  if (!file || !fs.existsSync(file)) return { ok: false, error: '更新包不存在' };
  const error = await shell.openPath(file);
  if (error) return { ok: false, error };
  setTimeout(() => app.quit(), 900);
  return { ok: true };
}

async function openUpdatePage() {
  const url =
    pendingUpdate?.releaseUrl ||
    (updateRepo() ? `https://github.com/${updateRepo()}/releases/latest` : '');
  if (!url) return { ok: false };
  await shell.openExternal(url);
  return { ok: true };
}

/* ---------------- workspace / fs helpers ---------------- */

function configPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), 'utf8'));
  } catch {
    return {};
  }
}

function writeConfig() {
  try {
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    fs.writeFileSync(
      configPath(),
      JSON.stringify({ workspaceRoot, updatedAt: new Date().toISOString() }, null, 2),
      'utf8'
    );
  } catch {
    /* non-fatal */
  }
}

function isDirectory(target) {
  try {
    return fs.statSync(target).isDirectory();
  } catch {
    return false;
  }
}

function isMarkdownFile(target) {
  try {
    return fs.statSync(target).isFile() && TEXT_EXT.has(path.extname(target).toLowerCase());
  } catch {
    return false;
  }
}

function findMarkdownArg(argv) {
  for (const arg of argv || []) {
    if (!arg || arg.startsWith('-')) continue;
    if (isMarkdownFile(arg)) return path.resolve(arg);
  }
  return null;
}



async function ensureRoot() {
  let root = process.env.EASYMD_WORKSPACE
    ? path.resolve(process.env.EASYMD_WORKSPACE)
    : readConfig().workspaceRoot || '';

  if (!root) {
    root = path.join(app.getPath('documents'), 'EasyMarkdown');
  } else if (!process.env.EASYMD_WORKSPACE && !isDirectory(root)) {
    root = path.join(app.getPath('documents'), 'EasyMarkdown');
  }

  await fsp.mkdir(root, { recursive: true });
  workspaceRoot = root;
  writeConfig();
  return root;
}

function ensureInsideRoot(target) {
  if (!workspaceRoot) throw new Error('workspace not ready');
  const root = path.resolve(workspaceRoot);
  const resolved = path.resolve(target);
  const relative = path.relative(root, resolved);
  if (relative !== '' && (relative.startsWith('..') || path.isAbsolute(relative))) {
    throw new Error('path outside workspace');
  }
  return resolved;
}

function buildTreeSync(root) {
  const walk = (dir) => {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return [];
    }
    const folders = [];
    const files = [];

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        folders.push({
          type: 'folder',
          id: full,
          path: full,
          name: entry.name,
          open: true,
          children: walk(full),
        });
      } else if (entry.isFile() && TEXT_EXT.has(path.extname(entry.name).toLowerCase())) {
        let content = '';
        let tooLarge = false;
        try {
          const stat = fs.statSync(full);
          if (stat.size <= 2 * 1024 * 1024) {
            content = fs.readFileSync(full, 'utf8');
          } else {
            tooLarge = true;
          }
        } catch {
          content = '';
        }
        files.push({
          type: 'file',
          id: full,
          path: full,
          name: entry.name,
          content,
          tooLarge,
        });
      }
    }

    folders.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    files.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    return [...folders, ...files];
  };

  return walk(root);
}

function readWorkspaceSync() {
  if (!workspaceRoot) throw new Error('workspace not ready');
  return {
    root: workspaceRoot,
    name: path.basename(workspaceRoot),
    tree: buildTreeSync(workspaceRoot),
  };
}

function uniquePath(dir, name) {
  const safeName = path.basename(name).replace(/[\\/:*?"<>|]/g, '-').trim() || '未命名.md';
  const ext = path.extname(safeName);
  const base = ext ? safeName.slice(0, -ext.length) : safeName;
  let candidate = ext ? safeName : `${safeName}.md`;
  let index = 2;

  while (fs.existsSync(path.join(dir, candidate))) {
    candidate = `${base} (${index})${ext || '.md'}`;
    index += 1;
  }
  return candidate;
}

function writeFileAtomic(target, content) {
  const temp = `${target}.em-tmp-${process.pid}`;
  fs.writeFileSync(temp, content, 'utf8');
  try {
    fs.renameSync(temp, target);
  } catch {
    fs.writeFileSync(target, content, 'utf8');
    try {
      fs.unlinkSync(temp);
    } catch {
      /* ignore */
    }
  }
}

function mimeFor(ext) {
  const map = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.avif': 'image/avif',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

/* ---------------- window ---------------- */

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#050a12',
    title: 'EasyMarkdown',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadURL(APP_URL);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?:|mailto:)/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('app://bundle/')) {
      event.preventDefault();
      if (/^(https?:|mailto:)/i.test(url)) shell.openExternal(url);
    }
  });

  mainWindow.webContents.on('context-menu', (event, params) => {
    if (!params.isEditable && !params.selectionText) return;
    const menu = Menu.buildFromTemplate([
      { label: '复制', role: 'copy', enabled: params.editFlags.canCopy || !!params.selectionText },
      { label: '粘贴', role: 'paste', enabled: params.editFlags.canPaste },
      { label: '全选', role: 'selectAll' },
    ]);
    menu.popup({ window: mainWindow });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupDownloads() {
  session.defaultSession.on('will-download', async (event, item) => {
    const win = BrowserWindow.getFocusedWindow() || mainWindow;
    const defaultPath = path.join(app.getPath('downloads'), item.getFilename());
    try {
      item.pause();
      const result = await dialog.showSaveDialog(win, {
        title: '保存文件',
        defaultPath,
      });
      if (result.canceled || !result.filePath) {
        item.cancel();
        return;
      }
      item.setSavePath(result.filePath);
      item.resume();
    } catch {
      item.setSavePath(defaultPath);
      item.resume();
    }
  });
}

/* ---------------- IPC ---------------- */

function registerIpc() {
  ipcMain.handle('update:check', async () => {
    try {
      return await checkForUpdates();
    } catch (err) {
      return { ok: false, error: err.message || '检查更新失败' };
    }
  });

  ipcMain.handle('update:download', async (event) => {
    try {
      return await downloadUpdate(event);
    } catch (err) {
      return { ok: false, error: err.message || '下载更新失败' };
    }
  });

  ipcMain.handle('update:install', async () => installUpdate());
  ipcMain.handle('update:open-release', async () => openUpdatePage());

  ipcMain.handle('workspace:init', async () => {
    let openPath = null;

    if (initialFile && isMarkdownFile(initialFile)) {
      workspaceRoot = path.dirname(initialFile);
      await fsp.mkdir(workspaceRoot, { recursive: true });
      writeConfig();
      openPath = initialFile;
      initialFile = null;
    } else {
      await ensureRoot();
    }

    return { ...readWorkspaceSync(), openPath };
  });

  ipcMain.handle('workspace:choose', async () => {
    const win = BrowserWindow.getFocusedWindow() || mainWindow;
    const result = await dialog.showOpenDialog(win, {
      title: '选择工作区文件夹',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || !result.filePaths.length) return null;

    workspaceRoot = result.filePaths[0];
    writeConfig();
    return readWorkspaceSync();
  });

  ipcMain.handle('workspace:refresh', async () => readWorkspaceSync());

  ipcMain.handle('workspace:open-path', async (event, filePath) => {
    if (!isMarkdownFile(filePath)) throw new Error('invalid file');
    workspaceRoot = path.dirname(path.resolve(filePath));
    writeConfig();
    return { ...readWorkspaceSync(), openPath: path.resolve(filePath) };
  });

  ipcMain.handle('workspace:reveal', async () => {
    if (!workspaceRoot) return false;
    const result = await shell.openPath(workspaceRoot);
    return result === '';
  });

  ipcMain.on('workspace:read-sync', (event) => {
    try {
      event.returnValue = { ok: true, ...readWorkspaceSync() };
    } catch (err) {
      event.returnValue = { ok: false, error: err.message };
    }
  });

  ipcMain.on('file:write-sync', (event, filePath, content) => {
    try {
      const target = ensureInsideRoot(filePath);
      writeFileAtomic(target, String(content ?? ''));
      event.returnValue = { ok: true };
    } catch (err) {
      event.returnValue = { ok: false, error: err.message };
    }
  });

  ipcMain.on('file:create-sync', (event, parent, name, content) => {
    try {
      const dir = ensureInsideRoot(parent || workspaceRoot);
      if (!isDirectory(dir)) throw new Error('parent is not a folder');
      const finalName = uniquePath(dir, name || '未命名.md');
      const target = ensureInsideRoot(path.join(dir, finalName));
      fs.writeFileSync(target, String(content ?? ''), 'utf8');
      event.returnValue = { ok: true, path: target, name: finalName };
    } catch (err) {
      event.returnValue = { ok: false, error: err.message };
    }
  });

  ipcMain.on('file:rename-sync', (event, filePath, newName) => {
    try {
      const source = ensureInsideRoot(filePath);
      const dir = path.dirname(source);
      const finalName = uniquePath(dir, newName);
      const target = ensureInsideRoot(path.join(dir, finalName));
      fs.renameSync(source, target);
      event.returnValue = { ok: true, path: target, name: finalName };
    } catch (err) {
      event.returnValue = { ok: false, error: err.message };
    }
  });

  ipcMain.on('file:delete-sync', (event, filePath) => {
    try {
      const target = ensureInsideRoot(filePath);
      fs.rmSync(target, { recursive: true, force: true });
      event.returnValue = { ok: true };
    } catch (err) {
      event.returnValue = { ok: false, error: err.message };
    }
  });

  ipcMain.on('asset:save-sync', (event, dataUrl, ext) => {
    try {
      const match = String(dataUrl).match(/^data:image\/[a-z0-9.+-]+;base64,(.+)$/i);
      if (!match) throw new Error('invalid image data');
      const safeExt = String(ext || 'png').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'png';
      const assetsDir = path.join(workspaceRoot, 'assets');
      fs.mkdirSync(assetsDir, { recursive: true });
      const fileName = `img-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 6)}.${safeExt}`;
      const target = path.join(assetsDir, fileName);
      fs.writeFileSync(target, Buffer.from(match[1], 'base64'));
      event.returnValue = { ok: true, path: `assets/${fileName}` };
    } catch (err) {
      event.returnValue = { ok: false, error: err.message };
    }
  });

  ipcMain.on('asset:read-sync', (event, relativePath) => {
    try {
      const target = ensureInsideRoot(path.join(workspaceRoot, relativePath));
      const stat = fs.statSync(target);
      if (stat.size > 20 * 1024 * 1024) throw new Error('asset too large');
      const data = fs.readFileSync(target);
      const mime = mimeFor(path.extname(target));
      event.returnValue = {
        ok: true,
        dataUrl: `data:${mime};base64,${data.toString('base64')}`,
      };
    } catch (err) {
      event.returnValue = { ok: false, error: err.message };
    }
  });
}

/* ---------------- app lifecycle ---------------- */

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', async (event, argv) => {
    const file = findMarkdownArg(argv);
    if (file && isMarkdownFile(file)) {
      workspaceRoot = path.dirname(file);
      writeConfig();
      if (mainWindow) {
        const payload = { ...readWorkspaceSync(), openPath: file };
        mainWindow.webContents.send('app:workspace', payload);
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
      return;
    }
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);

    const htmlPath = path.join(__dirname, '..', 'dist', 'EasyMarkdown.html');
    let htmlBuffer;
    try {
      htmlBuffer = await fsp.readFile(htmlPath);
    } catch {
      dialog.showErrorBox(
        'EasyMarkdown 启动失败',
        `找不到应用文件：\n${htmlPath}\n\n请先运行 npm run build。`
      );
      app.quit();
      return;
    }

    protocol.handle('app', (request) => {
      const url = new URL(request.url);
      if (url.pathname === '/EasyMarkdown.html' || url.pathname === '/') {
        return new Response(htmlBuffer, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      return new Response('Not found', { status: 404 });
    });

    setupDownloads();
    registerIpc();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
