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

// Initialize webviews with saved settings
async function initializeWebviews() {
    console.log('Initializing webviews...');
    try {
        const settings = await ipcRenderer.invoke('get-settings');
        
        [personalWebview, businessWebview].forEach(webview => {
            const container = document.getElementById(webview.id.replace('Webview', 'Container'));
            
            // Add loading event listeners
            webview.addEventListener('did-start-loading', () => {
                console.log(`${webview.id} started loading`);
                container.classList.add('loading');
            });
            
            webview.addEventListener('did-stop-loading', () => {
                console.log(`${webview.id} finished loading`);
                container.classList.remove('loading');
                
                // Check if the page loaded properly and handle outdated browser message
                webview.executeJavaScript(`
                    if (document.body.innerHTML.includes('Google Chrome 49+') || 
                        document.body.innerHTML.includes('outdated')) {
                        console.log('Detected outdated browser message, reloading...');
                        window.location.reload();
                    }
                `);
            });
            
            webview.addEventListener('did-fail-load', (e) => {
                console.error(`${webview.id} failed to load:`, e.errorDescription, 'Error code:', e.errorCode);
                container.classList.remove('loading');
                
                // Only retry on network errors or timeouts, ignore harmless errors
                if (e.errorCode !== -3 && 
                    (e.errorCode === -2 || // Failed to connect
                     e.errorCode === -7 || // Timeout
                     e.errorCode === -21)) { // Network changed
                    console.log(`Retrying ${webview.id} in 3 seconds...`);
                    setTimeout(() => {
                        console.log(`Reloading ${webview.id}...`);
                        webview.reload();
                    }, 3000);
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
                `);
            });
            
            webview.addEventListener('console-message', (e) => {
                console.log(`${webview.id} console:`, e.message);
            });

            // Add crash handler
            webview.addEventListener('crashed', () => {
                console.error(`${webview.id} crashed, reloading...`);
                setTimeout(() => webview.reload(), 1000);
            });
        });
        
        console.log('Setting webview sources...');
        personalWebview.src = settings.personal.url;
        businessWebview.src = settings.business.url;
        
        personalNotifications.checked = settings.personal.notifications;
        businessNotifications.checked = settings.business.notifications;

        // Add new-window event handler
        [personalWebview, businessWebview].forEach(webview => {
            webview.addEventListener('new-window', (e) => {
                e.preventDefault();
                webview.src = e.url;
            });
        });
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
        await ipcRenderer.invoke('save-settings', settings);
        settingsModal.classList.remove('active');

        // Reload webviews with new settings
        personalWebview.setAudioMuted(!settings.personal.notifications);
        businessWebview.setAudioMuted(!settings.business.notifications);
        
        // Reload webviews to apply new settings
        personalWebview.reload();
        businessWebview.reload();
    } catch (error) {
        console.error('Failed to save settings:', error);
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
