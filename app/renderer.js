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
    const settings = await ipcRenderer.invoke('get-settings');
    
    personalWebview.src = settings.personal.url;
    businessWebview.src = settings.business.url;
    
    personalNotifications.checked = settings.personal.notifications;
    businessNotifications.checked = settings.business.notifications;

    // Set up webview notification handling
    [personalWebview, businessWebview].forEach(webview => {
        webview.addEventListener('dom-ready', () => {
            // Inject CSS to hide the download banner
            webview.insertCSS(`
                [data-testid="banner-download-app"] {
                    display: none !important;
                }
            `);
        });

        webview.addEventListener('new-window', (e) => {
            e.preventDefault();
            webview.src = e.url;
        });
    });
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
            url: 'https://web.whatsapp.com/business'
        }
    };

    await ipcRenderer.invoke('save-settings', settings);
    settingsModal.classList.remove('active');

    // Reload webviews if notification settings changed
    personalWebview.setAudioMuted(!settings.personal.notifications);
    businessWebview.setAudioMuted(!settings.business.notifications);
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
