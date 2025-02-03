const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');

let mainWindow;
let tray;
let store;

// Initialize electron store
const initStore = async () => {
  const Store = await import('electron-store');
  store = new Store.default();
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: true,
    },
    icon: path.join(__dirname, 'assets/icon.png')
  });

  // Enable webview debugging and error handling
  mainWindow.webContents.on('did-attach-webview', (event, webContents) => {
    // Log webview errors
    webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log(`WebView Console [${level}]:`, message);
      if (level >= 2) { // Warning or Error
        console.error('Source:', sourceId, 'Line:', line);
      }
    });
    
    webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('WebView Load Failed:', {
        error: errorDescription,
        code: errorCode,
        url: validatedURL
      });
    });

    webContents.on('crashed', (event, killed) => {
      console.error('WebView crashed:', killed ? 'killed' : 'crashed');
      webContents.reload();
    });

    webContents.on('unresponsive', () => {
      console.error('WebView became unresponsive');
      webContents.reload();
    });
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Handle window minimize to tray
  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  // Handle window close to tray
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'assets/icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setToolTip('Dual WhatsApp');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

// App ready event
app.whenReady().then(async () => {
  await initStore();
  createWindow();
  createTray();
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for settings
ipcMain.handle('save-settings', async (event, settings) => {
  if (store) {
    store.set('settings', settings);
  }
});

ipcMain.handle('get-settings', async () => {
  const defaultSettings = {
    personal: {
      notifications: true,
      url: 'https://web.whatsapp.com'
    },
    business: {
      notifications: true,
      url: 'https://web.whatsapp.com'
    }
  };
  
  if (!store) return defaultSettings;
  return store.get('settings', defaultSettings);
});
