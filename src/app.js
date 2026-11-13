/* EasyMarkdown · 应用交互层 */
(() => {
  'use strict';

  const { createEditor, renderMarkdown } = window.EasyMarkdownKit;

  const VERSION = '0.5.0';
  const KEY_WORKSPACE = 'easymarkdown:workspace:v1';
  const KEY_ASSETS = 'easymarkdown:assets:v1';
  const KEY_TABS = 'easymarkdown:tabs:v1';
  const KEY_THEME = 'easymarkdown:theme';
  const KEY_MODE = 'easymarkdown:mode';
  const KEY_SPLIT = 'easymarkdown:split';
  const KEY_PREVIEW_SIZE = 'easymarkdown:previewSize';
  const KEY_SIDEBAR = 'easymarkdown:sidebar';
  const KEY_SIDEBAR_TAB = 'easymarkdown:sidebarTab';
  const KEY_VISITED = 'easymarkdown:visited';
  const KEY_FOLDERS = 'easymarkdown:folderState';
  const KEY_UPDATE_SKIP = 'easymarkdown:updateSkipped';

  const desktop =
    window.easyMarkdown && window.easyMarkdown.isDesktop ? window.easyMarkdown : null;

  const CALLOUT_LABELS = {
    note: '提示',
    tip: '技巧',
    important: '重要',
    warning: '注意',
    caution: '警告',
  };

  /* ---------------- 基础工具 ---------------- */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[ch]));

  const uid = () =>
    window.crypto && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const storage = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (err) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (err) {
        return false;
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (err) {
        /* ignore */
      }
    },
  };

  const mql = window.matchMedia('(max-width: 820px)');
  const isMobile = () => mql.matches;

  /* ---------------- 图标 ---------------- */

  const ICONS = {
    file: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5.6 3.4h5.5l3.3 3.3v9.9H5.6z"/><path d="M11.1 3.4v3.3h3.3"/></svg>',
    folder: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6.2A1.4 1.4 0 0 1 4.4 4.8H8l1.5 2h5.9a1.4 1.4 0 0 1 1.4 1.4v5.9a1.4 1.4 0 0 1-1.4 1.4H4.4A1.4 1.4 0 0 1 3 14.1z"/></svg>',
    chevron: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 5 5 5-5 5"/></svg>',
    more: '<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="5" cy="10" r="1.25"/><circle cx="10" cy="10" r="1.25"/><circle cx="15" cy="10" r="1.25"/></svg>',
    close: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="m6 6 8 8M14 6l-8 8"/></svg>',
    plus: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M10 4.2v11.6M4.2 10h11.6"/></svg>',
    search: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="9" cy="9" r="4.5"/><path d="m12.6 12.6 3.4 3.4"/></svg>',
    open: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H8l1.5 2h6A1.5 1.5 0 0 1 17 8.5v6a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5z"/></svg>',
    theme: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="10" cy="10" r="3.3"/><path d="M10 2.2v1.8M10 16v1.8M2.2 10H4M16 10h1.8M4.5 4.5l1.3 1.3M14.2 14.2l1.3 1.3M15.5 4.5l-1.3 1.3M5.8 14.2l-1.3 1.3"/></svg>',
    html: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="14" height="12" rx="2"/><path d="m8.2 8-2 2 2 2M11.8 8l2 2-2 2"/></svg>',
    pdf: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5.6 3.4h5.5l3.3 3.3v9.9H5.6z"/><path d="M11.1 3.4v3.3h3.3M8 12.5h4"/></svg>',
    download: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5v8.5M6.7 8.8 10 12.1l3.3-3.3M4 14v2.2h12V14"/></svg>',
    panel: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="4" width="14" height="12" rx="2"/><path d="M7.6 4v12"/></svg>',
    split: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="4" width="14" height="12" rx="2"/><path d="M10 4v12"/></svg>',
    editor: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12.6 3.8 16.2 7.4 7.6 16l-4.1.7.7-4.1z"/><path d="m11.1 5.3 3.6 3.6"/></svg>',
    preview: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 10s2.8-4.5 7.5-4.5 7.5 4.5 7.5 4.5-2.8 4.5-7.5 4.5S2.5 10 2.5 10Z"/><circle cx="10" cy="10" r="2.2"/></svg>',
    keyboard: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="15" height="10" rx="2"/><path d="M5.2 8h.01M8 8h.01M10.8 8h.01M13.6 8h.01M5.2 11h.01M8 11h.01M10.8 11h.01M13.6 11h.01M6.6 13.4h6.8"/></svg>',
    reset: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.2 8.2A6.3 6.3 0 1 1 4 12.6"/><path d="M4.2 4.2v4h4"/></svg>',
    trash: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 6h11M8 6V4.2h4V6M6 6l.7 10.2h6.6L14 6"/><path d="M8.5 9v4.5M11.5 9v4.5"/></svg>',
    rename: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15.8h4.4L16 8.2a2 2 0 0 0-2.8-2.8L5.7 13z"/><path d="m12.2 6.4 2.8 2.8"/></svg>',
  };

  /* ---------------- 示例数据 ---------------- */

  const DEFAULT_TREE = [
    { type: 'file', id: 'welcome', name: '开始使用.md' },
    { type: 'file', id: 'syntax', name: 'Markdown 语法速查.md' },
    { type: 'file', id: 'diagrams', name: '流程图与图表.md' },
    { type: 'file', id: 'thoughts', name: '产品随想.md' },
    {
      type: 'folder',
      id: 'folder-notes',
      name: 'notes',
      open: true,
      children: [
        { type: 'file', id: 'meeting', name: '会议记录.md' },
        { type: 'file', id: 'ideas', name: '灵感碎片.md' },
      ],
    },
    {
      type: 'folder',
      id: 'folder-docs',
      name: 'docs',
      open: false,
      children: [
        { type: 'file', id: 'design', name: '设计规范.md' },
        { type: 'file', id: 'release', name: '发布说明.md' },
      ],
    },
  ];

  /* ---------------- 全局状态 ---------------- */

  const state = {
    tree: [],
    assets: {},
    openTabs: [],
    activeId: null,
    mode: 'split',
    theme: 'dark',
    sidebarTab: 'files',
    splitPct: 50,
    previewSize: 16,
    filter: '',
    outline: [],
    activeHeading: 0,
    dirtyIds: new Set(),
    editorStates: new Map(),
    editorScrolls: new Map(),
    previewScrolls: new Map(),
    diskMode: !!desktop,
    workspaceRoot: '',
    workspaceName: '我的文档',
  };

  let editor = null;
  let switching = false;
  let previewEdit = null;
  let updateBanner = null;
  let updateInfo = null;
  let updateBusy = false;
  let saveTimer = null;
  let previewTimer = null;
  let mermaidPromise = Promise.resolve();
  let mermaidToken = 0;
  let popoverEl = null;
  let paletteEl = null;
  let paletteResults = [];
  let paletteActive = 0;
  let dragDepth = 0;

  /* ---------------- DOM ---------------- */

  const dom = {
    app: $('#app'),
    workspace: $('#workspace'),
    workspaceName: $('#workspaceName'),
    workspaceBtn: $('#workspaceBtn'),
    sidebar: $('#sidebar'),
    sidebarBackdrop: $('#sidebarBackdrop'),
    tree: $('#tree'),
    filterInput: $('#filterInput'),
    sidebarFiles: $('#sidebarFiles'),
    sidebarOutline: $('#sidebarOutline'),
    outline: $('#outline'),
    sidebarFoot: $('#sidebarFoot'),
    tabs: $('#tabs'),
    modeSwitch: $('#modeSwitch'),
    editorBar: $('#editorBar'),
    editorHost: $('#editorHost'),
    previewScroll: $('#previewScroll'),
    previewPage: $('#previewPage'),
    previewLabel: $('#previewLabel'),
    previewEditHint: $('#previewEditHint'),
    splitter: $('#splitter'),
    statusFile: $('#statusFile'),
    statusCursor: $('#statusCursor'),
    statusWords: $('#statusWords'),
    statusLines: $('#statusLines'),
    saveState: $('#saveState'),
    saveText: $('#saveText'),
    toastWrap: $('#toastWrap'),
    fileInput: $('#fileInput'),
    imageInput: $('#imageInput'),
    themeBtn: $('#themeBtn'),
    helpBtn: $('#helpBtn'),
    openBtn: $('#openBtn'),
    exportBtn: $('#exportBtn'),
    newFileBtn: $('#newFileBtn'),
    sidebarToggle: $('#sidebarToggle'),
    searchPill: $('#searchPill'),
    fontMinus: $('#fontMinus'),
    fontPlus: $('#fontPlus'),
    fontSizeLabel: $('#fontSizeLabel'),
    emptyNewBtn: $('#emptyNewBtn'),
    emptyOpenBtn: $('#emptyOpenBtn'),
  };

  /* ---------------- 数据读取 / 校验 ---------------- */

  function readDemoFiles() {
    const out = {};
    $$('script[type="text/markdown"][id^="demo-"]').forEach((el) => {
      const id = el.id.slice(5);
      out[id] = {
        name: el.dataset.name || `${id}.md`,
        content: el.textContent.replace(/^\n/, ''),
      };
    });
    return out;
  }

  function buildDemoWorkspace() {
    const contents = readDemoFiles();
    const tree = structuredClone(DEFAULT_TREE);
    walkNodes(tree, (node) => {
      if (node.type === 'file') {
        node.content = contents[node.id] ? contents[node.id].content : '';
      }
    });
    return tree;
  }

  function normalizeTree(tree) {
    if (!Array.isArray(tree)) return null;
    let valid = true;
    const walk = (nodes) => {
      for (const node of nodes) {
        if (!node || typeof node !== 'object') {
          valid = false;
          continue;
        }
        if (node.type === 'folder') {
          if (typeof node.id !== 'string') node.id = uid();
          if (typeof node.name !== 'string') node.name = '未命名文件夹';
          if (!Array.isArray(node.children)) node.children = [];
          node.open = !!node.open;
          walk(node.children);
        } else if (node.type === 'file') {
          if (typeof node.id !== 'string') node.id = uid();
          if (typeof node.name !== 'string') node.name = '未命名.md';
          if (typeof node.content !== 'string') node.content = '';
        } else {
          valid = false;
        }
      }
    };
    walk(tree);
    return valid ? tree : null;
  }

  const DEMO_FILE_IDS = new Set([
    'welcome',
    'syntax',
    'diagrams',
    'thoughts',
    'meeting',
    'ideas',
    'design',
    'release',
  ]);

  function stripDemoNodes(nodes) {
    const out = [];
    for (const node of nodes || []) {
      if (node.type === 'file') {
        if (!DEMO_FILE_IDS.has(node.id)) out.push(node);
      } else if (node.type === 'folder') {
        node.children = stripDemoNodes(node.children || []);
        if (node.children.length) out.push(node);
      }
    }
    return out;
  }

  function loadWorkspace() {
    const saved = normalizeTree(storage.get(KEY_WORKSPACE, null));
    if (!saved) return [];
    return stripDemoNodes(saved);
  }

  function applyFolderState(tree) {
    if (!state.diskMode) return tree;
    const saved = storage.get(KEY_FOLDERS, {});
    walkNodes(tree, (node) => {
      if (node.type === 'folder') {
        node.open = typeof saved[node.id] === 'boolean' ? saved[node.id] : true;
      }
    });
    return tree;
  }

  function applyWorkspace(ws) {
    state.diskMode = true;
    state.workspaceRoot = ws.root || '';
    state.workspaceName = ws.name || '工作区';
    state.tree = applyFolderState(ws.tree || []);
    if (dom.workspaceName) dom.workspaceName.textContent = state.workspaceName;
    if (dom.workspaceBtn) dom.workspaceBtn.title = `切换工作区：${state.workspaceName}`;
  }

  function reloadWorkspaceTree() {
    if (!state.diskMode) return true;
    const result = desktop.refreshWorkspace();
    if (!result || !result.ok) {
      toast('刷新工作区失败');
      return false;
    }
    state.workspaceRoot = result.root;
    state.workspaceName = result.name;
    state.tree = applyFolderState(result.tree);
    if (dom.workspaceName) dom.workspaceName.textContent = result.name;
    state.openTabs = state.openTabs.filter((id) => findFile(id));
    renderTree();
    updateFileCount();
    return true;
  }

  function flushActiveFileToDisk() {
    if (previewEdit) commitPreviewEdit({ render: false });
    if (!state.diskMode || !state.activeId) return true;
    const file = activeFile();
    if (!file) return true;
    if (!state.dirtyIds.has(file.id)) return true;
    const result = desktop.writeFile(file.id, file.content);
    if (!result || !result.ok) {
      setSaveStatus('error');
      toast('写入磁盘失败');
      return false;
    }
    state.dirtyIds.delete(file.id);
    return true;
  }

  function resetEmptyEditor() {
    state.openTabs = [];
    state.activeId = null;
    state.editorStates.clear();
    state.editorScrolls.clear();
    state.previewScrolls.clear();
    state.dirtyIds.clear();
    if (editor) {
      editor.setState(editor.makeState(''));
    }
    renderTabs();
    renderTree();
    updateStatusFile();
    updateWordCount();
    renderPreview({ preserveScroll: false });
    setSaveStatus('saved');
  }

  async function chooseWorkspaceFlow() {
    if (!desktop) {
      toast('桌面版支持切换工作区文件夹');
      return;
    }
    flushActiveFileToDisk();
    const ws = await desktop.chooseWorkspace();
    if (!ws) return;
    state.diskMode = true;
    state.openTabs = [];
    state.activeId = null;
    state.editorStates.clear();
    state.editorScrolls.clear();
    state.previewScrolls.clear();
    state.dirtyIds.clear();
    applyWorkspace(ws);
    renderTree();
    renderTabs();
    updateFileCount();
    const files = walkFiles(state.tree);
    if (files.length) openFile(files[0].id);
    else resetEmptyEditor();
    setSaveStatus('saved');
    toast(`已打开 ${ws.name}`);
  }

  function handleWorkspacePayload(payload) {
    if (!payload || !payload.tree) return;
    flushActiveFileToDisk();
    state.openTabs = [];
    state.activeId = null;
    state.editorStates.clear();
    state.editorScrolls.clear();
    state.previewScrolls.clear();
    state.dirtyIds.clear();
    applyWorkspace(payload);
    renderTree();
    renderTabs();
    updateFileCount();
    if (payload.openPath && findFile(payload.openPath)) openFile(payload.openPath);
    else {
      const files = walkFiles(state.tree);
      if (files.length) openFile(files[0].id);
      else resetEmptyEditor();
    }
    toast(`已打开 ${state.workspaceName}`);
  }

  function refreshWorkspaceNow() {
    if (!state.diskMode) return;
    flushActiveFileToDisk();
    const activeId = state.activeId;
    const previousScroll = dom.previewScroll.scrollTop;
    const result = desktop.refreshWorkspace();
    if (!result || !result.ok) {
      toast('刷新工作区失败');
      return;
    }
    state.workspaceRoot = result.root;
    state.workspaceName = result.name;
    state.tree = applyFolderState(result.tree);
    if (dom.workspaceName) dom.workspaceName.textContent = result.name;
    state.openTabs = state.openTabs.filter((id) => findFile(id));
    renderTree();
    updateFileCount();

    if (activeId && findFile(activeId)) {
      if (!state.dirtyIds.has(activeId) && editor) {
        const file = findFile(activeId);
        state.editorStates.delete(activeId);
        editor.setState(editor.makeState(file.content));
        renderPreview({ preserveScroll: true });
        dom.previewScroll.scrollTop = previousScroll;
      }
      renderTabs();
      updateStatusFile();
      updateWordCount();
    } else {
      const next = state.openTabs[0] || walkFiles(state.tree)[0]?.id;
      if (next) openFile(next);
      else resetEmptyEditor();
    }
    toast('工作区已刷新');
  }

  function walkNodes(nodes, fn) {
    for (const node of nodes || []) {
      fn(node);
      if (node.type === 'folder') walkNodes(node.children || [], fn);
    }
  }

  function walkFiles(nodes = state.tree) {
    const out = [];
    walkNodes(nodes, (node) => {
      if (node.type === 'file') out.push(node);
    });
    return out;
  }

  function findFile(id, nodes = state.tree) {
    for (const node of nodes || []) {
      if (node.type === 'file' && node.id === id) return node;
      if (node.type === 'folder') {
        const found = findFile(id, node.children || []);
        if (found) return found;
      }
    }
    return null;
  }

  function findNodeWithParent(id, nodes = state.tree, parent = null) {
    for (const node of nodes || []) {
      if (node.id === id) return { node, parent, list: nodes };
      if (node.type === 'folder') {
        const found = findNodeWithParent(id, node.children || [], node);
        if (found) return found;
      }
    }
    return null;
  }

  function activeFile() {
    return state.activeId ? findFile(state.activeId) : null;
  }

  function countWords(text) {
    const cjkRe = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g;
    const cjk = (text.match(cjkRe) || []).length;
    const rest = text.replace(cjkRe, ' ');
    const words = (rest.match(/[A-Za-z0-9_]+(?:['’-][A-Za-z0-9_]+)*/g) || []).length;
    return cjk + words;
  }

  function uniqueName(name, ignoreId = null) {
    const existing = new Set(
      walkFiles(state.tree)
        .filter((file) => file.id !== ignoreId)
        .map((file) => file.name.toLowerCase())
    );
    if (!existing.has(name.toLowerCase())) return name;
    const dot = name.lastIndexOf('.');
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    let index = 2;
    let candidate = `${base} (${index})${ext}`;
    while (existing.has(candidate.toLowerCase())) {
      index += 1;
      candidate = `${base} (${index})${ext}`;
    }
    return candidate;
  }

  /* ---------------- 主题 / 视图 ---------------- */

  function resolveTheme() {
    const param = new URLSearchParams(location.search).get('theme');
    if (param === 'dark' || param === 'light') return param;
    const saved = storage.get(KEY_THEME, null);
    if (saved === 'dark' || saved === 'light') return saved;
    return 'dark';
  }

  function resolveMode() {
    const param = new URLSearchParams(location.search).get('mode');
    let mode = param || storage.get(KEY_MODE, 'split');
    if (!['split', 'editor', 'preview', 'preview-edit'].includes(mode)) mode = 'split';
    if (isMobile() && mode === 'split') mode = 'editor';
    return mode;
  }

  function setTheme(theme) {
    if (previewEdit) commitPreviewEdit({ render: false });
    state.theme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = state.theme;
    storage.set(KEY_THEME, state.theme);
    if (state.activeId && dom.previewPage) {
      renderPreview({ preserveScroll: true });
    }
  }

  function toggleTheme() {
    setTheme(state.theme === 'dark' ? 'light' : 'dark');
  }

  function setMode(mode, { persist = true, focus = true } = {}) {
    if (isMobile() && mode === 'split') mode = 'editor';
    if (!['split', 'editor', 'preview', 'preview-edit'].includes(mode)) mode = 'split';
    if (previewEdit) commitPreviewEdit({ render: false });
    state.mode = mode;
    dom.workspace.classList.remove(
      'mode-split',
      'mode-editor',
      'mode-preview',
      'mode-preview-edit'
    );
    dom.workspace.classList.add(`mode-${mode}`);
    if (dom.previewLabel) {
      dom.previewLabel.textContent = mode === 'preview-edit' ? '预览编辑' : '预览';
    }
    $$('.seg', dom.modeSwitch).forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    if (persist) storage.set(KEY_MODE, mode);
    requestAnimationFrame(() => {
      if (editor) editor.requestMeasure();
      if (focus && mode !== 'preview' && mode !== 'preview-edit' && !isMobile() && editor) {
        editor.focus();
      }
    });
    if (mode !== 'editor' && state.activeId) {
      renderPreview({ preserveScroll: true });
    }
  }

  function applyPreviewSize() {
    dom.previewPage.style.setProperty('--preview-size', `${state.previewSize}px`);
    dom.fontSizeLabel.textContent = `${Math.round((state.previewSize / 16) * 100)}%`;
  }

  function setPreviewSize(px) {
    state.previewSize = clamp(px, 14, 20);
    applyPreviewSize();
    storage.set(KEY_PREVIEW_SIZE, state.previewSize);
  }

  function toggleSidebar() {
    if (isMobile()) {
      dom.app.classList.toggle('sidebar-open');
    } else {
      dom.app.classList.toggle('sidebar-collapsed');
      storage.set(KEY_SIDEBAR, dom.app.classList.contains('sidebar-collapsed'));
    }
    setTimeout(() => {
      if (editor) editor.requestMeasure();
    }, 240);
  }

  function closeMobileSidebar() {
    dom.app.classList.remove('sidebar-open');
  }

  /* ---------------- 标签页 ---------------- */

  function readTabs() {
    if (state.diskMode) {
      const saved = storage.get(KEY_TABS, null);
      let open =
        saved && Array.isArray(saved.open)
          ? saved.open.filter((id) => findFile(id))
          : [];
      const files = walkFiles(state.tree);
      if (!open.length) {
        const welcome = files.find((file) => file.name === '开始使用.md') || files[0];
        if (welcome) open = [welcome.id];
      }
      let active =
        saved && saved.active && findFile(saved.active) ? saved.active : open[0] || null;
      if (active && !open.includes(active)) open.push(active);
      state.openTabs = open;
      state.activeId = active;
      return;
    }

    if (!walkFiles(state.tree).length) {
      state.openTabs = [];
      state.activeId = null;
      return;
    }
    const saved = storage.get(KEY_TABS, null);
    let open = saved && Array.isArray(saved.open)
      ? saved.open.filter((id) => findFile(id))
      : [];
    let active = saved && saved.active && findFile(saved.active) ? saved.active : null;
    if (!open.length) {
      open = ['welcome', 'syntax'].filter((id) => findFile(id));
      if (!open.length) open = walkFiles(state.tree).slice(0, 2).map((file) => file.id);
    }
    if (!open.includes(active)) active = open[0];
    state.openTabs = open;
    state.activeId = active;
  }

  function saveTabs() {
    storage.set(KEY_TABS, { open: state.openTabs, active: state.activeId });
  }

  function renderTabs() {
    dom.tabs.innerHTML = state.openTabs
      .map((id) => {
        const file = findFile(id);
        if (!file) return '';
        const isActive = id === state.activeId;
        const dirty = state.dirtyIds.has(id);
        return `<div class="tab${isActive ? ' active' : ''}${dirty ? ' dirty' : ''}" data-tab="${id}" title="${escapeHtml(file.name)}">
          <span class="tab-icon">${ICONS.file}</span>
          <span class="tab-title">${escapeHtml(file.name)}</span>
          <span class="tab-dot"></span>
          <button class="tab-close" data-close-tab="${id}" aria-label="关闭 ${escapeHtml(file.name)}">${ICONS.close}</button>
        </div>`;
      })
      .join('');
    requestAnimationFrame(() => {
      const active = dom.tabs.querySelector('.tab.active');
      if (active) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }

  function updateTabDirty() {
    $$('.tab', dom.tabs).forEach((el) => {
      el.classList.toggle('dirty', state.dirtyIds.has(el.dataset.tab));
    });
  }

  function openFile(id, { focus = true } = {}) {
    const file = findFile(id);
    if (!file) return;
    if (state.activeId === id) {
      if (focus && state.mode !== 'preview' && state.mode !== 'preview-edit' && !isMobile() && editor) {
        editor.focus();
      }
      return;
    }

    if (state.diskMode) {
      flushActiveFileToDisk();
      clearTimeout(saveTimer);
    }

    if (state.activeId && editor) {
      state.editorStates.set(state.activeId, editor.getState());
      state.editorScrolls.set(state.activeId, editor.getScrollTop());
      state.previewScrolls.set(state.activeId, dom.previewScroll.scrollTop);
    }

    if (!state.openTabs.includes(id)) state.openTabs.push(id);
    state.activeId = id;
    state.activeHeading = 0;
    switching = true;

    if (!editor) {
      initEditor();
    } else {
      const nextState = state.editorStates.get(id) || editor.makeState(file.content);
      state.editorStates.set(id, nextState);
      editor.setState(nextState);
    }
    switching = false;

    renderTabs();
    renderTree();
    updateStatusFile();
    updateWordCount();
    renderPreview({ preserveScroll: false });
    saveTabs();

    requestAnimationFrame(() => {
      if (!isMobile() && state.mode !== 'preview' && state.mode !== 'preview-edit' && editor && focus) {
        editor.focus();
      }
      requestAnimationFrame(() => {
        suppressEditorSyncUntil = performance.now() + 350;
        if (editor) editor.setScrollTop(state.editorScrolls.get(id) || 0);
        dom.previewScroll.scrollTop = state.previewScrolls.get(id) || 0;
        updateActiveHeading();
        updateCursor();
      });
    });
  }

  function closeTab(id) {
    const index = state.openTabs.indexOf(id);
    if (index < 0) return;
    const wasActive = state.activeId === id;
    if (state.diskMode && wasActive) {
      flushActiveFileToDisk();
      clearTimeout(saveTimer);
    }
    state.openTabs.splice(index, 1);
    state.editorStates.delete(id);
    state.editorScrolls.delete(id);
    state.previewScrolls.delete(id);
    state.dirtyIds.delete(id);

    if (wasActive) {
      state.activeId = null;
      const next = state.openTabs[Math.min(index, state.openTabs.length - 1)];
      if (next) openFile(next);
      else ensureOpenTab();
    } else {
      renderTabs();
      saveTabs();
    }
  }

  function ensureOpenTab() {
    if (state.diskMode) {
      const first = walkFiles(state.tree)[0];
      if (first) {
        state.activeId = null;
        openFile(first.id);
      } else {
        resetEmptyEditor();
      }
      return;
    }
    const first = walkFiles(state.tree)[0];
    if (first) {
      openFile(first.id);
      return;
    }
    const node = {
      type: 'file',
      id: uid(),
      name: '未命名.md',
      content: '# 未命名\n\n',
    };
    state.tree.unshift(node);
    persistWorkspace();
    renderTree();
    updateFileCount();
    openFile(node.id);
  }

  function updateStatusFile() {
    const file = activeFile();
    dom.statusFile.textContent = file ? file.name : '未打开文件';
    document.title = file ? `${file.name} · EasyMarkdown` : 'EasyMarkdown · Markdown 编辑器';
  }

  /* ---------------- 文件树 ---------------- */

  function renderTree() {
    const query = state.filter.trim().toLowerCase();
    const rows = [];

    const folderMatches = (folder) => {
      if (!query) return true;
      if (folder.name.toLowerCase().includes(query)) return true;
      return (folder.children || []).some((child) =>
        child.type === 'folder'
          ? folderMatches(child)
          : child.name.toLowerCase().includes(query)
      );
    };

    const visit = (nodes, depth) => {
      for (const node of nodes) {
        if (node.type === 'folder') {
          if (!folderMatches(node)) continue;
          const open = query ? true : !!node.open;
          rows.push(`<div class="tree-row folder" data-folder="${node.id}" style="--depth:${depth}" title="${escapeHtml(node.name)}">
            <span class="chevron${open ? ' open' : ''}">${ICONS.chevron}</span>
            <span class="tree-icon">${ICONS.folder}</span>
            <span class="tree-name">${escapeHtml(node.name)}</span>
          </div>`);
          if (open) visit(node.children || [], depth + 1);
        } else if (node.type === 'file') {
          if (query && !node.name.toLowerCase().includes(query)) continue;
          const active = node.id === state.activeId;
          rows.push(`<div class="tree-row file${active ? ' active' : ''}" data-file="${node.id}" style="--depth:${depth}" title="${escapeHtml(node.name)}">
            <span class="tree-icon">${ICONS.file}</span>
            <span class="tree-name">${escapeHtml(node.name)}</span>
            <button class="tree-more" data-more="${node.id}" title="更多操作" aria-label="更多操作">${ICONS.more}</button>
          </div>`);
        }
      }
    };

    visit(state.tree, 0);
    dom.tree.innerHTML = rows.length
      ? rows.join('')
      : `<div class="tree-empty"><strong>${query ? '没有匹配的文件' : '还没有文件'}</strong></div>`;
    dom.workspace.classList.toggle('is-empty', walkFiles(state.tree).length === 0);
  }

  function toggleFolder(id) {
    const found = findNodeWithParent(id);
    if (!found || found.node.type !== 'folder') return;
    found.node.open = !found.node.open;
    renderTree();
    if (state.diskMode) {
      const saved = storage.get(KEY_FOLDERS, {});
      saved[found.node.id] = found.node.open;
      storage.set(KEY_FOLDERS, saved);
      return;
    }
    persistWorkspace();
  }

  function updateFileCount() {
    const count = walkFiles(state.tree).length;
    if (dom.sidebarFoot.children[0]) {
      dom.sidebarFoot.children[0].textContent = `${count} 个文件`;
    }
  }

  function setSidebarTab(tab) {
    state.sidebarTab = tab;
    $$('.sidebar-tab').forEach((btn) => {
      const on = btn.dataset.sideTab === tab;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', String(on));
    });
    dom.sidebarFiles.classList.toggle('hidden', tab !== 'files');
    dom.sidebarOutline.classList.toggle('hidden', tab !== 'outline');
    storage.set(KEY_SIDEBAR_TAB, tab);
    if (tab === 'outline') buildOutline();
    else renderTree();
  }

  /* ---------------- 编辑器 ---------------- */

  function initEditor() {
    const file = activeFile();
    editor = createEditor({
      parent: dom.editorHost,
      doc: file ? file.content : '',
      onChange: handleDocChange,
      onSelection: handleCursor,
    });

    editor.onScroll(() => {
      if (state.mode !== 'split') return;
      if (performance.now() < suppressEditorSyncUntil) return;
      if (scrollSyncRaf) return;
      scrollSyncRaf = requestAnimationFrame(() => {
        scrollSyncRaf = 0;
        const scroller = editor.view.scrollDOM;
        const max = scroller.scrollHeight - scroller.clientHeight;
        const ratio = max > 0 ? scroller.scrollTop / max : 0;
        const pmax = dom.previewScroll.scrollHeight - dom.previewScroll.clientHeight;
        if (pmax > 0) dom.previewScroll.scrollTop = ratio * pmax;
      });
    });
  }

  let scrollSyncRaf = 0;
  let suppressEditorSyncUntil = 0;

  function handleDocChange(text) {
    if (switching) return;
    const file = activeFile();
    if (!file) return;
    if (file.content === text) return;
    file.content = text;
    state.dirtyIds.add(file.id);
    updateTabDirty();
    setSaveStatus('saving');
    updateWordCount();
    schedulePreview();
    scheduleSave();
  }

  function handleCursor(info) {
    dom.statusCursor.textContent = `第 ${info.line} 行，第 ${info.col} 列`;
  }

  function updateCursor() {
    if (!editor) return;
    handleCursor(editor.selectionInfo());
  }

  function updateWordCount() {
    const file = activeFile();
    if (!file) {
      dom.statusWords.textContent = '0 字';
      dom.statusLines.textContent = '0 行';
      return;
    }
    dom.statusWords.textContent = `${countWords(file.content).toLocaleString('zh-CN')} 字`;
    dom.statusLines.textContent = `${file.content.split('\n').length.toLocaleString('zh-CN')} 行`;
  }

  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => renderPreview({ preserveScroll: true }), 110);
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (persistWorkspace()) {
        state.dirtyIds.clear();
        updateTabDirty();
        setSaveStatus('saved');
      }
    }, 700);
  }

  function persistWorkspace() {
    if (state.diskMode) {
      const file = activeFile();
      if (!file) return true;
      const result = desktop.writeFile(file.id, file.content);
      if (!result || !result.ok) {
        setSaveStatus('error');
        toast('写入磁盘失败');
        return false;
      }
      return true;
    }

    const okTree = storage.set(KEY_WORKSPACE, state.tree);
    const okAssets = storage.set(KEY_ASSETS, state.assets);
    const ok = okTree && okAssets;
    if (!ok) {
      setSaveStatus('error');
      toast('草稿过大，浏览器无法保存。建议下载 Markdown 备份。');
    }
    return ok;
  }

  function saveNow(showMessage = false) {
    if (previewEdit) commitPreviewEdit({ render: false });
    clearTimeout(saveTimer);
    if (persistWorkspace()) {
      state.dirtyIds.clear();
      updateTabDirty();
      setSaveStatus('saved');
      if (showMessage) {
        toast(state.diskMode ? '已保存到磁盘' : '已保存到浏览器本地');
      }
    }
  }

  function setSaveStatus(kind) {
    dom.saveState.classList.toggle('saving', kind === 'saving');
    dom.saveState.classList.toggle('error', kind === 'error');
    if (kind === 'saving') dom.saveText.textContent = '保存中';
    else if (kind === 'error') dom.saveText.textContent = '保存失败';
    else dom.saveText.textContent = '已保存';
  }

  /* ---------------- Markdown 预览 ---------------- */

  function renderPreview({ preserveScroll = true } = {}) {
    const file = activeFile();
    if (!file) {
      dom.previewPage.innerHTML = '';
      state.outline = [];
      renderOutline();
      return;
    }
    const previous = dom.previewScroll.scrollTop;
    dom.previewPage.innerHTML = renderMarkdown(file.content);
    enhancePreview();
    applyPreviewEditing();
    if (preserveScroll) dom.previewScroll.scrollTop = previous;
    buildOutline();
    updateActiveHeading();
    mermaidPromise = renderMermaidBlocks();
  }

  function initMermaid() {
    if (!window.mermaid) return;
    const dark = state.theme === 'dark';
    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      themeVariables: dark
        ? {
            darkMode: true,
            background: '#0a1420',
            fontFamily: '"Segoe UI Variable Text","Segoe UI","Microsoft YaHei",sans-serif',
            fontSize: '16px',
            primaryColor: '#101d2b',
            primaryTextColor: '#f2f7f5',
            primaryBorderColor: '#2e7a4e',
            secondaryColor: '#0f1c29',
            secondaryTextColor: '#c8d0d9',
            secondaryBorderColor: '#1f3a2b',
            tertiaryColor: '#0a1420',
            tertiaryTextColor: '#b8c0c9',
            lineColor: '#3ef07c',
            textColor: '#dfe4ea',
            mainBkg: '#0f1c29',
            nodeBorder: '#3ef07c',
            clusterBkg: '#0a1420',
            clusterBorder: '#1f3a2b',
            edgeLabelBackground: '#0a1420',
            actorBkg: '#0f1c29',
            actorBorder: '#3ef07c',
            actorTextColor: '#f2f7f5',
            actorLineColor: '#3a424c',
            signalColor: '#8b949f',
            signalTextColor: '#dfe4ea',
            labelBoxBkgColor: '#0f1c29',
            labelBoxBorderColor: '#2e7a4e',
            labelTextColor: '#dfe4ea',
            loopTextColor: '#dfe4ea',
            noteBkgColor: '#122a1d',
            noteBorderColor: '#3ef07c',
            noteTextColor: '#dfe4ea',
            activationBkgColor: '#122a1d',
            activationBorderColor: '#3ef07c',
          }
        : {
            darkMode: false,
            background: '#ffffff',
            fontFamily: '"Segoe UI Variable Text","Segoe UI","Microsoft YaHei",sans-serif',
            fontSize: '16px',
            primaryColor: '#eef7f2',
            primaryTextColor: '#132018',
            primaryBorderColor: '#9bc9ae',
            secondaryColor: '#f3f7f5',
            secondaryTextColor: '#2a3a32',
            secondaryBorderColor: '#c9ded2',
            tertiaryColor: '#f8faf9',
            tertiaryTextColor: '#2a3a32',
            lineColor: '#17895a',
            textColor: '#16211b',
            mainBkg: '#ffffff',
            nodeBorder: '#17895a',
            clusterBkg: '#f4faf6',
            clusterBorder: '#cfe4d8',
            edgeLabelBackground: '#ffffff',
            actorBkg: '#f4faf6',
            actorBorder: '#17895a',
            actorTextColor: '#132018',
            actorLineColor: '#b6c9bf',
            signalColor: '#5d7066',
            signalTextColor: '#16211b',
            labelBoxBkgColor: '#f4faf6',
            labelBoxBorderColor: '#9bc9ae',
            labelTextColor: '#16211b',
            loopTextColor: '#16211b',
            noteBkgColor: '#eef7f2',
            noteBorderColor: '#17895a',
            noteTextColor: '#16211b',
            activationBkgColor: '#e6f3eb',
            activationBorderColor: '#17895a',
          },
      flowchart: { curve: 'basis', htmlLabels: true, padding: 12, useMaxWidth: true },
      sequence: { useMaxWidth: true },
      gantt: { useMaxWidth: true },
    });
  }

  async function renderMermaidBlocks() {
    if (!window.mermaid) return;
    const blocks = $$('.mermaid-block', dom.previewPage);
    if (!blocks.length) return;
    const token = ++mermaidToken;
    initMermaid();
    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index];
      if (!block.isConnected) continue;
      const source = block.querySelector('.mermaid-source');
      const canvas = block.querySelector('.mermaid-canvas');
      if (!source || !canvas) continue;
      try {
        const result = await window.mermaid.render(`mmd-${token}-${index}`, source.textContent || '');
        if (token !== mermaidToken || !block.isConnected) return;
        canvas.innerHTML = typeof result === 'string' ? result : result.svg;
        block.classList.add('is-rendered');
      } catch (err) {
        if (token !== mermaidToken || !block.isConnected) return;
        canvas.innerHTML = `<div class="mermaid-error">图表渲染失败：${escapeHtml(err.message || String(err))}</div>`;
        block.classList.add('has-error');
      }
    }
  }

  function enhancePreview() {
    const page = dom.previewPage;

    $$('h1,h2,h3,h4,h5,h6', page).forEach((heading, index) => {
      heading.id = `h-${index}`;
    });

    $$('blockquote', page).forEach((bq) => {
      const first = bq.querySelector('p');
      if (!first) return;
      const match = first.textContent.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i);
      if (!match) return;
      const type = match[1].toLowerCase();
      bq.classList.add('callout', `callout-${type}`);
      first.innerHTML = first.innerHTML.replace(
        /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(<br\s*\/?>)?\s*/i,
        ''
      );
      const title = document.createElement('div');
      title.className = 'callout-title';
      title.textContent = CALLOUT_LABELS[type] || type;
      bq.insertBefore(title, bq.firstChild);
    });

    $$('table', page).forEach((table) => {
      if (table.parentElement && table.parentElement.classList.contains('table-wrap')) return;
      const wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });

    let taskIndex = 0;
    $$('li', page).forEach((li) => {
      if (li.querySelector('.task-checkbox')) return;
      const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT);
      const textNode = walker.nextNode();
      if (!textNode) return;
      const match = textNode.nodeValue.match(/^\[([ xX])\]\s+/);
      if (!match) return;
      textNode.nodeValue = textNode.nodeValue.slice(match[0].length);
      const checked = match[1].toLowerCase() === 'x';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'task-checkbox';
      checkbox.checked = checked;
      checkbox.dataset.taskIndex = String(taskIndex++);
      li.classList.add('task-item');
      li.classList.toggle('done', checked);
      textNode.parentNode.insertBefore(checkbox, textNode);
    });

    $$('a[href]', page).forEach((link) => {
      const href = link.getAttribute('href') || '';
      if (/^https?:/i.test(href)) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
    });

    $$('img[src]', page).forEach((img) => {
      const src = (img.getAttribute('src') || '').replace(/^\.\//, '');
      if (state.diskMode) {
        if (!src || /^(data:|https?:|app:|blob:)/i.test(src)) return;
        const result = desktop.readAsset(src);
        if (result && result.ok) img.src = result.dataUrl;
        return;
      }
      const resolved = state.assets[src];
      if (resolved) img.src = resolved;
    });
  }

  /* ---------------- 预览编辑 ---------------- */

  const TEXT_BLOCK = /^(P|H[1-6])$/;

  function blockMeta(el) {
    if (!el) return null;
    const start = Number(el.dataset.mdStart);
    const end = Number(el.dataset.mdEnd);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    return { start, end };
  }

  function isTextBlock(el) {
    if (!el || !TEXT_BLOCK.test(el.tagName)) return false;
    if (el.closest('.callout, .preview-source-edit')) return false;
    return !el.querySelector(
      'pre, table, ul, ol, blockquote, hr, .mermaid-block, .code-block, .task-checkbox, input, textarea, video, audio, iframe'
    );
  }

  function sourceBlockLabel(el) {
    if (el.matches('table')) return '表格';
    if (el.classList.contains('mermaid-block')) return 'Mermaid 图表';
    if (el.classList.contains('code-block')) return '代码块';
    if (el.matches('ul, ol')) return '列表';
    if (el.matches('blockquote')) return '引用';
    if (el.matches('hr')) return '分割线';
    return '内容';
  }

  function applyPreviewEditing() {
    if (state.mode !== 'preview-edit') return;
    $$('[data-md-start][data-md-end]', dom.previewPage).forEach((el) => {
      if (el.closest('.preview-source-edit')) return;
      if (isTextBlock(el)) {
        el.setAttribute('contenteditable', 'true');
        el.setAttribute('spellcheck', 'false');
        el.setAttribute('role', 'textbox');
        el.dataset.mdEdit = 'text';
        el.title = '点击直接修改';
      } else {
        el.dataset.mdEdit = 'source';
        el.title = '双击修改 Markdown 源码';
      }
    });
  }

  function escapeMdText(text) {
    return text
      .replace(/\u00a0/g, ' ')
      .replace(/\\/g, '\\\\')
      .replace(/([*_`\[\]<>])/g, '\\$1');
  }

  function escapeMdLineStarts(text) {
    return text.replace(/(^|\n)([ \t]*)([#>\-+=])/g, '$1$2\\$3');
  }

  function inlineToMarkdown(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeMdText(node.nodeValue || '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const tag = node.tagName;
    const children = () => Array.from(node.childNodes).map(inlineToMarkdown).join('');

    if (tag === 'BR') return '  \n';
    if (tag === 'STRONG' || tag === 'B') return `**${children()}**`;
    if (tag === 'EM' || tag === 'I') return `*${children()}*`;
    if (tag === 'DEL' || tag === 'S' || tag === 'STRIKE') return `~~${children()}~~`;
    if (tag === 'CODE') {
      const text = (node.textContent || '').replace(/\n/g, ' ').trim();
      if (!text) return '';
      const longest = Math.max(0, ...(text.match(/`+/g) || []).map((run) => run.length));
      const ticks = '`'.repeat(longest + 1);
      const pad = text.startsWith('`') || text.endsWith('`') ? ' ' : '';
      return `${ticks}${pad}${text}${pad}${ticks}`;
    }
    if (tag === 'A') {
      const href = (node.getAttribute('href') || '').trim();
      if (!href || /^\s*javascript:/i.test(href)) return children();
      const label = children() || escapeMdText(href);
      const title = node.getAttribute('title');
      const suffix = title ? ` "${title.replace(/"/g, '\\"')}"` : '';
      return `[${label}](${href.replace(/\)/g, '%29')}${suffix})`;
    }
    if (tag === 'IMG') {
      const src = (node.getAttribute('src') || '').trim();
      if (!src || /^\s*javascript:/i.test(src)) return '';
      const alt = (node.getAttribute('alt') || '').replace(/\]/g, '\\]');
      return `![${alt}](${src.replace(/\)/g, '%29')})`;
    }
    if (tag === 'DIV' || tag === 'P') return `${children()}\n`;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'INPUT' || tag === 'TEXTAREA') return '';
    return children();
  }

  function serializeTextBlock(el) {
    let body = Array.from(el.childNodes).map(inlineToMarkdown).join('');
    body = escapeMdLineStarts(body).replace(/[ \t]+$/gm, '').trim();
    if (!body) return null;
    if (/^H[1-6]$/.test(el.tagName)) {
      const level = Number(el.tagName.slice(1));
      return `${'#'.repeat(level)} ${body.replace(/\s*\n\s*/g, ' ').trim()}`;
    }
    return body;
  }

  function focusBlock(start) {
    const block = dom.previewPage.querySelector(`[data-md-start="${start}"]`);
    if (!block) return;
    if (block.dataset.mdEdit === 'text') {
      block.focus();
      const range = document.createRange();
      range.selectNodeContents(block);
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      block.scrollIntoView({ block: 'nearest' });
    }
  }

  function beginTextEdit(el) {
    if (state.mode !== 'preview-edit' || !el || el.dataset.mdEdit !== 'text') return;
    const meta = blockMeta(el);
    if (!meta) return;
    previewEdit = {
      kind: 'text',
      el,
      start: meta.start,
      end: meta.end,
      original: el.innerHTML,
    };
  }

  function autoGrowSource(ta) {
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight + 2, Math.round(window.innerHeight * 0.65))}px`;
  }

  function beginSourceEdit(block) {
    if (state.mode !== 'preview-edit' || !block) return;
    const file = activeFile();
    const meta = blockMeta(block);
    if (!file || !meta) return;
    if (previewEdit) commitPreviewEdit({ render: false });

    const source = file.content.slice(meta.start, meta.end);
    const wrap = document.createElement('div');
    wrap.className = 'preview-source-edit';
    wrap.innerHTML = `<div class="preview-source-head"><span><strong>${sourceBlockLabel(
      block
    )}</strong> · Markdown 源码</span><span>Ctrl + Enter 完成 · Esc 取消</span></div><textarea spellcheck="false" aria-label="Markdown 源码"></textarea>`;
    const ta = $('textarea', wrap);
    ta.value = source;
    block.replaceWith(wrap);
    previewEdit = {
      kind: 'source',
      wrap,
      ta,
      start: meta.start,
      end: meta.end,
    };
    autoGrowSource(ta);
    ta.addEventListener('input', () => autoGrowSource(ta));
    ta.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cancelPreviewEdit();
      } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        commitPreviewEdit({ refocus: true });
      }
    });
    ta.addEventListener('blur', () => {
      setTimeout(() => {
        if (previewEdit && previewEdit.ta === ta) commitPreviewEdit();
      }, 0);
    });
    ta.focus();
    ta.setSelectionRange(0, 0);
  }

  function cancelPreviewEdit() {
    const session = previewEdit;
    if (!session) return;
    previewEdit = null;
    if (session.kind === 'text') {
      if (session.el.isConnected) {
        session.el.innerHTML = session.original;
        session.el.removeAttribute('contenteditable');
        session.el.removeAttribute('spellcheck');
        session.el.removeAttribute('role');
        delete session.el.dataset.mdEdit;
        applyPreviewEditing();
      }
      return;
    }
    if (session.wrap.isConnected) session.wrap.remove();
    renderPreview({ preserveScroll: true });
  }

  function commitPreviewEdit({ render = true, refocus = false } = {}) {
    const session = previewEdit;
    if (!session) return;
    previewEdit = null;

    let replacement = null;
    if (session.kind === 'text') {
      if (session.el.isConnected) replacement = serializeTextBlock(session.el);
      if (session.el.isConnected) {
        session.el.removeAttribute('contenteditable');
        session.el.removeAttribute('spellcheck');
        session.el.removeAttribute('role');
        delete session.el.dataset.mdEdit;
      }
    } else {
      replacement = session.ta.value.replace(/\r\n/g, '\n').replace(/\s+$/, '');
      if (session.wrap.isConnected) session.wrap.remove();
    }

    if (replacement == null) {
      if (render) renderPreview({ preserveScroll: true });
      return;
    }

    const file = activeFile();
    if (!file) return;
    const next = file.content.slice(0, session.start) + replacement + file.content.slice(session.end);
    if (next !== file.content) {
      if (editor) {
        editor.setDoc(next);
        clearTimeout(previewTimer);
      } else {
        file.content = next;
        state.dirtyIds.add(file.id);
        updateTabDirty();
        updateWordCount();
        scheduleSave();
      }
    }
    if (render) {
      renderPreview({ preserveScroll: true });
      if (refocus) focusBlock(session.start);
    }
  }

  function bindPreviewEditing() {
    dom.previewPage.addEventListener('focusin', (event) => {
      if (state.mode !== 'preview-edit') return;
      const el = event.target.closest?.('[data-md-edit="text"]');
      if (!el || !dom.previewPage.contains(el)) return;
      if (previewEdit && previewEdit.kind === 'text' && previewEdit.el === el) return;
      if (previewEdit) commitPreviewEdit({ render: false });
      beginTextEdit(el);
    });

    dom.previewPage.addEventListener('focusout', (event) => {
      const session = previewEdit;
      if (!session || session.kind !== 'text' || session.el !== event.target) return;
      if (event.relatedTarget && dom.previewPage.contains(event.relatedTarget)) return;
      setTimeout(() => {
        if (previewEdit !== session) return;
        if (session.el.contains(document.activeElement)) return;
        commitPreviewEdit();
      }, 0);
    });

    dom.previewPage.addEventListener(
      'pointerdown',
      (event) => {
        if (state.mode !== 'preview-edit' || !previewEdit) return;
        if (previewEdit.kind === 'text' && previewEdit.el.contains(event.target)) return;
        if (previewEdit.kind === 'source' && previewEdit.wrap.contains(event.target)) return;
        event.preventDefault();
        commitPreviewEdit();
      },
      true
    );

    dom.previewPage.addEventListener('dblclick', (event) => {
      if (state.mode !== 'preview-edit') return;
      if (event.target.closest('button, a, input, textarea, [contenteditable="true"]')) return;
      const block = event.target.closest('[data-md-edit="source"]');
      if (!block) return;
      event.preventDefault();
      beginSourceEdit(block);
    });

    dom.previewPage.addEventListener('keydown', (event) => {
      const el = event.target.closest?.('[data-md-edit="text"]');
      if (!el || state.mode !== 'preview-edit') return;
      if (event.key === 'Escape') {
        event.preventDefault();
        cancelPreviewEdit();
      } else if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        commitPreviewEdit();
      }
    });

    dom.previewPage.addEventListener('paste', (event) => {
      if (state.mode !== 'preview-edit') return;
      const el = event.target.closest?.('[data-md-edit="text"]');
      if (!el) return;
      const text = event.clipboardData?.getData('text/plain');
      if (text == null) return;
      event.preventDefault();
      document.execCommand('insertText', false, text);
    });
  }

  function extractHeadings(markdown) {
    const headings = [];
    let inFence = false;
    let fenceChar = '';

    markdown.split('\n').forEach((line, index) => {
      const fence = line.match(/^\s*(`{3,}|~{3,})/);
      if (fence) {
        if (!inFence) {
          inFence = true;
          fenceChar = fence[1][0];
        } else if (fence[1][0] === fenceChar) {
          inFence = false;
          fenceChar = '';
        }
        return;
      }
      if (inFence) return;
      const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (!match) return;
      const text = match[2]
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/[*_`~]/g, '')
        .trim();
      if (text) headings.push({ level: match[1].length, text, line: index + 1 });
    });

    return headings;
  }

  function buildOutline() {
    const file = activeFile();
    state.outline = file ? extractHeadings(file.content) : [];
    renderOutline();
    updateActiveHeading();
  }

  function renderOutline() {
    if (!state.outline.length) {
      dom.outline.innerHTML = '<div class="outline-empty"><strong>没有标题</strong>用 # 添加标题</div>';
      return;
    }
    dom.outline.innerHTML = state.outline
      .map(
        (heading, index) =>
          `<button class="outline-item${index === state.activeHeading ? ' active' : ''}" data-outline="${index}" style="--level:${heading.level}" title="${escapeHtml(heading.text)}">${escapeHtml(heading.text)}</button>`
      )
      .join('');
  }

  function updateOutlineActive() {
    $$('.outline-item', dom.outline).forEach((el, index) => {
      el.classList.toggle('active', index === state.activeHeading);
    });
    const current = dom.outline.querySelector('.outline-item.active');
    if (current && state.sidebarTab === 'outline') {
      current.scrollIntoView({ block: 'nearest' });
    }
  }

  function updateActiveHeading() {
    if (!state.outline.length) return;
    if (state.mode === 'editor') {
      if (state.activeHeading !== 0) {
        state.activeHeading = 0;
        updateOutlineActive();
      }
      return;
    }
    const headings = $$('h1,h2,h3,h4,h5,h6', dom.previewPage);
    if (!headings.length) return;
    const threshold = dom.previewScroll.getBoundingClientRect().top + 96;
    let active = 0;
    headings.forEach((heading, index) => {
      if (heading.getBoundingClientRect().top <= threshold) active = index;
    });
    active = Math.min(active, state.outline.length - 1);
    if (active !== state.activeHeading) {
      state.activeHeading = active;
      updateOutlineActive();
    }
  }

  function scrollPreviewToElement(element) {
    const top =
      element.getBoundingClientRect().top -
      dom.previewScroll.getBoundingClientRect().top +
      dom.previewScroll.scrollTop -
      16;
    dom.previewScroll.scrollTo({ top, behavior: 'smooth' });
  }

  /* ---------------- 命令面板 ---------------- */

  function getCommands() {
    return [
      { id: 'new', title: '新建文件', icon: 'plus', run: newFileFlow },
      { id: 'open', title: '打开本地文件', icon: 'open', run: () => dom.fileInput.click() },
      {
        id: 'theme',
        title: state.theme === 'dark' ? '切换到浅色主题' : '切换到深色主题',
        icon: 'theme',
        run: toggleTheme,
      },
      { id: 'html', title: '导出 HTML', icon: 'html', run: exportHTML },
      { id: 'pdf', title: '打印 / 存为 PDF', icon: 'pdf', run: printPDF },
      {
        id: 'md',
        title: '下载当前 Markdown',
        icon: 'download',
        run: () => downloadMarkdown(activeFile()),
      },
      { id: 'sidebar', title: '展开 / 收起侧栏', icon: 'panel', run: toggleSidebar },
      { id: 'workspace', title: '切换工作区文件夹', icon: 'folder', run: chooseWorkspaceFlow },
      {
        id: 'reveal',
        title: '在资源管理器中显示工作区',
        icon: 'open',
        run: () => {
          if (desktop) desktop.revealWorkspace();
        },
      },
      { id: 'refresh', title: '刷新工作区', icon: 'reset', run: refreshWorkspaceNow },
      {
        id: 'check-update',
        title: '检查更新',
        icon: 'download',
        run: () => checkForAppUpdate({ manual: true }),
      },
      { id: 'split', title: '视图：分屏', icon: 'split', run: () => setMode('split') },
      { id: 'editor', title: '视图：仅编辑', icon: 'editor', run: () => setMode('editor') },
      { id: 'preview', title: '视图：仅预览', icon: 'preview', run: () => setMode('preview') },
      {
        id: 'preview-edit',
        title: '视图：预览编辑',
        icon: 'editor',
        run: () => setMode('preview-edit'),
      },
      { id: 'shortcuts', title: '键盘快捷键与关于', icon: 'keyboard', run: showHelp },
      { id: 'reset', title: '重置示例数据', icon: 'reset', run: resetDemo },
    ];
  }

  function openPalette() {
    if (paletteEl) {
      paletteEl.querySelector('.palette-input').focus();
      return;
    }
    closePopover();
    paletteEl = document.createElement('div');
    paletteEl.className = 'overlay';
    paletteEl.id = 'paletteOverlay';
    paletteEl.innerHTML = `<div class="palette" role="dialog" aria-modal="true" aria-label="命令面板">
      <div class="palette-input-row">
        ${ICONS.search}
        <input class="palette-input" placeholder="搜索" autocomplete="off" spellcheck="false">
      </div>
      <div class="palette-list"></div>
      <div class="palette-footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
        <span><kbd>Enter</kbd> 打开</span>
        <span><kbd>Esc</kbd> 关闭</span>
      </div>
    </div>`;
    document.body.appendChild(paletteEl);

    const input = $('.palette-input', paletteEl);
    input.addEventListener('input', () => renderPaletteResults(input.value));
    input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        movePalette(1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        movePalette(-1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const item = paletteResults[paletteActive];
        if (item) runPaletteItem(item);
      }
    });
    paletteEl.addEventListener('mousedown', (event) => {
      if (event.target === paletteEl) closePalette();
    });
    const list = $('.palette-list', paletteEl);
    list.addEventListener('click', (event) => {
      const el = event.target.closest('.palette-item');
      if (!el) return;
      const item = paletteResults[Number(el.dataset.index)];
      if (item) runPaletteItem(item);
    });
    list.addEventListener('mouseover', (event) => {
      const el = event.target.closest('.palette-item');
      if (!el) return;
      paletteActive = Number(el.dataset.index);
      updatePaletteActive();
    });

    renderPaletteResults('');
    input.focus();
  }

  function closePalette() {
    if (!paletteEl) return;
    paletteEl.remove();
    paletteEl = null;
    paletteResults = [];
    paletteActive = 0;
    setTimeout(() => {
      if (
        !document.querySelector('.overlay') &&
        editor &&
        state.mode !== 'preview' &&
        state.mode !== 'preview-edit' &&
        !isMobile()
      ) {
        editor.focus();
      }
    }, 0);
  }

  function togglePalette() {
    if (paletteEl) {
      closePalette();
      return;
    }
    if (document.querySelector('.overlay')) return;
    openPalette();
  }

  function renderPaletteResults(query) {
    if (!paletteEl) return;
    const q = query.trim().toLowerCase();
    const files = walkFiles(state.tree)
      .filter((file) => !q || file.name.toLowerCase().includes(q))
      .slice(0, 9)
      .map((file) => ({ kind: 'file', id: file.id, title: file.name, icon: 'file' }));
    const commands = getCommands()
      .filter((command) => !q || command.title.toLowerCase().includes(q))
      .slice(0, 12);

    paletteResults = [];
    let html = '';
    const groups = [
      { title: '文件', items: files },
      { title: '命令', items: commands },
    ];
    for (const group of groups) {
      if (!group.items.length) continue;
      html += `<div class="palette-group-title">${group.title}</div>`;
      for (const item of group.items) {
        const index = paletteResults.length;
        paletteResults.push(item);
        html += `<button class="palette-item" data-index="${index}">
          <span class="pi-icon">${ICONS[item.icon] || ICONS.file}</span>
          <span class="pi-text">${escapeHtml(item.title)}</span>
        </button>`;
      }
    }

    const list = $('.palette-list', paletteEl);
    list.innerHTML = html || '<div class="palette-empty">没有匹配结果</div>';
    paletteActive = 0;
    updatePaletteActive();
  }

  function updatePaletteActive() {
    if (!paletteEl) return;
    const items = $$('.palette-item', paletteEl);
    items.forEach((el, index) => el.classList.toggle('active', index === paletteActive));
    const current = items[paletteActive];
    if (current) current.scrollIntoView({ block: 'nearest' });
  }

  function movePalette(delta) {
    if (!paletteResults.length) return;
    paletteActive = (paletteActive + delta + paletteResults.length) % paletteResults.length;
    updatePaletteActive();
  }

  function runPaletteItem(item) {
    closePalette();
    if (item.kind === 'file') openFile(item.id);
    else if (typeof item.run === 'function') item.run();
  }

  /* ---------------- 弹窗 / 菜单 ---------------- */

  function showPrompt({ title, desc = '', value = '', confirmText = '确定' }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'overlay';
      overlay.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
        <h3 class="modal-title">${escapeHtml(title)}</h3>
        ${desc ? `<p class="modal-desc">${escapeHtml(desc)}</p>` : ''}
        <input class="modal-input" type="text" value="${escapeHtml(value)}" spellcheck="false">
        <div class="modal-actions">
          <button class="btn" data-cancel>取消</button>
          <button class="btn primary" data-ok>${escapeHtml(confirmText)}</button>
        </div>
      </div>`;
      document.body.appendChild(overlay);
      const input = $('.modal-input', overlay);
      let done = false;
      const close = (result) => {
        if (done) return;
        done = true;
        document.removeEventListener('keydown', onKey, true);
        overlay.remove();
        resolve(result);
      };
      const submit = () => {
        const result = input.value.trim();
        if (!result) {
          input.focus();
          return;
        }
        close(result);
      };
      const onKey = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          close(null);
        } else if (event.key === 'Enter' && event.target === input) {
          event.preventDefault();
          submit();
        }
      };
      document.addEventListener('keydown', onKey, true);
      overlay.addEventListener('mousedown', (event) => {
        if (event.target === overlay) close(null);
      });
      $('[data-cancel]', overlay).addEventListener('click', () => close(null));
      $('[data-ok]', overlay).addEventListener('click', submit);
      input.focus();
      input.select();
    });
  }

  function showConfirm({ title, desc = '', confirmText = '确定', danger = false }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'overlay';
      overlay.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
        <h3 class="modal-title">${escapeHtml(title)}</h3>
        <p class="modal-desc">${escapeHtml(desc)}</p>
        <div class="modal-actions">
          <button class="btn" data-cancel>取消</button>
          <button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${escapeHtml(confirmText)}</button>
        </div>
      </div>`;
      document.body.appendChild(overlay);
      let done = false;
      const close = (result) => {
        if (done) return;
        done = true;
        overlay.remove();
        document.removeEventListener('keydown', onKey, true);
        resolve(result);
      };
      const onKey = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          close(false);
        }
      };
      document.addEventListener('keydown', onKey, true);
      overlay.addEventListener('mousedown', (event) => {
        if (event.target === overlay) close(false);
      });
      $('[data-cancel]', overlay).addEventListener('click', () => close(false));
      $('[data-ok]', overlay).addEventListener('click', () => close(true));
    });
  }

  function showHelp() {
    if (document.getElementById('helpOverlay')) return;
    const isDesktopApp = /Electron/i.test(navigator.userAgent);
    const storageLabel = isDesktopApp
      ? '当前工作区文件夹（磁盘上的 .md 文件）'
      : '当前浏览器的 localStorage';
    const clearLabel = isDesktopApp ? '工作区文件' : '浏览器数据';
    const openHint = isDesktopApp
      ? '编辑会直接写回磁盘；标签页和界面状态保存在 %APPDATA%\\EasyMarkdown。支持 UTF-8 文本；暂不支持 GBK 编码的外部文件。'
      : '建议在 Edge / Chrome 中打开。支持 UTF-8 文本；暂不支持 GBK 编码的外部文件。';
    const intro = isDesktopApp
      ? '一个零安装的桌面 Markdown 编辑器。左侧树、标签页和草稿都会自动保存。'
      : '一个单文件、零安装的 Markdown 编辑器。把本文件发给别人，对方双击即可使用。';
    const rows = [
      ['命令面板', ['Ctrl', 'P']],
      ['保存草稿', ['Ctrl', 'S']],
      ['加粗', ['Ctrl', 'B']],
      ['斜体', ['Ctrl', 'I']],
      ['插入链接', ['Ctrl', 'K']],
      ['行内代码', ['Ctrl', 'E']],
      ['编辑器内查找', ['Ctrl', 'F']],
      ['收起 / 展开侧栏', ['Ctrl', '\\']],
      ['关闭面板 / 弹窗', ['Esc']],
    ];
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.id = 'helpOverlay';
    overlay.innerHTML = `<div class="modal wide" role="dialog" aria-modal="true">
      <h3 class="modal-title">EasyMarkdown · 快捷键与说明</h3>
      <p class="modal-desc">${intro}</p>
      <div class="help-grid">
        ${rows
          .map(
            ([label, keys]) =>
              `<span>${label}</span><span class="keys">${keys.map((key) => `<kbd>${key}</kbd>`).join('')}</span>`
          )
          .join('')}
      </div>
      <div class="about-box">
        <strong>EasyMarkdown ${VERSION}</strong> · 单文件 Markdown 编辑器<br>
        文件保存在${storageLabel}中。清理${clearLabel}会丢失内容，重要文件请定期备份。<br>
        要分享某一篇文档，请用「导出 HTML」，它会把正文、样式和图片打包成一个文件。<br>
        ${openHint}
      </div>
      <div class="modal-actions">
        <button class="btn primary" data-close>知道了</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('mousedown', (event) => {
      if (event.target === overlay) overlay.remove();
    });
    $('[data-close]', overlay).addEventListener('click', () => overlay.remove());
  }

  function closeTopOverlay() {
    if (popoverEl) {
      closePopover();
      return true;
    }
    if (paletteEl) {
      closePalette();
      return true;
    }
    const help = document.getElementById('helpOverlay');
    if (help) {
      help.remove();
      return true;
    }
    return false;
  }

  function positionPopover(element, anchor) {
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    let x;
    let y;
    if (anchor instanceof Element) {
      const rect = anchor.getBoundingClientRect();
      x = rect.right - width;
      y = rect.bottom + 5;
      if (anchor.closest('.appbar')) y = Math.max(y, 52);
    } else {
      x = anchor.x;
      y = anchor.y;
    }
    x = clamp(x, 8, window.innerWidth - width - 8);
    y = clamp(y, 8, window.innerHeight - height - 8);
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
  }

  function closePopover() {
    if (!popoverEl) return;
    popoverEl.remove();
    popoverEl = null;
  }

  function openExportMenu() {
    closePopover();
    const menu = document.createElement('div');
    menu.className = 'popover';
    menu.innerHTML = `
      <button class="popover-item" data-export="html">${ICONS.html} 导出 HTML<span class="shortcut">.html</span></button>
      <button class="popover-item" data-export="pdf">${ICONS.pdf} 打印 / 存为 PDF<span class="shortcut">PDF</span></button>
      <div class="popover-sep"></div>
      <button class="popover-item" data-export="md">${ICONS.download} 下载 Markdown<span class="shortcut">.md</span></button>`;
    menu.dataset.menu = 'export';
    document.body.appendChild(menu);
    positionPopover(menu, dom.exportBtn);
    popoverEl = menu;
    menu.addEventListener('click', (event) => {
      const item = event.target.closest('[data-export]');
      if (!item) return;
      closePopover();
      if (item.dataset.export === 'html') exportHTML();
      else if (item.dataset.export === 'pdf') printPDF();
      else if (item.dataset.export === 'md') downloadMarkdown(activeFile());
    });
  }

  function insertAction(action) {
    if (!editor) return;
    if (action === 'table') {
      editor.insertBlock('| 列 1 | 列 2 | 列 3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |');
    } else if (action === 'codeblock') {
      editor.insertBlock('```js\n// 代码\n```');
    } else if (action === 'mermaid') {
      editor.insertBlock('```mermaid\nflowchart LR\n  A[开始] --> B{条件}\n  B -->|是| C[完成]\n  B -->|否| D[结束]\n```');
    } else if (action === 'callout') {
      editor.insertBlock('> [!NOTE]\n> 这里写提示内容');
    } else if (action === 'divider') {
      editor.insertBlock('---');
    }
  }

  function openInsertMenu(anchor) {
    closePopover();
    const menu = document.createElement('div');
    menu.className = 'popover';
    menu.innerHTML = `
      <button class="popover-item" data-insert="table">表格</button>
      <button class="popover-item" data-insert="codeblock">代码块</button>
      <button class="popover-item" data-insert="callout">提示块</button>
      <button class="popover-item" data-insert="divider">分割线</button>`;
    document.body.appendChild(menu);
    positionPopover(menu, anchor);
    popoverEl = menu;
    menu.addEventListener('click', (event) => {
      const item = event.target.closest('[data-insert]');
      if (!item) return;
      const action = item.dataset.insert;
      closePopover();
      insertAction(action);
    });
  }

  function openFileMenu(id, anchor) {
    closePopover();
    const file = findFile(id);
    if (!file) return;
    const menu = document.createElement('div');
    menu.className = 'popover';
    menu.innerHTML = `
      <button class="popover-item" data-act="open">${ICONS.file} 打开</button>
      <button class="popover-item" data-act="rename">${ICONS.rename} 重命名</button>
      <button class="popover-item" data-act="download">${ICONS.download} 下载 .md<span class="shortcut">.md</span></button>
      <div class="popover-sep"></div>
      <button class="popover-item danger" data-act="delete">${ICONS.trash} 删除</button>`;
    document.body.appendChild(menu);
    positionPopover(menu, anchor);
    popoverEl = menu;
    menu.addEventListener('click', async (event) => {
      const item = event.target.closest('[data-act]');
      if (!item) return;
      const act = item.dataset.act;
      closePopover();
      if (act === 'open') openFile(id);
      else if (act === 'rename') await renameFile(id);
      else if (act === 'download') downloadMarkdown(file);
      else if (act === 'delete') await deleteFile(id);
    });
  }

  /* ---------------- 文件操作 ---------------- */

  async function newFileFlow() {
    const name = await showPrompt({
      title: '新建文件',
      desc: `文件会创建在「${state.workspaceName}」根目录。`,
      value: '未命名.md',
      confirmText: '创建',
    });
    if (!name) return;
    let finalName = name.replace(/[\\/]/g, '-').trim();
    if (!finalName) return;
    if (!/\.[a-z0-9]{1,8}$/i.test(finalName)) finalName += '.md';
    finalName = uniqueName(finalName);
    const title = finalName.replace(/\.[^.]+$/, '');

    if (state.diskMode) {
      const result = desktop.createFile(
        state.workspaceRoot,
        finalName,
        `# ${title}\n\n`
      );
      if (!result || !result.ok) {
        toast('创建文件失败');
        return;
      }
      reloadWorkspaceTree();
      openFile(result.path);
      toast(`已创建 ${result.name}`);
      return;
    }

    const node = {
      type: 'file',
      id: uid(),
      name: finalName,
      content: `# ${title}\n\n`,
    };
    state.tree.unshift(node);
    persistWorkspace();
    renderTree();
    updateFileCount();
    openFile(node.id);
    toast(`已创建 ${finalName}`);
  }

  async function renameFile(id) {
    const file = findFile(id);
    if (!file) return;
    const name = await showPrompt({
      title: '重命名文件',
      desc: '扩展名会自动保留。',
      value: file.name,
      confirmText: '重命名',
    });
    if (!name) return;
    let finalName = name.replace(/[\\/]/g, '-').trim();
    if (!finalName) return;
    if (!/\.[a-z0-9]{1,8}$/i.test(finalName)) finalName += '.md';
    if (finalName === file.name) return;
    finalName = uniqueName(finalName, id);

    if (state.diskMode) {
      if (state.activeId === id) {
        flushActiveFileToDisk();
        clearTimeout(saveTimer);
      }
      const result = desktop.renamePath(id, finalName);
      if (!result || !result.ok) {
        toast('重命名失败');
        return;
      }
      state.openTabs = state.openTabs.filter((tabId) => tabId !== id);
      state.editorStates.delete(id);
      state.editorScrolls.delete(id);
      state.previewScrolls.delete(id);
      state.dirtyIds.delete(id);
      if (state.activeId === id) state.activeId = null;
      reloadWorkspaceTree();
      renderTabs();
      openFile(result.path);
      toast('已重命名');
      return;
    }

    file.name = finalName;
    persistWorkspace();
    renderTree();
    renderTabs();
    if (state.activeId === id) updateStatusFile();
    toast('已重命名');
  }

  async function deleteFile(id) {
    const file = findFile(id);
    if (!file) return;
    const ok = await showConfirm({
      title: '删除文件',
      desc: state.diskMode
        ? `「${file.name}」将从磁盘上删除，此操作不可撤销。`
        : `「${file.name}」将从本地草稿中移除，此操作不可撤销。`,
      confirmText: '删除',
      danger: true,
    });
    if (!ok) return;

    if (state.diskMode) {
      const result = desktop.deletePath(id);
      if (!result || !result.ok) {
        toast('删除失败');
        return;
      }
      const wasActive = state.activeId === id;
      state.openTabs = state.openTabs.filter((tabId) => tabId !== id);
      state.editorStates.delete(id);
      state.editorScrolls.delete(id);
      state.previewScrolls.delete(id);
      state.dirtyIds.delete(id);
      if (wasActive) state.activeId = null;
      reloadWorkspaceTree();
      renderTabs();
      if (wasActive) {
        const next = state.openTabs[0] || walkFiles(state.tree)[0]?.id;
        if (next) openFile(next);
        else resetEmptyEditor();
      }
      toast(`已删除 ${file.name}`);
      return;
    }

    const found = findNodeWithParent(id);
    if (!found) return;
    found.list.splice(found.list.indexOf(found.node), 1);
    if (state.openTabs.includes(id)) closeTab(id);
    else renderTabs();
    persistWorkspace();
    renderTree();
    updateFileCount();
    toast(`已删除 ${file.name}`);
  }

  async function importFile(file) {
    if (!/\.(md|markdown|mdown|txt)$/i.test(file.name)) {
      toast('仅支持 Markdown / 文本文件');
      return;
    }
    let text;
    try {
      text = await file.text();
    } catch (err) {
      toast('读取文件失败');
      return;
    }
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const base = (file.name.split(/[\\/]/).pop() || '未命名.md').trim();
    const name = uniqueName(base);

    if (state.diskMode) {
      const result = desktop.createFile(state.workspaceRoot, name, text);
      if (!result || !result.ok) {
        toast('导入文件失败');
        return;
      }
      reloadWorkspaceTree();
      openFile(result.path);
      toast(`已导入 ${result.name}`);
      return;
    }

    const node = { type: 'file', id: uid(), name, content: text };
    state.tree.unshift(node);
    persistWorkspace();
    renderTree();
    updateFileCount();
    openFile(node.id);
    toast(`已导入 ${name}`);
  }

  function downloadMarkdown(file) {
    if (!file) {
      toast('当前没有打开的文件');
      return;
    }
    const blob = new Blob([file.content], { type: 'text/markdown;charset=utf-8' });
    downloadBlob(blob, file.name);
    if (/\]\(assets\//.test(file.content)) {
      toast('已下载 Markdown；文档内图片请用「导出 HTML」一起保存');
    } else {
      toast('已下载 Markdown 文件');
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function exportHTML() {
    const file = activeFile();
    if (!file) return;
    if (previewEdit) commitPreviewEdit({ render: false });
    renderPreview({ preserveScroll: true });
    await mermaidPromise;
    const clone = dom.previewPage.cloneNode(true);
    clone.querySelectorAll('[data-md-start]').forEach((el) => {
      el.removeAttribute('data-md-start');
      el.removeAttribute('data-md-end');
      el.removeAttribute('data-md-edit');
      el.removeAttribute('contenteditable');
      el.removeAttribute('spellcheck');
      el.removeAttribute('role');
      el.removeAttribute('title');
    });
    clone.querySelectorAll('.code-copy').forEach((el) => el.remove());
    clone.querySelectorAll('.mermaid-source').forEach((el) => el.remove());
    clone.querySelectorAll('.task-checkbox').forEach((el) => {
      el.disabled = true;
      el.setAttribute('disabled', '');
      if (el.checked) el.setAttribute('checked', 'checked');
      else el.removeAttribute('checked');
    });
    const title = file.name.replace(/\.[^.]+$/, '');
    const documentHtml = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${EXPORT_CSS}</style>
</head>
<body>
<article class="markdown-body">
${clone.innerHTML}
</article>
</body>
</html>`;
    downloadBlob(new Blob([documentHtml], { type: 'text/html;charset=utf-8' }), `${title}.html`);
    toast('已导出 HTML');
  }

  async function printPDF() {
    if (!activeFile()) return;
    if (previewEdit) commitPreviewEdit({ render: false });
    renderPreview({ preserveScroll: true });
    await mermaidPromise;
    toast('在打印窗口中选择「另存为 PDF」');
    setTimeout(() => window.print(), 180);
  }

  async function resetDemo() {
    const ok = await showConfirm({
      title: '重置示例数据',
      desc: '会清除本地草稿并恢复到初始示例。建议先下载需要保留的文档。',
      confirmText: '重置',
      danger: true,
    });
    if (!ok) return;
    storage.remove(KEY_WORKSPACE);
    storage.remove(KEY_ASSETS);
    storage.remove(KEY_TABS);
    location.reload();
  }

  /* ---------------- 图片 ---------------- */

  function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async function compressImage(file, dataUrl) {
    if (file.size < 900 * 1024) return dataUrl;
    try {
      const img = await loadImage(dataUrl);
      const maxSide = 1600;
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      if (scale === 1 && file.size < 2.5 * 1024 * 1024) return dataUrl;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const type = /png/i.test(file.type) ? 'image/png' : 'image/jpeg';
      return canvas.toDataURL(type, 0.88);
    } catch (err) {
      return dataUrl;
    }
  }

  async function handleImageFile(file) {
    if (!file || !file.type || !file.type.startsWith('image/')) return;
    try {
      const raw = await readAsDataURL(file);
      const url = await compressImage(file, raw);
      const alt = (file.name || '图片').replace(/\.[^.]+$/, '').replace(/[\[\]()]/g, '');
      const mime = (url.match(/^data:image\/([a-z0-9.+-]+);/i) || [])[1] || 'png';
      const ext = mime.includes('svg')
        ? 'svg'
        : mime.includes('jpeg')
          ? 'jpg'
          : mime.includes('png')
            ? 'png'
            : mime.includes('gif')
              ? 'gif'
              : mime.includes('webp')
                ? 'webp'
                : 'png';
      const assetPath = `assets/img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      if (state.diskMode) {
        const result = desktop.saveAsset(url, ext);
        if (!result || !result.ok) {
          toast('图片写入磁盘失败');
          return;
        }
        editor.insertText(`![${alt}](${result.path})`);
        toast('图片已保存到 assets/');
        return;
      }
      state.assets[assetPath] = url;
      persistWorkspace();
      editor.insertText(`![${alt}](${assetPath})`);
      toast(url.length > 2.5 * 1024 * 1024 ? '图片较大，可能超出本地存储限制' : '图片已插入文档');
    } catch (err) {
      toast('图片读取失败');
    }
  }

  /* ---------------- 提示 ---------------- */

  function toast(message) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    dom.toastWrap.appendChild(el);
    while (dom.toastWrap.children.length > 3) {
      dom.toastWrap.firstElementChild.remove();
    }
    setTimeout(() => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 240);
    }, 2300);
  }

  /* ---------------- GitHub Release 更新 ---------------- */

  function ensureUpdateBanner() {
    if (updateBanner) return updateBanner;
    const el = document.createElement('div');
    el.className = 'update-banner';
    el.id = 'updateBanner';
    el.hidden = true;
    el.innerHTML = `<div class="update-mark" aria-hidden="true">↑</div>
      <div class="update-body">
        <div class="update-title">发现新版本 <span class="update-version"></span></div>
        <div class="update-meta"></div>
        <div class="update-actions">
          <button class="btn primary update-action" type="button">下载并安装</button>
          <button class="btn update-later" type="button">稍后</button>
        </div>
      </div>
      <button class="icon-btn tiny update-close" type="button" title="关闭" aria-label="关闭更新提示">×</button>`;
    document.body.appendChild(el);
    $('.update-action', el).addEventListener('click', runUpdateAction);
    $('.update-later', el).addEventListener('click', () => hideUpdateBanner(true));
    $('.update-close', el).addEventListener('click', () => hideUpdateBanner(true));
    updateBanner = el;
    return el;
  }

  function setUpdateAction(label, disabled = false) {
    if (!updateBanner) return;
    const button = $('.update-action', updateBanner);
    if (!button) return;
    button.textContent = label;
    button.disabled = disabled;
  }

  function setUpdateMeta(text) {
    if (!updateBanner) return;
    const meta = $('.update-meta', updateBanner);
    if (meta) meta.textContent = text;
  }

  function showUpdateBanner(info) {
    updateInfo = info;
    const el = ensureUpdateBanner();
    $('.update-version', el).textContent = `v${info.latestVersion}`;
    setUpdateMeta(`当前 v${info.currentVersion} · 来自 GitHub Releases`);
    setUpdateAction(info.manualOnly ? '打开发布页' : '下载并安装', false);
    $('.update-later', el).style.display = '';
    el.hidden = false;
    updateBusy = false;
  }

  function hideUpdateBanner(skip = false) {
    if (skip && updateInfo) storage.set(KEY_UPDATE_SKIP, updateInfo.latestVersion);
    if (updateBanner) updateBanner.hidden = true;
    updateBusy = false;
  }

  function handleUpdateProgress(payload) {
    if (!updateBanner || !updateInfo || updateBanner.hidden) return;
    const percent = Number(payload?.percent) || 0;
    const received = Number(payload?.received) || 0;
    const total = Number(payload?.total) || 0;
    const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    setUpdateAction(percent ? `下载中 ${percent}%` : '下载中…', true);
    setUpdateMeta(
      total
        ? `已下载 ${mb(received)} / ${mb(total)}`
        : `已下载 ${mb(received)}`
    );
  }

  async function runUpdateAction() {
    if (!updateInfo || updateBusy || !desktop) return;
    if (updateInfo.manualOnly) {
      const result = await desktop.openReleasePage();
      if (!result || result.ok === false) toast('无法打开发布页');
      return;
    }
    updateBusy = true;
    setUpdateAction('准备下载…', true);
    setUpdateMeta(`正在从 GitHub 下载 v${updateInfo.latestVersion}`);
    const downloaded = await desktop.downloadUpdate();
    if (!downloaded || !downloaded.ok) {
      updateBusy = false;
      setUpdateAction('重新下载', false);
      setUpdateMeta(`当前 v${updateInfo.currentVersion} · 来自 GitHub Releases`);
      toast(downloaded?.error || '更新下载失败');
      return;
    }
    setUpdateAction('正在启动安装程序…', true);
    setUpdateMeta('下载完成，应用即将退出并打开安装程序。');
    const installed = await desktop.installUpdate();
    if (!installed || installed.ok === false) {
      updateBusy = false;
      setUpdateAction('重新安装', false);
      setUpdateMeta('安装程序启动失败，请到 Releases 手动下载。');
      toast(installed?.error || '无法启动安装程序');
    }
  }

  async function checkForAppUpdate({ manual = false } = {}) {
    if (!desktop || typeof desktop.checkForUpdates !== 'function') {
      if (manual) toast('当前是 HTML 版，更新请查看 GitHub Releases');
      return;
    }
    let result;
    try {
      result = await desktop.checkForUpdates();
    } catch (err) {
      if (manual) toast('检查更新失败');
      return;
    }
    if (!result || result.ok === false) {
      if (manual) toast(result?.error || '检查更新失败');
      return;
    }
    if (!result.available) {
      if (manual) toast(`已是最新版本 v${result.currentVersion}`);
      return;
    }
    if (!manual && storage.get(KEY_UPDATE_SKIP, '') === result.latestVersion) return;
    showUpdateBanner(result);
  }

  /* ---------------- 事件绑定 ---------------- */

  function bindGlobalEvents() {
    dom.sidebarToggle.addEventListener('click', toggleSidebar);
    dom.workspaceBtn.addEventListener('click', chooseWorkspaceFlow);
    dom.emptyNewBtn.addEventListener('click', newFileFlow);
    dom.emptyOpenBtn.addEventListener('click', () => {
      if (desktop) chooseWorkspaceFlow();
      else toast('桌面版支持打开文件夹');
    });
    dom.sidebarBackdrop.addEventListener('click', closeMobileSidebar);
    dom.newFileBtn.addEventListener('click', newFileFlow);
    dom.openBtn.addEventListener('click', () => dom.fileInput.click());
    dom.themeBtn.addEventListener('click', toggleTheme);
    dom.helpBtn.addEventListener('click', showHelp);
    dom.searchPill.addEventListener('click', openPalette);
    dom.fileInput.addEventListener('change', async () => {
      const files = Array.from(dom.fileInput.files || []);
      dom.fileInput.value = '';
      for (const file of files) await importFile(file);
    });
    dom.imageInput.addEventListener('change', () => {
      const file = dom.imageInput.files && dom.imageInput.files[0];
      dom.imageInput.value = '';
      if (file) handleImageFile(file);
    });

    $$('.sidebar-tab').forEach((btn) => {
      btn.addEventListener('click', () => setSidebarTab(btn.dataset.sideTab));
    });

    dom.filterInput.addEventListener('input', () => {
      state.filter = dom.filterInput.value;
      renderTree();
    });

    dom.tree.addEventListener('click', (event) => {
      const more = event.target.closest('[data-more]');
      if (more) {
        event.stopPropagation();
        openFileMenu(more.dataset.more, more);
        return;
      }
      const file = event.target.closest('[data-file]');
      if (file) {
        openFile(file.dataset.file);
        if (isMobile()) closeMobileSidebar();
        return;
      }
      const folder = event.target.closest('[data-folder]');
      if (folder) toggleFolder(folder.dataset.folder);
    });

    dom.tree.addEventListener('contextmenu', (event) => {
      const file = event.target.closest('[data-file]');
      if (!file) return;
      event.preventDefault();
      openFileMenu(file.dataset.file, { x: event.clientX, y: event.clientY });
    });

    dom.tabs.addEventListener('click', (event) => {
      const close = event.target.closest('[data-close-tab]');
      if (close) {
        event.stopPropagation();
        closeTab(close.dataset.closeTab);
        return;
      }
      const tab = event.target.closest('[data-tab]');
      if (tab) openFile(tab.dataset.tab);
    });
    dom.tabs.addEventListener('auxclick', (event) => {
      if (event.button !== 1) return;
      const tab = event.target.closest('[data-tab]');
      if (tab) {
        event.preventDefault();
        closeTab(tab.dataset.tab);
      }
    });
    dom.tabs.addEventListener(
      'wheel',
      (event) => {
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
        dom.tabs.scrollLeft += event.deltaY;
        event.preventDefault();
      },
      { passive: false }
    );

    dom.modeSwitch.addEventListener('click', (event) => {
      const button = event.target.closest('[data-mode]');
      if (button) setMode(button.dataset.mode);
    });

    dom.outline.addEventListener('click', (event) => {
      const item = event.target.closest('[data-outline]');
      if (!item) return;
      const index = Number(item.dataset.outline);
      const heading = state.outline[index];
      if (!heading) return;
      state.activeHeading = index;
      updateOutlineActive();
      suppressEditorSyncUntil = performance.now() + 900;
      if (state.mode !== 'editor') {
        const rendered = $$('h1,h2,h3,h4,h5,h6', dom.previewPage)[index];
        if (rendered) scrollPreviewToElement(rendered);
      }
      if (state.mode !== 'preview' && state.mode !== 'preview-edit') {
        editor.scrollToLine(heading.line);
      }
    });

    dom.fontMinus.addEventListener('click', () => setPreviewSize(state.previewSize - 1));
    dom.fontPlus.addEventListener('click', () => setPreviewSize(state.previewSize + 1));

    dom.exportBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      const exportOpen = popoverEl && popoverEl.dataset.menu === 'export';
      closePopover();
      if (!exportOpen) openExportMenu();
    });

    dom.editorBar.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button || !editor) return;
      const action = button.dataset.action;
      if (action === 'insert') {
        openInsertMenu(button);
        return;
      }
      if (action === 'h1') editor.setHeading(1);
      else if (action === 'h2') editor.setHeading(2);
      else if (action === 'h3') editor.setHeading(3);
      else if (action === 'bold') editor.wrap('**', '**', '加粗文字');
      else if (action === 'italic') editor.wrap('*', '*', '斜体文字');
      else if (action === 'strike') editor.wrap('~~', '~~', '删除文字');
      else if (action === 'code') editor.wrap('`', '`', '代码');
      else if (action === 'link') editor.link();
      else if (action === 'image') dom.imageInput.click();
      else if (action === 'quote') editor.prefixLines('quote');
      else if (action === 'ul') editor.prefixLines('ul');
      else if (action === 'ol') editor.prefixLines('ol');
      else if (action === 'task') editor.prefixLines('task');
      else if (action === 'mermaid') insertAction('mermaid');
    });

    dom.previewScroll.addEventListener(
      'scroll',
      () => {
        if (previewScrollRaf) return;
        previewScrollRaf = requestAnimationFrame(() => {
          previewScrollRaf = 0;
          updateActiveHeading();
        });
      },
      { passive: true }
    );

    dom.previewPage.addEventListener('change', (event) => {
      const checkbox = event.target.closest('.task-checkbox');
      if (!checkbox) return;
      const index = Number(checkbox.dataset.taskIndex);
      const lineNo = findTaskLine(index);
      if (lineNo == null) return;
      const li = checkbox.closest('li');
      if (li) li.classList.toggle('done', checkbox.checked);
      editor.toggleTaskLine(lineNo, checkbox.checked);
    });

    bindPreviewEditing();

    window.addEventListener('beforeunload', () => {
      if (!previewEdit) return;
      commitPreviewEdit({ render: false });
      if (state.diskMode) flushActiveFileToDisk();
      else persistWorkspace();
    });

    dom.previewPage.addEventListener('click', async (event) => {
      const copyBtn = event.target.closest('.code-copy');
      if (copyBtn) {
        const code = copyBtn.closest('.code-block')?.querySelector('code');
        const ok = code ? await copyText(code.textContent) : false;
        if (ok) {
          copyBtn.textContent = '已复制';
          setTimeout(() => {
            copyBtn.textContent = '复制';
          }, 1200);
        } else {
          toast('复制失败，请手动选择代码');
        }
        return;
      }

      const link = event.target.closest('a[href]');
      if (!link) return;
      const href = link.getAttribute('href') || '';
      if (href.startsWith('#')) {
        event.preventDefault();
        const target = document.getElementById(href.slice(1));
        if (target) scrollPreviewToElement(target);
        return;
      }
      if (/^https?:/i.test(href)) return;
      if (/\.md$/i.test(href)) {
        const name = decodeURIComponent(href.split('/').pop() || '');
        const file = walkFiles(state.tree).find((item) => item.name === name);
        if (file) {
          event.preventDefault();
          openFile(file.id);
        }
      }
    });

    // 编辑器内粘贴 / 拖入图片
    if (editor) {
      editor.view.contentDOM.addEventListener(
        'paste',
        (event) => {
          const items = Array.from(event.clipboardData?.items || []);
          const image = items.find((item) => item.type.startsWith('image/'));
          if (!image) return;
          const file = image.getAsFile();
          if (!file) return;
          event.preventDefault();
          event.stopPropagation();
          handleImageFile(file);
        },
        true
      );
      editor.view.contentDOM.addEventListener(
        'drop',
        (event) => {
          const files = Array.from(event.dataTransfer?.files || []);
          const image = files.find((file) => file.type.startsWith('image/'));
          if (!image) return;
          dragDepth = 0;
          const mask = document.getElementById('dropMask');
          if (mask) mask.classList.remove('show');
          event.preventDefault();
          event.stopPropagation();
          handleImageFile(image);
        },
        true
      );
    }

    initSplitter();

    document.addEventListener('keydown', onGlobalKeydown);

    document.addEventListener(
      'pointerdown',
      (event) => {
        if (!popoverEl) return;
        if (popoverEl.contains(event.target)) return;
        if (event.target.closest('#exportBtn')) return;
        closePopover();
      },
      true
    );

    document.addEventListener('dragover', (event) => {
      if (hasFiles(event)) event.preventDefault();
    });
    window.addEventListener('dragenter', (event) => {
      if (!hasFiles(event)) return;
      dragDepth += 1;
      const mask = document.getElementById('dropMask');
      if (mask) mask.classList.add('show');
    });
    window.addEventListener('dragleave', () => {
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) {
        const mask = document.getElementById('dropMask');
        if (mask) mask.classList.remove('show');
      }
    });
    window.addEventListener('drop', async (event) => {
      dragDepth = 0;
      const mask = document.getElementById('dropMask');
      if (mask) mask.classList.remove('show');
      const files = Array.from(event.dataTransfer?.files || []);
      if (!files.length) return;
      event.preventDefault();
      const docs = files.filter((file) => /\.(md|markdown|mdown|txt)$/i.test(file.name));
      if (docs.length) {
        for (const file of docs) await importFile(file);
      } else {
        toast('把图片拖进编辑器即可插入');
      }
    });

    window.addEventListener('beforeunload', () => {
      if (state.dirtyIds.size) persistWorkspace();
      saveTabs();
    });

    mql.addEventListener('change', () => {
      dom.app.classList.remove('sidebar-open');
      if (editor) editor.requestMeasure();
    });

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (editor) editor.requestMeasure();
      }, 120);
    });
  }

  let previewScrollRaf = 0;

  function hasFiles(event) {
    return !!event.dataTransfer && Array.from(event.dataTransfer.types || []).includes('Files');
  }

  function findTaskLine(index) {
    const file = activeFile();
    if (!file) return null;
    const lines = file.content.split('\n');
    let inFence = false;
    let fenceChar = '';
    let count = -1;
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const fence = line.match(/^\s*(`{3,}|~{3,})/);
      if (fence) {
        if (!inFence) {
          inFence = true;
          fenceChar = fence[1][0];
        } else if (fence[1][0] === fenceChar) {
          inFence = false;
          fenceChar = '';
        }
        continue;
      }
      if (inFence) continue;
      if (/^\s*[-*+]\s+\[[ xX]\]\s+/.test(line)) {
        count += 1;
        if (count === index) return i + 1;
      }
    }
    return null;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      try {
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand('copy');
        area.remove();
        return ok;
      } catch (fallbackErr) {
        return false;
      }
    }
  }

  function onGlobalKeydown(event) {
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    if (event.key === 'Escape') {
      if (closeTopOverlay()) event.preventDefault();
      return;
    }

    if (mod && key === 'p') {
      event.preventDefault();
      if (document.querySelector('.overlay') && !paletteEl) return;
      togglePalette();
      return;
    }

    if (event.key === 'F1') {
      event.preventDefault();
      if (!document.querySelector('.overlay')) showHelp();
      return;
    }

    if (document.querySelector('.overlay') || !editor) return;

    if (mod && key === 's') {
      event.preventDefault();
      saveNow(true);
      return;
    }

    if (isTypingInPlainField(event.target)) return;

    if (mod && !event.shiftKey && key === 'b') {
      event.preventDefault();
      editor.wrap('**', '**', '加粗文字');
      return;
    }
    if (mod && !event.shiftKey && key === 'i') {
      event.preventDefault();
      editor.wrap('*', '*', '斜体文字');
      return;
    }
    if (mod && !event.shiftKey && key === 'k') {
      event.preventDefault();
      editor.link();
      return;
    }
    if (mod && !event.shiftKey && key === 'e') {
      event.preventDefault();
      editor.wrap('`', '`', '代码');
      return;
    }
    if (mod && key === '\\') {
      event.preventDefault();
      toggleSidebar();
    }
  }

  function isTypingInPlainField(target) {
    if (!target || !(target instanceof Element)) return false;
    if (target.closest('.cm-editor')) return false;
    return (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    );
  }

  function initSplitter() {
    let dragging = false;
    dom.splitter.addEventListener('pointerdown', (event) => {
      if (state.mode !== 'split') return;
      dragging = true;
      dom.splitter.classList.add('dragging');
      dom.splitter.setPointerCapture(event.pointerId);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      event.preventDefault();
    });
    dom.splitter.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const rect = dom.workspace.getBoundingClientRect();
      const pct = ((event.clientX - rect.left) / rect.width) * 100;
      state.splitPct = Math.round(clamp(pct, 28, 72) * 10) / 10;
      dom.workspace.style.setProperty('--split', `${state.splitPct}%`);
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      dom.splitter.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      storage.set(KEY_SPLIT, state.splitPct);
      if (editor) editor.requestMeasure();
    };
    dom.splitter.addEventListener('pointerup', end);
    dom.splitter.addEventListener('pointercancel', end);
    dom.splitter.addEventListener('dblclick', () => {
      state.splitPct = 50;
      dom.workspace.style.setProperty('--split', '50%');
      storage.set(KEY_SPLIT, 50);
      if (editor) editor.requestMeasure();
    });
  }

  /* ---------------- 导入拖拽遮罩 ---------------- */

  function ensureDropMask() {
    if (document.getElementById('dropMask')) return;
    const mask = document.createElement('div');
    mask.className = 'drop-mask';
    mask.id = 'dropMask';
    mask.innerHTML = `<div class="drop-card">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7.5 10.5 12 15l4.5-4.5"/><path d="M4 17v2.5h16V17"/></svg>
      <span>松开以导入 Markdown 文件</span>
      <small>图片请直接拖进编辑器</small>
    </div>`;
    document.body.appendChild(mask);
  }

  /* ---------------- 初始化 ---------------- */

  function maybeOnboarding() {
    const params = new URLSearchParams(location.search);
    if (params.has('shot')) return;
    if (storage.get(KEY_VISITED, false)) return;
    setTimeout(() => {
      toast('提示：按 Ctrl + P 打开命令面板');
      storage.set(KEY_VISITED, true);
    }, 900);
  }

  async function init() {
    let initialOpenPath = null;
    const demoRequested = new URLSearchParams(location.search).get('demo') === '1';
    setTheme(resolveTheme());

    if (desktop) {
      try {
        const ws = await desktop.initWorkspace();
        applyWorkspace(ws);
        initialOpenPath = ws.openPath || null;
        state.assets = {};
      } catch (err) {
        console.error(err);
        state.diskMode = false;
        state.tree = loadWorkspace();
        const savedAssets = storage.get(KEY_ASSETS, null);
        state.assets =
          savedAssets && typeof savedAssets === 'object' && !Array.isArray(savedAssets)
            ? savedAssets
            : {};
        toast('工作区加载失败，已切换为临时工作区');
      }
    } else {
      state.tree = demoRequested ? buildDemoWorkspace() : loadWorkspace();
      const savedAssets = storage.get(KEY_ASSETS, null);
      state.assets =
        savedAssets && typeof savedAssets === 'object' && !Array.isArray(savedAssets)
          ? savedAssets
          : {};
    }

    readTabs();
    state.sidebarTab = storage.get(KEY_SIDEBAR_TAB, 'files') === 'outline' ? 'outline' : 'files';
    state.splitPct = clamp(Number(storage.get(KEY_SPLIT, 50)) || 50, 28, 72);
    state.previewSize = clamp(Number(storage.get(KEY_PREVIEW_SIZE, 16)) || 16, 14, 20);

    dom.workspace.style.setProperty('--split', `${state.splitPct}%`);
    applyPreviewSize();

    if (!isMobile() && storage.get(KEY_SIDEBAR, false)) {
      dom.app.classList.add('sidebar-collapsed');
    }

    setMode(resolveMode(), { persist: false, focus: false });
    setSidebarTab(state.sidebarTab);
    renderTree();
    renderTabs();
    initEditor();
    renderPreview({ preserveScroll: false });
    updateStatusFile();
    updateWordCount();
    updateFileCount();
    updateCursor();
    ensureDropMask();
    bindGlobalEvents();

    if (desktop) {
      desktop.onWorkspace(handleWorkspacePayload);
      if (desktop.onUpdateProgress) desktop.onUpdateProgress(handleUpdateProgress);
      setTimeout(() => checkForAppUpdate(), 4500);
    }

    if (initialOpenPath && findFile(initialOpenPath)) {
      openFile(initialOpenPath, { focus: false });
    }

    requestAnimationFrame(() => {
      if (!isMobile() && state.mode !== 'preview' && state.mode !== 'preview-edit') editor.focus();
    });

    maybeOnboarding();
  }

  /* ---------------- 导出 HTML 样式 ---------------- */

  const EXPORT_CSS = `
*{box-sizing:border-box}
html{background:#fff;color-scheme:light}
body{margin:0;padding:48px 24px 96px;background:#fff;color:#111827;font-family:"Inter","Segoe UI","Microsoft YaHei UI","Microsoft YaHei","PingFang SC",sans-serif;font-size:15px;line-height:1.75;-webkit-font-smoothing:antialiased}
.markdown-body{max-width:720px;margin:0 auto}
.markdown-body>:first-child{margin-top:0!important}
.markdown-body>:last-child{margin-bottom:0!important}
.markdown-body h1,.markdown-body h2,.markdown-body h3,.markdown-body h4,.markdown-body h5,.markdown-body h6{color:#111827;font-weight:500;line-height:1.25;text-wrap:balance}
.markdown-body h1{margin:0 0 24px;padding-bottom:16px;font-size:30px;border-bottom:1px solid #e5e7eb}
.markdown-body h2{margin:40px 0 16px;font-size:22px}
.markdown-body h3{margin:28px 0 8px;font-size:17px}
.markdown-body h4,.markdown-body h5,.markdown-body h6{margin:24px 0 8px;font-size:15px;color:#4b5565}
.markdown-body p{margin:12px 0}
.markdown-body a{color:#147a45;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px}
.markdown-body strong{font-weight:600}
.markdown-body em{font-style:italic}
.markdown-body del{color:#6b7487}
.markdown-body ul,.markdown-body ol{margin:8px 0;padding-left:24px}
.markdown-body li{margin:4px 0}
.markdown-body li::marker{color:#6b7487}
.markdown-body li>ul,.markdown-body li>ol{margin:4px 0}
.markdown-body blockquote{margin:24px 0;padding:12px 16px;border-left:2px solid #16a34a;border-radius:0 8px 8px 0;background:#f6f8fa;color:#374151}
.markdown-body blockquote p{margin:4px 0}
.markdown-body blockquote blockquote{margin:8px 0;background:transparent}
.markdown-body hr{margin:32px 0;border:0;border-top:1px solid #e5e7eb;height:0}
.markdown-body img{display:block;max-width:100%;height:auto;margin:24px auto;border:1px solid #e5e7eb;border-radius:8px}
.markdown-body code{padding:2px 6px;border:0;border-radius:4px;background:#f3f5f7;color:#8a3a78;font-family:"Cascadia Code","JetBrains Mono",Consolas,monospace;font-size:13px;white-space:break-spaces}
.code-block{margin:24px 0;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;background:#f6f8fa}
.code-block-head{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#eef1f5;border-bottom:1px solid #e5e7eb;color:#6b7487;font-family:"Cascadia Code","JetBrains Mono",Consolas,monospace;font-size:11px}
.code-block pre{margin:0;padding:16px;overflow-x:auto;color:#111827;font-family:"Cascadia Code","JetBrains Mono",Consolas,monospace;font-size:13px;line-height:1.65}
.code-block code{padding:0;border:0;background:none;color:inherit;font-size:inherit;white-space:pre}
.hljs-keyword,.hljs-selector-tag,.hljs-literal,.hljs-doctag{color:#9b3d6b}
.hljs-string,.hljs-regexp,.hljs-addition{color:#3f6b3f}
.hljs-number,.hljs-symbol,.hljs-bullet{color:#9a5b2a}
.hljs-comment,.hljs-quote{color:#6b7487}
.hljs-title,.hljs-section,.hljs-title.function_{color:#1f4e79}
.hljs-attr,.hljs-attribute,.hljs-variable,.hljs-template-variable{color:#8a6a2a}
.hljs-built_in,.hljs-class .hljs-title,.hljs-type{color:#1f5f73}
.hljs-meta,.hljs-selector-id,.hljs-selector-class{color:#6b7487}
.hljs-tag,.hljs-name{color:#2e6b7a}
.hljs-deletion{color:#b3402c}
.table-wrap{margin:24px 0;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;overflow-x:auto;background:#fff}
.markdown-body table{width:100%;border-collapse:collapse;font-size:13px;line-height:1.6}
.markdown-body th{padding:8px 12px;background:#f6f8fa;color:#111827;font-weight:500;text-align:left;border-bottom:1px solid #e5e7eb}
.markdown-body td{padding:8px 12px;border-bottom:1px solid #e5e7eb;vertical-align:top}
.markdown-body tbody tr:last-child td{border-bottom:0}
.markdown-body .task-item{list-style:none;margin-left:-20px}
.markdown-body .task-item>p{margin:4px 0}
.markdown-body .task-checkbox{appearance:none;-webkit-appearance:none;width:16px;height:16px;margin:0 8px 0 0;position:relative;vertical-align:-3px;border:1px solid #c9d2df;border-radius:4px;background:#fff;opacity:1}
.markdown-body .task-checkbox:checked{background:#16a34a;border-color:#16a34a}
.markdown-body .task-checkbox:checked::after{content:"";position:absolute;left:4px;top:1px;width:4px;height:8px;border:1.5px solid #fff;border-top:0;border-left:0;transform:rotate(42deg)}
.markdown-body .task-item.done{color:#6b7487;text-decoration:line-through;text-decoration-color:rgba(107,116,135,.5)}
.markdown-body .callout{--callout-color:#16a34a;margin:24px 0;padding:12px 16px;border-left:2px solid var(--callout-color);border-radius:0 8px 8px 0;background:#f6f8fa}
.markdown-body .callout-title{margin-bottom:4px;color:var(--callout-color);font-size:12px;font-weight:500;letter-spacing:0}
.markdown-body .callout-note{--callout-color:#147a45;background:#f6f8fa}
.markdown-body .callout-tip{--callout-color:#16a34a;background:#f3faf5}
.markdown-body .callout-important{--callout-color:#16a34a;background:#f6f8fa}
.markdown-body .callout-warning{--callout-color:#a16207;background:#fbf7ed}
.markdown-body .callout-caution{--callout-color:#dc2626;background:#fcf4f4}
.mermaid-block{margin:24px 0;border:1px solid #e5e7eb;border-radius:10px;background:#f6f8fa;padding:16px;display:flex;justify-content:center;overflow-x:auto}
.mermaid-source{display:none}
.mermaid-block svg{max-width:100%;height:auto}
@media print{html,body{padding:0;background:#fff}.markdown-body{max-width:none}.code-block,.mermaid-block,.markdown-body img,.markdown-body table,.markdown-body blockquote{break-inside:avoid;-webkit-print-color-adjust:exact;print-color-adjust:exact}.code-block-head{display:none}@page{margin:18mm 16mm}}
`;

  /* ---------------- 启动 ---------------- */

  init().catch((err) => {
    console.error(err);
  });
})();
