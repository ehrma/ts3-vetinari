# TS3 Inspect

A desktop application for managing TeamSpeak 3 servers built with Electron, Next.js, and DaisyUI.

## Features

- Connect to multiple TS3 servers simultaneously
- View channel tree with connected clients
- Store connection profiles locally
- Modern dark-themed UI

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
npm install
```

### Run in Development Mode

```bash
npm run electron:dev
```

This starts both the Next.js dev server and Electron.

### Build for Production

```bash
npm run electron:build
```

## Connection Settings

- **Host**: Your TS3 server hostname or IP
- **Query Port**: ServerQuery port (default: 10011)
- **Server Port**: Voice server port (default: 9987)
- **Username**: ServerQuery username (default: serveradmin)
- **Password**: ServerQuery password

## Tech Stack

- **Electron** - Desktop app framework
- **Next.js** - React framework
- **DaisyUI** - Tailwind CSS component library
- **ts3-nodejs-library** - TeamSpeak 3 ServerQuery client
- **electron-store** - Persistent storage for connections
