const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getHwid: () => ipcRenderer.invoke('get-hwid'),
  platform: process.platform,
  isElectron: true
});
