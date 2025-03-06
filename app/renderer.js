const { ipcRenderer } = require('electron');

// DOM Elements
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanes = document.querySelectorAll('.tab-pane');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const saveSettingsBtn = document.getElementById('saveSettings');
const closeSettingsBtn = document.getElementById('closeSettings');
const personalWebview = document.getElementById('personalWebview');
const businessWebview = document.getElementById('businessWebview');
const personalNotifications = document.getElementById('personalNotifications');
const businessNotifications = document.getElementById('businessNotifications');
const clearCacheBtn = document.getElementById('clearCache');
const restartAppBtn = document.getElementById('restartApp');
const memoryWarning = document.getElementById('memoryWarning');
const dismissMemoryWarningBtn = document.getElementById('dismissMemoryWarning');
const restartForMemoryBtn = document.getElementById('restartForMemory');
const personalError = document.getElementById('personalError');
const businessError = document.getElementById('businessError');

// Track reload attempts to prevent infinite loops
const reloadAttempts = {
    personalWebview: 0,
    businessWebview: 0
};

// Maximum number of reload attempts before giving up
const MAX_RELOAD_ATTEMPTS = 3;

// Reset reload attempts counter after successful load
function resetReloadAttempts(webviewId) {
    reloadAttempts[webviewId] = 0;
}

// Show error overlay
function showErrorOverlay(webviewId) {
    const errorElement = webviewId === 'personalWebview' ? personalError : businessError;
    if (errorElement) {
        errorElement.style.display = 'flex';
    }
}

// Hide error overlay
function hideErrorOverlay(webviewId) {
    const errorElement = webviewId === 'personalWebview' ? personalError : businessError;
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

// Safely reload a webview with attempt tracking
function safeReload(webview) {
    const webviewId = webview.id;
    
    if (reloadAttempts[webviewId] >= MAX_RELOAD_ATTEMPTS) {
        console.error(`${webviewId} failed to load after ${MAX_RELOAD_ATTEMPTS} attempts. Giving up.`);
        showErrorOverlay(webviewId);
        return;
    }
    
    reloadAttempts[webviewId]++;
    console.log(`Reloading ${webviewId} (Attempt ${reloadAttempts[webviewId]} of ${MAX_RELOAD_ATTEMPTS})...`);
    
    setTimeout(() => {
        webview.reload();
    }, 3000);
}

// Memory management - periodically clear cache
function setupMemoryManagement() {
    // Clear session storage and service workers every 30 minutes
    setInterval(() => {
        [personalWebview, businessWebview].forEach(webview => {
            if (webview && webview.getWebContents) {
                try {
                    const webContents = webview.getWebContents();
                    if (webContents && !webContents.isDestroyed()) {
                        webContents.session.clearCache();
                        webContents.session.clearStorageData({
                            storages: ['serviceworkers']
                        });
                        console.log(`Cleared cache for ${webview.id}`);
                    }
                } catch (error) {
                    console.error(`Failed to clear cache for ${webview.id}:`, error);
                }
            }
        });
    }, 30 * 60 * 1000); // 30 minutes
}

// Initialize webviews with saved settings
async function initializeWebviews() {
    console.log('Initializing webviews...');
    try {
        const settings = await ipcRenderer.invoke('get-settings');
        
        // Define correct URLs
        const personalUrl = 'https://web.whatsapp.com';
        const businessUrl = 'https://business.web.whatsapp.com';
        
        [personalWebview, businessWebview].forEach(webview => {
            const container = document.getElementById(webview.id.replace('Webview', 'Container'));
            
            // Add loading event listeners
            webview.addEventListener('did-start-loading', () => {
                console.log(`${webview.id} started loading`);
                container.classList.add('loading');
                hideErrorOverlay(webview.id);
            });
            
            webview.addEventListener('did-stop-loading', () => {
                console.log(`${webview.id} finished loading`);
                container.classList.remove('loading');
                hideErrorOverlay(webview.id);
                
                // Reset reload attempts on successful load
                resetReloadAttempts(webview.id);
                
                // Check if the page loaded properly and handle outdated browser message
                webview.executeJavaScript(`
                    if (document.body.innerHTML.includes('Google Chrome 49+') || 
                        document.body.innerHTML.includes('outdated')) {
                        console.log('Detected outdated browser message, reloading...');
                        window.location.reload();
                    }
                `).catch(err => {
                    console.error('Error executing JavaScript in webview:', err);
                });
            });
            
            webview.addEventListener('did-fail-load', (e) => {
                console.error(`${webview.id} failed to load:`, e.errorDescription, 'Error code:', e.errorCode);
                container.classList.remove('loading');
                
                // Only retry on network errors or timeouts, ignore harmless errors
                if (e.errorCode !== -3 && 
                    (e.errorCode === -2 || // Failed to connect
                     e.errorCode === -7 || // Timeout
                     e.errorCode === -21)) { // Network changed
                    safeReload(webview);
                }
            });
            
            webview.addEventListener('dom-ready', () => {
                // Inject CSS to hide the download banner and ensure proper display
                webview.insertCSS(`
                    [data-testid="banner-download-app"] {
                        display: none !important;
                    }
                    body {
                        height: 100vh !important;
                        overflow: hidden !important;
                    }
                `).catch(err => {
                    console.error('Error inserting CSS into webview:', err);
                });
            });
            
            webview.addEventListener('console-message', (e) => {
                console.log(`${webview.id} console:`, e.message);
            });

            // Add crash handler
            webview.addEventListener('crashed', () => {
                console.error(`${webview.id} crashed`);
                safeReload(webview);
            });
            
            // Add unresponsive handler
            webview.addEventListener('unresponsive', () => {
                console.error(`${webview.id} became unresponsive`);
                safeReload(webview);
            });
        });
        
        console.log('Setting webview sources...');
        personalWebview.src = settings.personal.url || personalUrl;
        businessWebview.src = settings.business.url || businessUrl;
        
        personalNotifications.checked = settings.personal.notifications;
        businessNotifications.checked = settings.business.notifications;

        // Add new-window event handler
        [personalWebview, businessWebview].forEach(webview => {
            webview.addEventListener('new-window', (e) => {
                e.preventDefault();
                // Only navigate to whitelisted domains
                const url = new URL(e.url);
                if (url.hostname.includes('whatsapp.com') || 
                    url.hostname.includes('web.whatsapp.com') || 
                    url.hostname.includes('business.web.whatsapp.com')) {
                    webview.src = e.url;
                } else {
                    console.warn(`Blocked navigation to non-WhatsApp URL: ${e.url}`);
                }
            });
        });
        
        // Setup memory management
        setupMemoryManagement();
    } catch (error) {
        console.error('Failed to initialize webviews:', error);
    }
}

// Tab switching
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tab = button.dataset.tab;
        
        // Update active states
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));
        
        button.classList.add('active');
        document.getElementById(tab).classList.add('active');
    });
});

// Settings modal
settingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('active');
});

closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('active');
});

// Clear cache button
clearCacheBtn.addEventListener('click', async () => {
    try {
        [personalWebview, businessWebview].forEach(webview => {
            if (webview && webview.getWebContents) {
                try {
                    const webContents = webview.getWebContents();
                    if (webContents && !webContents.isDestroyed()) {
                        webContents.session.clearCache();
                        webContents.session.clearStorageData();
                    }
                } catch (error) {
                    console.error(`Failed to clear cache for ${webview.id}:`, error);
                }
            }
        });
        
        alert('Cache cleared successfully. The app will now reload.');
        window.location.reload();
    } catch (error) {
        console.error('Failed to clear cache:', error);
        alert('Failed to clear cache: ' + error.message);
    }
});

// Restart app button
restartAppBtn.addEventListener('click', async () => {
    try {
        await ipcRenderer.invoke('app-restart');
    } catch (error) {
        console.error('Failed to restart app:', error);
        // Fallback reload if restart fails
        window.location.reload();
    }
});

// Memory warning handlers
dismissMemoryWarningBtn.addEventListener('click', () => {
    memoryWarning.style.display = 'none';
});

restartForMemoryBtn.addEventListener('click', async () => {
    try {
        await ipcRenderer.invoke('app-restart');
    } catch (error) {
        console.error('Failed to restart app:', error);
        // Fallback reload if restart fails
        window.location.reload();
    }
});

// Listen for memory warnings from main process
ipcRenderer.on('memory-warning', (event, memoryUsageMB) => {
    console.warn(`Memory warning: ${memoryUsageMB} MB in use`);
    memoryWarning.style.display = 'flex';
});

// Save settings
saveSettingsBtn.addEventListener('click', async () => {
    const settings = {
        personal: {
            notifications: personalNotifications.checked,
            url: 'https://web.whatsapp.com'
        },
        business: {
            notifications: businessNotifications.checked,
            url: 'https://business.web.whatsapp.com'
        }
    };

    try {
        const result = await ipcRenderer.invoke('save-settings', settings);
        
        if (!result || !result.success) {
            throw new Error(result?.error || 'Unknown error');
        }
        
        settingsModal.classList.remove('active');

        // Reload webviews with new settings
        personalWebview.setAudioMuted(!settings.personal.notifications);
        businessWebview.setAudioMuted(!settings.business.notifications);
        
        // Reset reload attempts before reloading
        resetReloadAttempts(personalWebview.id);
        resetReloadAttempts(businessWebview.id);
        
        // Reload webviews to apply new settings
        personalWebview.reload();
        businessWebview.reload();
    } catch (error) {
        console.error('Failed to save settings:', error);
        alert('Failed to save settings: ' + error.message);
    }
});

// Initialize the app
initializeWebviews();

// Handle click outside modal to close
settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.remove('active');
    }
});

// Prevent propagation from modal content
document.querySelector('.settings-content').addEventListener('click', (e) => {
    e.stopPropagation();
});

// Add error handling for the entire renderer process
window.addEventListener('error', (event) => {
    console.error('Renderer process error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection in renderer:', event.reason);
});
