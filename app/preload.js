const { ipcRenderer } = require('electron');

// Log when the script loads
console.log('Preload script initializing...');

window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    
    // Monitor network requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        console.log('Fetch request:', args[0]);
        try {
            const response = await originalFetch(...args);
            return response;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    };
});

// Log any errors that occur
window.addEventListener('error', (event) => {
    console.error('Page Error:', event.error);
});

// Log any unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
});

// Expose some debugging utilities to the window object
window.whatsappDebug = {
    checkDOM: () => {
        console.log('Body content length:', document.body.innerHTML.length);
        console.log('Webview ready state:', document.readyState);
    },
    reloadPage: () => {
        window.location.reload();
    }
};
