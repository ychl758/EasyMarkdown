const { contextBridge, ipcRenderer } = require('electron');

const sync = (channel, ...args) => ipcRenderer.sendSync(channel, ...args);

contextBridge.exposeInMainWorld('easyMarkdown', {
  isDesktop: true,
  initWorkspace: () => ipcRenderer.invoke('workspace:init'),
  chooseWorkspace: () => ipcRenderer.invoke('workspace:choose'),
  refreshWorkspace: () => sync('workspace:read-sync'),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  openReleasePage: () => ipcRenderer.invoke('update:open-release'),
  openPath: (filePath) => ipcRenderer.invoke('workspace:open-path', filePath),
  revealWorkspace: () => ipcRenderer.invoke('workspace:reveal'),
  writeFile: (filePath, content) => sync('file:write-sync', filePath, content),
  createFile: (parent, name, content) => sync('file:create-sync', parent, name, content),
  renamePath: (filePath, name) => sync('file:rename-sync', filePath, name),
  deletePath: (filePath) => sync('file:delete-sync', filePath),
  saveAsset: (dataUrl, ext) => sync('asset:save-sync', dataUrl, ext),
  readAsset: (relativePath) => sync('asset:read-sync', relativePath),
  onWorkspace: (callback) => {
    ipcRenderer.on('app:workspace', (_event, payload) => callback(payload));
  },
  onUpdateProgress: (callback) => {
    ipcRenderer.on('app:update-progress', (_event, payload) => callback(payload));
  },
});
