# Dual WhatsApp for Linux Desktop


![AI Co-generated](https://img.shields.io/badge/AI%20Co--generated-blue?style=flat-square)

![Claude 3.5 Sonnet](https://img.shields.io/badge/Claude%203.5-Sonnet-blue?style=flat-square)

![Cline](https://img.shields.io/badge/Cline-blue?style=flat-square)



A Linux desktop application that allows you to use both Personal and Business WhatsApp accounts simultaneously. Built specifically for Linux with KDE Plasma integration, but works on other desktop environments as well.

## Features

- Side-by-side tabbed layout for Personal and Business WhatsApp
- System tray integration with minimize to tray functionality
- Independent notification controls for each account
- Clean, modern interface matching KDE Plasma's aesthetic
- Persistent sessions for both accounts
- Settings management for notifications
- Automatic hiding of WhatsApp download banners

## Requirements

- Linux (tested on OpenSUSE Tumbleweed with KDE Plasma)
- Node.js and npm

## Installation

1. Clone this repository:
```bash
git clone https://github.com/danielrosehill/Dual-WhatsApp-Linux-Desktop.git
cd Dual-WhatsApp-Linux-Desktop
```

2. Install dependencies:
```bash
npm install
```

3. Start the application:
```bash
npm start
```

## Project Structure

```
.
├── app/                    # Application source files
│   ├── assets/            # Application assets (icons)
│   ├── main.js            # Electron main process
│   ├── index.html         # Main application window
│   ├── renderer.js        # Frontend logic
│   └── styles.css         # Application styling
├── package.json           # Project configuration
└── README.md             # Documentation
```

## Development Notes

- The application uses Electron's webview to embed WhatsApp Web instances
- Each WhatsApp instance (Personal and Business) has its own persistent session
- Settings are stored using electron-store
- The application minimizes to system tray instead of closing

## Usage

1. Launch the application using `npm start` or create a desktop shortcut
2. Sign in to your Personal WhatsApp account in the left tab
3. Sign in to your Business WhatsApp account in the right tab
4. Use the settings gear icon to configure notification preferences
5. Minimize to system tray by clicking the close button

## Development

The application is built using:
- Electron
- electron-store for settings persistence
- Standard web technologies (HTML, CSS, JavaScript)

## License

ISC License
