const { app, BrowserWindow, ipcMain, Tray, Menu, dialog } = require('electron');
const path = require('path');

let mainWindow;
let tray;
let store;
let isQuitting = false;

// Initialize electron store
const initStore = async () => {
  try {
    const Store = await import('electron-store');
    store = new Store.default();
    console.log('Electron Store initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Electron Store:', error);
    dialog.showErrorBox(
      'Initialization Error',
      'Failed to initialize settings storage. The application may not function correctly.\n\n' +
      'Error: ' + error.message
    );
    return false;
  }
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
      // The renderer will handle reloading
    });

    webContents.on('unresponsive', () => {
      console.error('WebView became unresponsive');
      // The renderer will handle reloading
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
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });
  
  // Monitor memory usage
  let memoryTimer = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      clearInterval(memoryTimer);
      return;
    }
    
    try {
      const memoryInfo = process.getProcessMemoryInfo();
      memoryInfo.then(info => {
        const memoryUsageMB = Math.round(info.private / 1024 / 1024);
        console.log(`Memory usage: ${memoryUsageMB} MB`);
        
        // If memory usage is too high (> 1GB), suggest a restart
        if (memoryUsageMB > 1000) {
          console.warn('High memory usage detected. Consider restarting the app.');
          mainWindow.webContents.send('memory-warning', memoryUsageMB);
        }
      }).catch(err => {
        console.error('Error getting memory info:', err);
      });
    } catch (error) {
      console.error('Failed to check memory usage:', error);
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
}

function createTray() {
  try {
    tray = new Tray(path.join(__dirname, 'assets/icon.png'));
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show App',
        click: () => {
          mainWindow.show();
        }
      },
      {
        label: 'Restart App',
        click: () => {
          app.relaunch();
          app.exit(0);
        }
      },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);
    tray.setToolTip('Dual WhatsApp');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    });
  } catch (error) {
    console.error('Failed to create tray:', error);
  }
}

// App ready event
app.whenReady().then(async () => {
  try {
    await initStore();
    createWindow();
    createTray();
  } catch (error) {
    console.error('Error during app initialization:', error);
    dialog.showErrorBox(
      'Startup Error',
      'An error occurred during application startup.\n\n' +
      'Error: ' + error.message
    );
  }
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    isQuitting = true;
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Set the app to quit properly
app.on('before-quit', () => {
  isQuitting = true;
});

// IPC handlers for settings
ipcMain.handle('save-settings', async (event, settings) => {
  try {
    if (store) {
      store.set('settings', settings);
      return { success: true };
    }
    return { success: false, error: 'Store not initialized' };
  } catch (error) {
    console.error('Error saving settings:', error);
    return { success: false, error: error.message };
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
      url: 'https://business.web.whatsapp.com'
    }
  };
  
  try {
    if (!store) return defaultSettings;
    return store.get('settings', defaultSettings);
  } catch (error) {
    console.error('Error getting settings:', error);
    return defaultSettings;
  }
});

// IPC handler for app restart
ipcMain.handle('app-restart', async () => {
  try {
    app.relaunch();
    app.exit(0);
    return { success: true };
  } catch (error) {
    console.error('Error restarting app:', error);
    return { success: false, error: error.message };
  }
});
