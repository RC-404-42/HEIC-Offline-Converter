const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

const APP_TITLE = 'HEIC 離線轉檔器';

function createWindow() {
  const window = new BrowserWindow({
    width: 1060,
    height: 760,
    minWidth: 780,
    minHeight: 620,
    title: APP_TITLE,
    backgroundColor: '#090b12',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.loadFile(path.join(__dirname, 'index.html'));
  window.once('ready-to-show', () => window.show());

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
}

function sanitizeOutputName(fileName) {
  const baseName = path.basename(String(fileName || 'converted.jpg'));
  const sanitized = baseName
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
    .replace(/[. ]+$/g, '')
    .slice(0, 220);
  return sanitized || 'converted.jpg';
}

async function unusedPath(directory, fileName) {
  const safeName = sanitizeOutputName(fileName);
  const extension = path.extname(safeName);
  const stem = path.basename(safeName, extension);
  let candidate = path.join(directory, safeName);

  for (let suffix = 2; suffix < 10_000; suffix += 1) {
    try {
      await fs.access(candidate);
      candidate = path.join(directory, `${stem} (${suffix})${extension}`);
    } catch {
      return candidate;
    }
  }

  throw new Error('同名檔案太多，請選擇另一個輸出資料夾。');
}

app.whenReady().then(() => {
  ipcMain.handle('dialog:select-output-directory', async () => {
    const result = await dialog.showOpenDialog({
      title: '選擇轉換後圖片的儲存位置',
      properties: ['openDirectory', 'createDirectory'],
    });

    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('file:save-converted', async (_event, payload) => {
    const rawDirectory = String(payload?.directory || '');
    const bytes = payload?.bytes;

    if (!path.isAbsolute(rawDirectory) || !bytes) {
      throw new Error('輸出資料不完整。');
    }

    const directory = path.resolve(rawDirectory);

    const directoryInfo = await fs.stat(directory);
    if (!directoryInfo.isDirectory()) {
      throw new Error('選擇的輸出位置不是資料夾。');
    }

    const targetPath = await unusedPath(directory, payload.fileName);
    const temporaryPath = `${targetPath}.part-${process.pid}-${Date.now()}`;

    try {
      await fs.writeFile(temporaryPath, Buffer.from(bytes));
      await fs.rename(temporaryPath, targetPath);
    } catch (error) {
      await fs.rm(temporaryPath, { force: true }).catch(() => {});
      throw error;
    }

    return targetPath;
  });

  ipcMain.handle('shell:show-item', async (_event, targetPath) => {
    shell.showItemInFolder(path.resolve(String(targetPath)));
  });

  ipcMain.handle('shell:open-directory', async (_event, directory) => {
    const message = await shell.openPath(path.resolve(String(directory)));
    if (message) throw new Error(message);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
