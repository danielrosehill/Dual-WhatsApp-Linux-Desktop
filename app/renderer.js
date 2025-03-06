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
const darkModeToggle = document.getElementById('darkMode');
const clearCacheBtn = document.getElementById('clearCache');
const restartAppBtn = document.getElementById('restartApp');
const memoryWarning = document.getElementById('memoryWarning');
const dismissMemoryWarningBtn = document.getElementById('dismissMemoryWarning');
const restartForMemoryBtn = document.getElementById('restartForMemory');
const personalError = document.getElementById('personalError');
const businessError = document.getElementById('businessError');
const personalErrorText = document.getElementById('personalErrorText');
const businessErrorText = document.getElementById('businessErrorText');

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

// Show error overlay with custom message
function showErrorOverlay(webviewId, message = null) {
    const errorElement = webviewId === 'personalWebview' ? personalError : businessError;
    const errorTextElement = webviewId === 'personalWebview' ? personalErrorText : businessErrorText;
    
    if (errorElement) {
        if (message && errorTextElement) {
            errorTextElement.textContent = message;
        }
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

// Network status tracking
let isOnline = navigator.onLine;

// Offline mode handler
function tryOfflineMode(type) {
    const webview = type === 'personal' ? personalWebview : businessWebview;
    const errorTextElement = type === 'personal' ? personalErrorText : businessErrorText;
    
    console.log(`Attempting to load ${type} WhatsApp in offline mode...`);
    
    // Try to access cached content
    webview.executeJavaScript(`
        // Check if service worker is active
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            console.log('Service worker is active, trying to load cached content');
            // Force the service worker to respond with cached content
            window.location.reload();
            true;
        } else {
            console.log('No service worker available');
            false;
        }
    `).then(result => {
        if (!result) {
            errorTextElement.textContent = 'Offline mode not available. Please try again when you have an internet connection.';
        } else {
            // Give it some time to load cached content
            setTimeout(() => {
                // Check if content loaded from cache
                webview.executeJavaScript(`
                    document.querySelector('[data-testid="chat-list"] > div') !== null
                `).then(hasContent => {
                    if (!hasContent) {
                        errorTextElement.textContent = 'Could not load cached content. Please connect to the internet and try again.';
                    } else {
                        hideErrorOverlay(webview.id);
                    }
                }).catch(err => {
                    console.error('Error checking for cached content:', err);
                });
            }, 5000);
        }
    }).catch(err => {
        console.error('Error trying offline mode:', err);
        errorTextElement.textContent = 'Failed to enter offline mode. Please try again when you have an internet connection.';
    });
}

// Network status change handlers
window.addEventListener('online', () => {
    console.log('Network connection restored');
    isOnline = true;
    
    // Attempt to reload webviews if they were previously showing errors
    if (personalError.style.display === 'flex') {
        personalWebview.reload();
    }
    
    if (businessError.style.display === 'flex') {
        businessWebview.reload();
    }
});

window.addEventListener('offline', () => {
    console.log('Network connection lost');
    isOnline = false;
    
    // Show appropriate message if webviews are currently loading
    if (personalWebview.isLoading()) {
        showErrorOverlay('personalWebview', 'Network connection lost. WhatsApp requires an internet connection to function properly.');
    }
    
    if (businessWebview.isLoading()) {
        showErrorOverlay('businessWebview', 'Network connection lost. WhatsApp requires an internet connection to function properly.');
    }
});

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

// Add session recovery mechanism
function setupSessionRecovery() {
    console.log('Setting up session recovery...');
    
    // Check webview health periodically
    setInterval(() => {
        [personalWebview, businessWebview].forEach(webview => {
            if (webview && !webview.isDestroyed && webview.isDestroyed()) {
                console.log(`${webview.id} is destroyed, attempting to recover...`);
                
                // Create a new webview element
                const newWebview = document.createElement('webview');
                newWebview.id = webview.id;
                newWebview.src = webview.src;
                newWebview.partition = webview.partition;
                newWebview.allowpopups = true;
                newWebview.preload = './preload.js';
                newWebview.nodeintegration = true;
                newWebview.useragent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
                
                // Replace the old webview
                webview.parentNode.replaceChild(newWebview, webview);
                console.log(`${webview.id} has been recreated`);
                
                // Re-add event listeners
                setupWebviewEventListeners(newWebview);
            }
        });
    }, 60000); // Check every minute
}

// Extract webview event listeners setup to a separate function
function setupWebviewEventListeners(webview) {
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
        } else if (!isOnline) {
            tryOfflineMode(webview.id === 'personalWebview' ? 'personal' : 'business');
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
    
    // Add new-window event handler
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
}

// Theme management
function applyTheme(isDark) {
    if (isDark) {
        document.body.classList.remove('light-theme');
    } else {
        document.body.classList.add('light-theme');
    }
    
    // Update webview CSS based on theme
    [personalWebview, businessWebview].forEach(webview => {
        if (webview && !webview.isDestroyed()) {
            try {
                const themeCSS = isDark ? 
                    `body { color-scheme: dark; }` : 
                    `body { color-scheme: light; }`;
                
                webview.insertCSS(themeCSS).catch(err => {
                    console.error('Error applying theme to webview:', err);
                });
            } catch (error) {
                console.error('Failed to apply theme to webview:', error);
            }
        }
    });
}

// Initialize webviews with saved settings
async function initializeWebviews() {
    console.log('Initializing webviews...');
    try {
        const settings = await ipcRenderer.invoke('get-settings');
        
        // Define correct URLs
        const personalUrl = 'https://web.whatsapp.com';
        const businessUrl = 'https://web.whatsapp.com';
        
        [personalWebview, businessWebview].forEach(webview => {
            setupWebviewEventListeners(webview);
        });
        
        console.log('Setting webview sources...');
        personalWebview.src = settings.personal.url || personalUrl;
        businessWebview.src = settings.business.url || businessUrl;
        
        personalNotifications.checked = settings.personal.notifications;
        businessNotifications.checked = settings.business.notifications;
        
        // Apply theme settings
        const isDarkMode = settings.app?.darkMode !== false; // Default to dark mode
        darkModeToggle.checked = isDarkMode;
        applyTheme(isDarkMode);
        
        // Setup memory management
        setupMemoryManagement();
        
        // Setup session recovery
        setupSessionRecovery();
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

// Theme toggle
darkModeToggle.addEventListener('change', () => {
    applyTheme(darkModeToggle.checked);
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
            url: 'https://web.whatsapp.com'
        },
        app: {
            darkMode: darkModeToggle.checked
        }
    };

    try {
        const result = await ipcRenderer.invoke('save-settings', settings);
        
        if (!result || !result.success) {
            throw new Error(result?.error || 'Unknown error');
        }
        
        settingsModal.classList.remove('active');

        // Apply theme
        applyTheme(darkModeToggle.checked);

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
