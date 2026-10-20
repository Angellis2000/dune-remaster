const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('duneDesktop', Object.freeze({ quit: () => ipcRenderer.send('dune:quit') }));
