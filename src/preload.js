const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  selectOutputDirectory: () => ipcRenderer.invoke('dialog:select-output-directory'),
  saveConverted: (payload) => ipcRenderer.invoke('file:save-converted', payload),
  showItem: (targetPath) => ipcRenderer.invoke('shell:show-item', targetPath),
  openDirectory: (directory) => ipcRenderer.invoke('shell:open-directory', directory),
});
