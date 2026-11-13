/* EasyMarkdown · 编辑器内核打包入口
 * CodeMirror 6 + markdown-it + highlight.js + DOMPurify
 * 构建后暴露 window.EasyMarkdownKit，供 app.js 调用。
 */
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  dropCursor,
  highlightSpecialChars,
  placeholder,
  rectangularSelection,
  crosshairCursor,
} from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches, search } from '@codemirror/search';
import { markdown } from '@codemirror/lang-markdown';
import {
  syntaxHighlighting,
  HighlightStyle,
  bracketMatching,
  indentOnInput,
} from '@codemirror/language';
import { tags } from '@lezer/highlight';

import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import sql from 'highlight.js/lib/languages/sql';
import yaml from 'highlight.js/lib/languages/yaml';
import markdownLang from 'highlight.js/lib/languages/markdown';
import diff from 'highlight.js/lib/languages/diff';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import csharp from 'highlight.js/lib/languages/csharp';
import DOMPurify from 'dompurify';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);
hljs.registerLanguage('markdown', markdownLang);
hljs.registerLanguage('md', markdownLang);
hljs.registerLanguage('diff', diff);
hljs.registerLanguage('go', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('cs', csharp);

/* ---------------- 编辑器主题 ---------------- */

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'transparent',
    color: 'var(--text)',
    fontSize: 'var(--editor-size)',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono)',
    lineHeight: '1.7',
    overflow: 'auto',
  },
  '.cm-content': {
    padding: '24px 0 40vh',
    caretColor: 'var(--accent)',
  },
  '.cm-line': { padding: '0 24px 0 12px' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-4)',
    paddingLeft: '12px',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    minWidth: '24px',
    padding: '0 2px 0 0',
    fontSize: '12px',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: 'var(--accent)',
  },
  '.cm-activeLine': { backgroundColor: 'var(--editor-active)' },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--accent)',
    borderLeftWidth: '2px',
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection':
    { backgroundColor: 'var(--selection) !important' },
  '.cm-selectionMatch': { backgroundColor: 'var(--selection-match)' },
  '.cm-searchMatch': {
    backgroundColor: 'var(--search-match)',
    outline: '1px solid var(--search-match-border)',
    borderRadius: '2px',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'var(--search-match-active)',
  },
  '.cm-panels': {
    backgroundColor: 'var(--surface)',
    color: 'var(--text)',
    fontFamily: 'var(--font-ui)',
  },
  '.cm-panels.cm-panels-top': { borderBottom: '1px solid var(--border)' },
  '.cm-panel.cm-search': {
    padding: '9px 12px',
    fontFamily: 'var(--font-ui)',
    fontSize: '12px',
  },
  '.cm-panel.cm-search label': { color: 'var(--text-2)', fontSize: '12px' },
  '.cm-textfield': {
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--text)',
    padding: '4px 8px',
    outline: 'none',
    fontFamily: 'var(--font-ui)',
  },
  '.cm-textfield:focus': { borderColor: 'var(--accent)' },
  '.cm-button': {
    background: 'var(--surface-2)',
    backgroundImage: 'none',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--text-2)',
    padding: '4px 10px',
    fontFamily: 'var(--font-ui)',
    cursor: 'pointer',
  },
  '.cm-button:hover': { background: 'var(--hover)' },
  '.cm-panel.cm-search [name=close]': {
    color: 'var(--text-2)',
    fontSize: '18px',
    padding: '0 8px',
    cursor: 'pointer',
  },
  '.cm-tooltip': {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
  },
});

const mdHighlight = HighlightStyle.define([
  { tag: tags.heading1, color: 'var(--syntax-heading)', fontWeight: '600' },
  { tag: tags.heading2, color: 'var(--syntax-heading)', fontWeight: '600' },
  { tag: tags.heading3, color: 'var(--syntax-heading)', fontWeight: '600' },
  { tag: tags.heading4, color: 'var(--syntax-heading)', fontWeight: '600' },
  { tag: tags.heading5, color: 'var(--syntax-heading)', fontWeight: '600' },
  { tag: tags.heading6, color: 'var(--syntax-heading)', fontWeight: '600' },
  { tag: tags.strong, fontWeight: '600', color: 'var(--text)' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: 'var(--text-3)' },
  { tag: tags.link, color: 'var(--link)' },
  { tag: tags.url, color: 'var(--text-3)', textDecoration: 'underline' },
  {
    tag: tags.monospace,
    color: 'var(--syntax-code)',
    backgroundColor: 'var(--code-bg)',
    borderRadius: '4px',
  },
  {
    tag: [tags.meta, tags.processingInstruction],
    color: 'var(--syntax-mark)',
    fontWeight: '400',
  },
  { tag: tags.quote, color: 'var(--syntax-quote)' },
  { tag: tags.contentSeparator, color: 'var(--syntax-mark)' },
  { tag: tags.list, color: 'var(--syntax-mark)' },
  { tag: tags.escape, color: 'var(--syntax-mark)' },
  { tag: tags.comment, color: 'var(--text-3)' },
  { tag: tags.keyword, color: 'var(--syntax-keyword)' },
  { tag: tags.string, color: 'var(--syntax-string)' },
  { tag: tags.number, color: 'var(--syntax-number)' },
  { tag: tags.typeName, color: 'var(--syntax-type)' },
  { tag: tags.function(tags.variableName), color: 'var(--syntax-function)' },
]);

/* ---------------- 编辑器工厂 ---------------- */

function createEditor({ parent, doc = '', onChange, onSelection }) {
  const extensions = [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    bracketMatching(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    search({ top: true }),
    EditorView.lineWrapping,
    keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
    markdown(),
    syntaxHighlighting(mdHighlight),
    editorTheme,
    placeholder('开始写作，或按 Ctrl + P 打开命令面板…'),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange && onChange(update.state.doc.toString());
      }
      if (update.docChanged || update.selectionSet) {
        onSelection && onSelection(selectionInfo(view));
      }
    }),
  ];

  const view = new EditorView({
    parent,
    state: EditorState.create({ doc, extensions }),
  });

  function selectionInfo(v) {
    const pos = v.state.selection.main.head;
    const line = v.state.doc.lineAt(pos);
    return { line: line.number, col: pos - line.from + 1 };
  }

  function makeState(text) {
    return EditorState.create({ doc: text, extensions });
  }

  function focus() {
    view.focus();
  }

  function setState(next) {
    view.setState(next);
  }

  function setDoc(text) {
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: text },
    });
  }

  function insertText(text, selectFrom = null, selectTo = null) {
    const sel = view.state.selection.main;
    const anchor = selectFrom == null ? sel.from + text.length : sel.from + selectFrom;
    const head = selectTo == null ? anchor : sel.from + selectTo;
    view.dispatch({
      changes: { from: sel.from, to: sel.to, insert: text },
      selection: { anchor, head },
      scrollIntoView: true,
    });
    focus();
  }

  function wrap(before, after, placeholderText = '文字') {
    const sel = view.state.selection.main;
    const selected = view.state.sliceDoc(sel.from, sel.to);
    const text = selected || placeholderText;
    const insert = before + text + after;
    const anchor = sel.from + before.length;
    view.dispatch({
      changes: { from: sel.from, to: sel.to, insert },
      selection: { anchor, head: anchor + text.length },
      scrollIntoView: true,
    });
    focus();
  }

  function link() {
    const sel = view.state.selection.main;
    const text = view.state.sliceDoc(sel.from, sel.to) || '链接文字';
    const insert = `[${text}](https://)`;
    const urlStart = sel.from + 1 + text.length + 2;
    view.dispatch({
      changes: { from: sel.from, to: sel.to, insert },
      selection: { anchor: urlStart, head: urlStart + 8 },
      scrollIntoView: true,
    });
    focus();
  }

  function insertBlock(text) {
    const sel = view.state.selection.main;
    const doc = view.state.doc;
    const startLine = doc.lineAt(sel.from);
    const endLine = doc.lineAt(sel.to);
    const beforeText = view.state.sliceDoc(startLine.from, sel.from);
    const afterText = view.state.sliceDoc(sel.to, endLine.to);
    const prevText = startLine.number > 1 ? doc.line(startLine.number - 1).text : '';
    const nextText = endLine.number < doc.lines ? doc.line(endLine.number + 1).text : '';
    const prefix = beforeText.trim() || prevText.trim() ? '\n\n' : '';
    const suffix = afterText.trim() || nextText.trim() ? '\n\n' : '';
    const insert = prefix + text + suffix;
    view.dispatch({
      changes: { from: sel.from, to: sel.to, insert },
      selection: { anchor: sel.from + prefix.length + text.length },
      scrollIntoView: true,
    });
    focus();
  }

  function setHeading(level) {
    const sel = view.state.selection.main;
    const line = view.state.doc.lineAt(sel.from);
    const clean = line.text.replace(/^\s*#{1,6}\s+/, '').replace(/\s+#+\s*$/, '');
    const text = `${'#'.repeat(level)} ${clean}`.trimEnd();
    view.dispatch({
      changes: { from: line.from, to: line.to, insert: text },
      selection: { anchor: line.from + text.length },
      scrollIntoView: true,
    });
    focus();
  }

  function prefixLines(kind) {
    const sel = view.state.selection.main;
    const start = view.state.doc.lineAt(sel.from).number;
    const end = view.state.doc.lineAt(sel.to).number;
    const changes = [];
    let n = 0;
    for (let lineNo = start; lineNo <= end; lineNo++) {
      const line = view.state.doc.line(lineNo);
      let prefix = '';
      if (kind === 'ul') prefix = '- ';
      else if (kind === 'ol') prefix = `${++n}. `;
      else if (kind === 'task') prefix = '- [ ] ';
      else if (kind === 'quote') prefix = '> ';
      const stripped = line.text.replace(
        /^(\s*)([-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+\.\s+|>\s+)?/,
        ''
      );
      const removeLen = line.text.length - stripped.length;
      changes.push({ from: line.from, to: line.from + removeLen, insert: prefix });
    }
    view.dispatch({ changes, scrollIntoView: true });
    focus();
  }

  function toggleTaskLine(lineNo, checked) {
    const line = view.state.doc.line(lineNo);
    const m = line.text.match(/^(\s*[-*+]\s+\[)([ xX])(\])/);
    if (!m) return false;
    const pos = line.from + m[1].length;
    view.dispatch({ changes: { from: pos, to: pos + 1, insert: checked ? 'x' : ' ' } });
    return true;
  }

  function scrollToLine(lineNo) {
    const doc = view.state.doc;
    const line = doc.line(Math.min(Math.max(1, lineNo), doc.lines));
    view.dispatch({
      selection: { anchor: line.from },
      effects: EditorView.scrollIntoView(line.from, { y: 'start', yMargin: 70 }),
    });
    focus();
  }

  function getScrollTop() {
    return view.scrollDOM.scrollTop;
  }

  function setScrollTop(v) {
    view.scrollDOM.scrollTop = v;
  }

  function onScroll(cb) {
    view.scrollDOM.addEventListener('scroll', cb, { passive: true });
  }

  function requestMeasure() {
    view.requestMeasure();
  }

  return {
    view,
    makeState,
    setState,
    setDoc,
    getDoc: () => view.state.doc.toString(),
    getState: () => view.state,
    focus,
    insertText,
    wrap,
    link,
    insertBlock,
    setHeading,
    prefixLines,
    toggleTaskLine,
    scrollToLine,
    getScrollTop,
    setScrollTop,
    onScroll,
    requestMeasure,
    selectionInfo: () => selectionInfo(view),
  };
}

/* ---------------- Markdown 渲染 ---------------- */

const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: false,
  typographer: false,
});

/* 每个顶层块记住自己在源文中的范围，供「预览编辑」就地回写。
 * 只标 level 0，列表/引用里的子块仍由外层整块编辑。
 */
function sourceEnv(source) {
  const lines = source.split('\n');
  const starts = [0];
  for (let i = 0; i < lines.length; i++) starts.push(starts[i] + lines[i].length + 1);
  return { source, lines, starts };
}

function blockRange(token, env) {
  if (!token.map || token.level !== 0) return null;
  const startLine = token.map[0];
  let endLine = token.map[1];
  while (endLine > startLine && !env.lines[endLine - 1].trim()) endLine--;
  const start = env.starts[startLine];
  const rawEnd = endLine < env.starts.length ? env.starts[endLine] : env.source.length;
  let end = Math.min(rawEnd, env.source.length);
  /* 不把块尾换行算进编辑范围，替换后原来的分隔空行仍在。 */
  if (end > start && env.source[end - 1] === '\n') end -= 1;
  if (end > start && env.source[end - 1] === '\r') end -= 1;
  if (start == null || end == null || end <= start) return null;
  return { start, end };
}

function mdRangeAttrs(token, env) {
  const range = blockRange(token, env);
  return range ? ` data-md-start="${range.start}" data-md-end="${range.end}"` : '';
}

function addMdRange(html, attrs) {
  if (!attrs) return html;
  return html.replace(/^<([a-zA-Z][\w-]*)/, `<$1${attrs}`);
}

for (const rule of [
  'heading_open',
  'paragraph_open',
  'bullet_list_open',
  'ordered_list_open',
  'blockquote_open',
  'table_open',
]) {
  md.renderer.rules[rule] = (tokens, idx, options, env, self) => {
    const html = md.renderer.renderToken(tokens, idx, options, env, self);
    return addMdRange(html, mdRangeAttrs(tokens[idx], env));
  };
}

const baseHr =
  md.renderer.rules.hr ||
  ((tokens, idx, options) => md.renderer.renderToken(tokens, idx, options));
md.renderer.rules.hr = (tokens, idx, options, env, self) => {
  const html = baseHr(tokens, idx, options, env, self);
  return addMdRange(html, mdRangeAttrs(tokens[idx], env));
};

const baseCodeBlock = md.renderer.rules.code_block;
md.renderer.rules.code_block = (tokens, idx, options, env, self) => {
  const html = baseCodeBlock(tokens, idx, options, env, self);
  return addMdRange(html, mdRangeAttrs(tokens[idx], env));
};

md.renderer.rules.fence = function (tokens, idx, options, env) {
  const token = tokens[idx];
  const attrs = mdRangeAttrs(token, env);
  const info = token.info ? token.info.trim().split(/\s+/)[0] : '';
  if (info === 'mermaid') {
    return (
      `<div class="mermaid-block"${attrs}>` +
      `<pre class="mermaid-source">${md.utils.escapeHtml(token.content)}</pre>` +
      '<div class="mermaid-canvas"><span class="mermaid-loading">正在渲染图表…</span></div>' +
      '</div>'
    );
  }
  const known = info && hljs.getLanguage(info);
  let body;
  try {
    body = known
      ? hljs.highlight(token.content, { language: info, ignoreIllegals: true }).value
      : md.utils.escapeHtml(token.content);
  } catch (e) {
    body = md.utils.escapeHtml(token.content);
  }
  const label = info || 'text';
  return (
    `<div class="code-block" data-lang="${md.utils.escapeHtml(label)}"${attrs}>` +
    `<div class="code-block-head"><span class="code-lang">${md.utils.escapeHtml(label)}</span>` +
    `<button class="code-copy" type="button" aria-label="复制代码">复制</button></div>` +
    `<pre class="hljs"><code>${body}</code></pre></div>`
  );
};

function renderMarkdown(source) {
  const text = source || '';
  const raw = md.render(text, sourceEnv(text));
  return DOMPurify.sanitize(raw, {
    ADD_ATTR: ['target', 'rel'],
    ADD_DATA_URI_TAGS: ['img'],
    ALLOW_DATA_ATTR: true,
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['style', 'onerror', 'onload'],
  });
}

window.EasyMarkdownKit = { createEditor, renderMarkdown };
