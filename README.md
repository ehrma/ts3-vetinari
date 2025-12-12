# TS3 Vetinari

<p align="center">
  <img src="public/logo.png" alt="TS3 Vetinari Logo" width="128" height="128">
</p>

<p align="center">
  <strong>A TeamSpeak3 Serveradmin Utility</strong>
</p>

A powerful desktop application for managing TeamSpeak 3 servers. Built with Electron, Next.js, and DaisyUI.

## Download

Download the latest release for your platform from the [GitHub Releases](../../releases) page:

- **Windows**: `TS3-Vetinari-Setup-x.x.x.exe`
- **macOS**: `TS3-Vetinari-x.x.x.dmg`
- **Linux**: `TS3-Vetinari-x.x.x.AppImage`

No installation or build required - just download and run!

## Features

### Server Connection
- Connect to multiple TS3 servers simultaneously
- Save and manage connection profiles
- Secure credential storage

### Server Overview
- Real-time channel tree with connected clients
- View detailed client information (IP, version, country, connection time, etc.)
- View channel properties and settings
- Server information and statistics

### Administration
- **Client Management**: Kick, ban, poke, move clients between channels
- **Ban Management**: View, add, and remove bans (by IP, name, or UID)
- **Channel Management**: Create and delete channels
- **Messaging**: Send messages to server or specific channels

### Server Groups
- View all server groups with member counts
- Manage group members (add/remove)
- Full permissions editor with search and filtering
- Create, rename, copy, and delete groups

### Client Database
- Browse all registered clients with pagination
- Search by nickname, UID, or IP
- Sort by any column
- View detailed client history

### Server Management
- **Privilege Keys**: Create and manage tokens
- **Complaints**: View and manage client complaints
- **Server Settings**: Edit server properties (name, welcome message, etc.)
- **File Browser**: Browse and manage channel files

### Logging
- Real-time event logging (connections, disconnections, moves, etc.)
- Filter logs by type
- Persistent log storage
- Export capabilities

### Settings
- Dark/Light/System theme toggle
- Configurable auto-refresh interval
- Confirmation dialogs for destructive actions

## Connection Settings

To connect to a TeamSpeak 3 server, you need ServerQuery credentials:

| Setting | Description | Default |
|---------|-------------|---------|
| **Host** | Server hostname or IP address | - |
| **Query Port** | ServerQuery port | 10011 |
| **Server Port** | Voice server port | 9987 |
| **Username** | ServerQuery username | serveradmin |
| **Password** | ServerQuery password | - |

> **Note**: ServerQuery credentials are different from regular TS3 client credentials. Contact your server administrator if you don't have ServerQuery access.

## Development

If you want to contribute or run from source:

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
git clone https://github.com/ehrma/ts3-vetinari.git
cd ts3-vetinari
npm install
```

### Run in Development Mode

```bash
npm run electron:dev
```

This starts both the Next.js dev server and Electron with hot-reload.

### Build for Production

```bash
npm run electron:build
```

Builds are output to the `dist/` directory.

## Tech Stack

- **Electron** - Cross-platform desktop app framework
- **Next.js** - React framework with TypeScript
- **TailwindCSS** - Utility-first CSS framework
- **DaisyUI** - Tailwind CSS component library
- **ts3-nodejs-library** - TeamSpeak 3 ServerQuery client
- **electron-store** - Persistent local storage

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- TeamSpeak Systems GmbH for the ServerQuery protocol
- The ts3-nodejs-library maintainers
