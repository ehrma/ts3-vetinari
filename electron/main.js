const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const { TeamSpeak } = require('ts3-nodejs-library')
const { autoUpdater } = require('electron-updater')

// Configure auto-updater
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

let mainWindow = null
let updateDownloaded = false

let store = null
async function getStore() {
  if (!store) {
    const Store = (await import('electron-store')).default
    store = new Store()
  }
  return store
}

const connections = new Map() // Active TS3 connections
const connectionLogs = new Map() // Logs per connection (in-memory cache)
const MAX_LOG_ENTRIES = 2000

// Load persisted logs for a connection
async function loadPersistedLogs(connectionId) {
  const s = await getStore()
  const allLogs = s.get('logs', {})
  return allLogs[connectionId] || []
}

// Save logs to persistent storage
async function saveLogsToStore(connectionId, logs) {
  const s = await getStore()
  const allLogs = s.get('logs', {})
  allLogs[connectionId] = logs.slice(-MAX_LOG_ENTRIES) // Keep last N entries
  s.set('logs', allLogs)
}

async function addLogEntry(connectionId, type, message, data = {}) {
  if (!connectionLogs.has(connectionId)) {
    // Load existing logs from storage
    const persistedLogs = await loadPersistedLogs(connectionId)
    connectionLogs.set(connectionId, persistedLogs)
  }
  const logs = connectionLogs.get(connectionId)
  const entry = {
    id: Date.now() + Math.random(),
    timestamp: new Date().toISOString(),
    type,
    message,
    data,
  }
  logs.push(entry)
  
  // Keep only last MAX_LOG_ENTRIES in memory
  if (logs.length > MAX_LOG_ENTRIES) {
    logs.shift()
  }
  
  // Save to persistent storage (debounced would be better but this works)
  await saveLogsToStore(connectionId, logs)
  
  // Notify renderer
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('log-entry', { connectionId, entry })
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'TS3 Vetinari',
    icon: path.join(__dirname, '../public/logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // In development, load from Next.js dev server
  // In production, load from exported files
  const isDev = process.env.NODE_ENV === 'development'
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../out/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  // Check for updates in production
  if (process.env.NODE_ENV !== 'development') {
    autoUpdater.checkForUpdates().catch(() => {
      // Silently fail if update check fails
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Auto-updater events - send to renderer for UI updates
autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-download-progress', {
      percent: progressObj.percent,
      transferred: progressObj.transferred,
      total: progressObj.total
    })
  }
})

autoUpdater.on('update-downloaded', (info) => {
  updateDownloaded = true
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', { version: info.version })
  }
})

autoUpdater.on('error', (error) => {
  console.log('Auto-updater error:', error.message)
  if (mainWindow) {
    mainWindow.webContents.send('update-error', { error: error.message })
  }
})

app.on('window-all-closed', () => {
  // Disconnect all TS3 connections
  connections.forEach(async (conn) => {
    try {
      await conn.quit()
    } catch (e) {
      // Ignore errors on quit
    }
  })
  
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC Handlers for app info
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates()
    if (result && result.updateInfo) {
      return {
        updateAvailable: result.updateInfo.version !== app.getVersion(),
        currentVersion: app.getVersion(),
        latestVersion: result.updateInfo.version,
        releaseNotes: result.updateInfo.releaseNotes || ''
      }
    }
    return { updateAvailable: false, currentVersion: app.getVersion() }
  } catch (error) {
    return { updateAvailable: false, currentVersion: app.getVersion(), error: error.message }
  }
})

ipcMain.handle('download-update', async () => {
  try {
    await autoUpdater.downloadUpdate()
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall()
})

ipcMain.handle('open-external-url', async (event, url) => {
  const { shell } = require('electron')
  await shell.openExternal(url)
})

// IPC Handlers for connection storage
ipcMain.handle('get-connections', async () => {
  const s = await getStore()
  return s.get('connections', [])
})

ipcMain.handle('add-connection', async (event, conn) => {
  const s = await getStore()
  const storedConns = s.get('connections', [])
  const newConn = {
    ...conn,
    id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  }
  storedConns.push(newConn)
  s.set('connections', storedConns)
  return newConn
})

ipcMain.handle('update-connection', async (event, conn) => {
  const s = await getStore()
  const storedConns = s.get('connections', [])
  const index = storedConns.findIndex(c => c.id === conn.id)
  if (index !== -1) {
    storedConns[index] = conn
    s.set('connections', storedConns)
  }
  return conn
})

ipcMain.handle('delete-connection', async (event, id) => {
  const s = await getStore()
  const storedConnections = s.get('connections', [])
  const filtered = storedConnections.filter(c => c.id !== id)
  s.set('connections', filtered)
})

// IPC Handlers for TS3 connections
ipcMain.handle('connect', async (event, connConfig) => {
  try {
    const ts3 = await TeamSpeak.connect({
      host: connConfig.host,
      queryport: connConfig.queryPort,
      serverport: connConfig.serverPort,
      username: connConfig.username,
      password: connConfig.password,
      nickname: 'TS3-Inspect',
    })

    connections.set(connConfig.id, ts3)
    connectionLogs.set(connConfig.id, [])

    // Set up event listeners for logging
    ts3.on('clientconnect', (ev) => {
      const p = JSON.parse(JSON.stringify(ev.client))
      addLogEntry(connConfig.id, 'client_connect', `${p.clientNickname} connected`, { client: p })
    })

    ts3.on('clientdisconnect', (ev) => {
      const p = ev.client ? JSON.parse(JSON.stringify(ev.client)) : {}
      addLogEntry(connConfig.id, 'client_disconnect', `${p.clientNickname || 'Unknown'} disconnected`, { client: p, event: ev.event })
    })

    ts3.on('clientmoved', (ev) => {
      const client = ev.client ? JSON.parse(JSON.stringify(ev.client)) : {}
      const channel = ev.channel ? JSON.parse(JSON.stringify(ev.channel)) : {}
      addLogEntry(connConfig.id, 'client_moved', `${client.clientNickname || 'Unknown'} moved to ${channel.channelName || 'unknown channel'}`, { client, channel })
    })

    ts3.on('textmessage', (ev) => {
      const p = JSON.parse(JSON.stringify(ev))
      // invoker is an object with clientNickname property
      const invokerName = p.invoker?.clientNickname || p.invokername || 'Unknown'
      const message = p.msg || ''
      const targetMode = p.targetmode ?? 3
      addLogEntry(connConfig.id, 'message', `[${targetMode === 1 ? 'Private' : targetMode === 2 ? 'Channel' : 'Server'}] ${invokerName}: ${message}`, { 
        invoker: invokerName,
        message: message,
        targetmode: targetMode,
      })
    })

    ts3.on('serveredit', (ev) => {
      addLogEntry(connConfig.id, 'server_edit', 'Server settings changed', { event: ev })
    })

    ts3.on('channelcreate', (ev) => {
      const channel = ev.channel ? JSON.parse(JSON.stringify(ev.channel)) : {}
      addLogEntry(connConfig.id, 'channel_create', `Channel created: ${channel.channelName || 'Unknown'}`, { channel })
    })

    ts3.on('channeldelete', (ev) => {
      addLogEntry(connConfig.id, 'channel_delete', `Channel deleted (ID: ${ev.cid})`, { cid: ev.cid })
    })

    ts3.on('channeledit', (ev) => {
      const channel = ev.channel ? JSON.parse(JSON.stringify(ev.channel)) : {}
      addLogEntry(connConfig.id, 'channel_edit', `Channel edited: ${channel.channelName || 'Unknown'}`, { channel })
    })

    // Register for server notifications
    await ts3.registerEvent('server')
    await ts3.registerEvent('channel', 0)
    await ts3.registerEvent('textserver')
    await ts3.registerEvent('textchannel')
    await ts3.registerEvent('textprivate')

    addLogEntry(connConfig.id, 'connected', `Connected to ${connConfig.host}:${connConfig.serverPort}`)

    // Get server info
    const serverInfo = await ts3.serverInfo()
    const channelList = await ts3.channelList()
    const clientList = await ts3.clientList()

    // Access propcache directly to get the raw data
    const getProps = (obj) => obj.propcache || obj

    return {
      success: true,
      serverInfo: {
        virtualserver_name: getProps(serverInfo).virtualserverName,
        virtualserver_welcomemessage: getProps(serverInfo).virtualserverWelcomemessage,
        virtualserver_maxclients: getProps(serverInfo).virtualserverMaxclients,
        virtualserver_clientsonline: getProps(serverInfo).virtualserverClientsonline,
        virtualserver_uptime: getProps(serverInfo).virtualserverUptime,
        virtualserver_version: getProps(serverInfo).virtualserverVersion,
        virtualserver_platform: getProps(serverInfo).virtualserverPlatform,
      },
      channels: channelList.map(ch => {
        const p = getProps(ch)
        return {
          cid: parseInt(p.cid),
          pid: parseInt(p.pid),
          channel_name: p.channelName,
          channel_order: p.channelOrder,
          total_clients: p.totalClients,
          channel_needed_subscribe_power: p.channelNeededSubscribePower,
        }
      }),
      clients: clientList.map(cl => {
        const p = getProps(cl)
        return {
          clid: parseInt(p.clid),
          cid: parseInt(p.cid),
          client_nickname: p.clientNickname,
          client_type: p.clientType,
          client_away: p.clientAway ? 1 : 0,
          client_away_message: p.clientAwayMessage,
          client_input_muted: p.clientInputMuted ? 1 : 0,
          client_output_muted: p.clientOutputMuted ? 1 : 0,
          client_is_channel_commander: p.clientIsChannelCommander ? 1 : 0,
          client_is_talker: p.clientIsTalker ? 1 : 0,
        }
      }),
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Connection failed',
    }
  }
})

ipcMain.handle('disconnect', async (event, id) => {
  const conn = connections.get(id)
  if (conn) {
    try {
      await conn.quit()
    } catch (e) {
      // Ignore errors
    }
    connections.delete(id)
  }
})

ipcMain.handle('refresh-server', async (event, id) => {
  const conn = connections.get(id)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    const channelList = await conn.channelList()
    const clientList = await conn.clientList()
    const getProps = (obj) => obj.propcache || obj

    return {
      success: true,
      channels: channelList.map(ch => {
        const p = getProps(ch)
        return {
          cid: parseInt(p.cid),
          pid: parseInt(p.pid),
          channel_name: p.channelName,
          channel_order: p.channelOrder,
          total_clients: p.totalClients,
          channel_needed_subscribe_power: p.channelNeededSubscribePower,
        }
      }),
      clients: clientList.map(cl => {
        const p = getProps(cl)
        return {
          clid: parseInt(p.clid),
          cid: parseInt(p.cid),
          client_nickname: p.clientNickname,
          client_type: p.clientType,
          client_away: p.clientAway ? 1 : 0,
          client_away_message: p.clientAwayMessage,
          client_input_muted: p.clientInputMuted ? 1 : 0,
          client_output_muted: p.clientOutputMuted ? 1 : 0,
          client_is_channel_commander: p.clientIsChannelCommander ? 1 : 0,
          client_is_talker: p.clientIsTalker ? 1 : 0,
        }
      }),
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Refresh failed',
    }
  }
})

// Get detailed client info
ipcMain.handle('get-client-info', async (event, { connectionId, clid }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    const clientInfoResult = await conn.clientInfo(clid)
    // clientInfo may return an array or single object
    const clientInfo = Array.isArray(clientInfoResult) ? clientInfoResult[0] : clientInfoResult
    // Use JSON parse/stringify to extract plain data from the TS3 object
    const p = JSON.parse(JSON.stringify(clientInfo))

    return {
      success: true,
      client: {
        clid: parseInt(p.clid || clid),
        cid: parseInt(p.cid),
        client_nickname: p.clientNickname,
        client_unique_identifier: p.clientUniqueIdentifier,
        client_database_id: parseInt(p.clientDatabaseId),
        client_type: p.clientType,
        client_away: p.clientAway ? 1 : 0,
        client_away_message: p.clientAwayMessage || '',
        client_input_muted: p.clientInputMuted ? 1 : 0,
        client_output_muted: p.clientOutputMuted ? 1 : 0,
        client_is_channel_commander: p.clientIsChannelCommander ? 1 : 0,
        client_is_talker: p.clientIsTalker ? 1 : 0,
        client_is_recording: p.clientIsRecording ? 1 : 0,
        client_version: p.clientVersion,
        client_platform: p.clientPlatform,
        client_country: p.clientCountry,
        client_idle_time: p.clientIdleTime,
        client_created: p.clientCreated,
        client_lastconnected: p.clientLastconnected,
        client_totalconnections: p.clientTotalconnections,
        client_description: p.clientDescription || '',
        client_servergroups: p.clientServergroups || [],
        client_channel_group_id: parseInt(p.clientChannelGroupId),
        connection_client_ip: p.connectionClientIp,
        connection_connected_time: p.connectionConnectedTime,
        connection_bytes_sent_total: p.connectionBytesSentTotal,
        connection_bytes_received_total: p.connectionBytesReceivedTotal,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to get client info',
    }
  }
})

// Get detailed channel info
ipcMain.handle('get-channel-info', async (event, { connectionId, cid }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    const channelInfoResult = await conn.channelInfo(cid)
    const channelInfo = Array.isArray(channelInfoResult) ? channelInfoResult[0] : channelInfoResult
    const p = JSON.parse(JSON.stringify(channelInfo))

    return {
      success: true,
      channel: {
        cid: parseInt(cid),
        pid: parseInt(p.pid || 0),
        channel_name: p.channelName,
        channel_topic: p.channelTopic || '',
        channel_description: p.channelDescription || '',
        channel_password: p.channelFlagPassword ? true : false,
        channel_codec: p.channelCodec,
        channel_codec_quality: p.channelCodecQuality,
        channel_maxclients: p.channelMaxclients,
        channel_maxfamilyclients: p.channelMaxfamilyclients,
        channel_order: p.channelOrder,
        channel_flag_permanent: p.channelFlagPermanent ? 1 : 0,
        channel_flag_semi_permanent: p.channelFlagSemiPermanent ? 1 : 0,
        channel_flag_default: p.channelFlagDefault ? 1 : 0,
        channel_flag_password: p.channelFlagPassword ? 1 : 0,
        channel_codec_latency_factor: p.channelCodecLatencyFactor,
        channel_codec_is_unencrypted: p.channelCodecIsUnencrypted ? 1 : 0,
        channel_delete_delay: p.channelDeleteDelay,
        channel_needed_talk_power: p.channelNeededTalkPower,
        channel_icon_id: p.channelIconId,
        total_clients: p.totalClients || 0,
        total_clients_family: p.totalClientsFamily || 0,
        seconds_empty: p.secondsEmpty,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to get channel info',
    }
  }
})

// Get logs for a connection
ipcMain.handle('get-logs', async (event, { connectionId }) => {
  // Load from memory cache or persistent storage
  if (!connectionLogs.has(connectionId)) {
    const persistedLogs = await loadPersistedLogs(connectionId)
    connectionLogs.set(connectionId, persistedLogs)
  }
  return connectionLogs.get(connectionId) || []
})

// Get server logs using logview command
ipcMain.handle('get-server-logs', async (event, { connectionId, lines = 100, reverse = 1, instance = 0, beginPos = 0 }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    const result = await conn.execute('logview', { 
      lines, 
      reverse, 
      instance,
      begin_pos: beginPos 
    })
    
    // Parse the log entries
    // Format: "2024-12-11 23:32:21.4652|INFO |VirtualServerBase|1 |client disconnected 'Wulle'(id:1314) reason 'reasonmsg=leaving'"
    const logs = Array.isArray(result) ? result : [result]
    const entries = logs.map(log => {
      const p = JSON.parse(JSON.stringify(log))
      const raw = p.l || ''
      
      // Parse the log line format
      // timestamp|LEVEL|Channel|ServerID|message
      const parts = raw.split('|')
      if (parts.length >= 5) {
        const timestamp = parts[0].trim()
        const level = parts[1].trim()
        const channel = parts[2].trim()
        const serverId = parts[3].trim()
        const message = parts.slice(4).join('|').trim()
        
        return {
          timestamp,
          level,
          channel,
          serverId,
          message,
          raw,
          lastPos: p.last_pos,
          fileSize: p.file_size,
        }
      }
      
      return {
        timestamp: raw.substring(0, 19),
        level: 'INFO',
        channel: '',
        serverId: '',
        message: raw.substring(20),
        raw,
        lastPos: p.last_pos,
        fileSize: p.file_size,
      }
    }).filter(e => e.raw)

    return {
      success: true,
      logs: entries,
      lastPos: logs[0]?.last_pos,
      fileSize: logs[0]?.file_size,
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to get server logs',
    }
  }
})

// Clear logs for a connection
ipcMain.handle('clear-logs', async (event, { connectionId }) => {
  connectionLogs.set(connectionId, [])
  await saveLogsToStore(connectionId, [])
  return { success: true }
})

// Kick client
ipcMain.handle('kick-client', async (event, { connectionId, clid, reasonId, reasonMsg }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    // reasonId: 4 = kick from channel, 5 = kick from server
    await conn.clientKick(clid, reasonId, reasonMsg || '')
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to kick client' }
  }
})

// Ban client
ipcMain.handle('ban-client', async (event, { connectionId, clid, time, reason }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    await conn.ban({ clid, time: time || 0, banreason: reason || '' })
    return { success: true }
  } catch (error) {
    try {
      await conn.execute('banclient', { clid, time: time || 0, banreason: reason || '' })
      return { success: true }
    } catch (err2) {
      return { success: false, error: err2.message || error.message || 'Failed to ban client' }
    }
  }
})

// Get ban list
ipcMain.handle('get-bans', async (event, { connectionId }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    const bans = await conn.banList()
    const banList = Array.isArray(bans) ? bans : [bans]
    return {
      success: true,
      bans: banList.map(b => {
        const p = JSON.parse(JSON.stringify(b))
        return {
          banid: p.banid,
          ip: p.ip || '',
          name: p.name || '',
          uid: p.uid || '',
          mytsid: p.mytsid || '',
          lastnickname: p.lastnickname || '',
          created: p.created,
          duration: p.duration,
          invokername: p.invokername,
          invokercldbid: p.invokercldbid,
          invokeruid: p.invokeruid,
          reason: p.reason || '',
          enforcements: p.enforcements,
        }
      }).filter(b => b.banid !== undefined)
    }
  } catch (error) {
    if (error.message?.includes('empty result')) {
      return { success: true, bans: [] }
    }
    return { success: false, error: error.message || 'Failed to get ban list' }
  }
})

// Add ban
ipcMain.handle('add-ban', async (event, { connectionId, ip, name, uid, time, reason }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    const params = {}
    if (ip) params.ip = ip
    if (name) params.name = name
    if (uid) params.uid = uid
    if (time) params.time = time
    if (reason) params.banreason = reason
    
    await conn.execute('banadd', params)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to add ban' }
  }
})

// Delete ban
ipcMain.handle('delete-ban', async (event, { connectionId, banid }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    await conn.banDel(banid)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to delete ban' }
  }
})

// Send text message
ipcMain.handle('send-message', async (event, { connectionId, targetMode, target, msg }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    // targetMode: 1 = private, 2 = channel, 3 = server
    // Use raw execute command to ensure correct parameter format
    console.log('Sending message:', { targetMode, target, msg })
    await conn.execute('sendtextmessage', {
      targetmode: String(targetMode),
      target: String(target),
      msg: msg
    })
    return { success: true }
  } catch (error) {
    console.log('Send message error:', error.message)
    return { success: false, error: error.message || 'Failed to send message' }
  }
})

// Poke client
ipcMain.handle('poke-client', async (event, { connectionId, clid, msg }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    await conn.clientPoke(clid, msg)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to poke client' }
  }
})

// Get server groups
ipcMain.handle('get-server-groups', async (event, { connectionId }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    const groups = await conn.serverGroupList()
    const groupList = Array.isArray(groups) ? groups : [groups]
    return {
      success: true,
      groups: groupList.map(g => {
        const p = JSON.parse(JSON.stringify(g))
        return {
          sgid: p.sgid,
          name: p.name,
          type: p.type,
          iconid: p.iconid,
          savedb: p.savedb,
          sortid: p.sortid,
          namemode: p.namemode,
          nModifyp: p.nModifyp,
          nMemberAddp: p.nMemberAddp,
          nMemberRemovep: p.nMemberRemovep,
        }
      })
    }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to get server groups' }
  }
})

// Get server group clients (members)
ipcMain.handle('get-server-group-clients', async (event, { connectionId, sgid }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    const clients = await conn.serverGroupClientList(sgid)
    const clientList = Array.isArray(clients) ? clients : (clients ? [clients] : [])
    return {
      success: true,
      clients: clientList.map(c => {
        const p = JSON.parse(JSON.stringify(c))
        return {
          cldbid: parseInt(p.cldbid) || 0,
          client_nickname: p.clientNickname || p.client_nickname || '',
          client_unique_identifier: p.clientUniqueIdentifier || p.client_unique_identifier || '',
        }
      })
    }
  } catch (error) {
    if (error.id === '1281' || error.message?.includes('empty result')) {
      return { success: true, clients: [] }
    }
    return { success: false, error: error.message || 'Failed to get server group clients' }
  }
})

// Copy server group
ipcMain.handle('copy-server-group', async (event, { connectionId, sourceSgid, name, type }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    const result = await conn.serverGroupCopy(sourceSgid, 0, name, type || 1)
    const p = JSON.parse(JSON.stringify(result))
    return { success: true, sgid: parseInt(p.sgid) }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to copy server group' }
  }
})

// Delete server group
ipcMain.handle('delete-server-group', async (event, { connectionId, sgid, force }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    await conn.serverGroupDel(sgid, force ? 1 : 0)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to delete server group' }
  }
})

// Rename server group
ipcMain.handle('rename-server-group', async (event, { connectionId, sgid, name }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    await conn.serverGroupRename(sgid, name)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to rename server group' }
  }
})

// Get server group permissions
ipcMain.handle('get-server-group-permissions', async (event, { connectionId, sgid }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    // Get permissions using the library method with permsid flag
    const perms = await conn.serverGroupPermList(sgid, true)
    const permList = Array.isArray(perms) ? perms : (perms ? [perms] : [])
    
    // Debug: log raw object to see actual property names
    if (permList.length > 0) {
      const first = permList[0]
      // Get all enumerable and non-enumerable properties
      const allProps = Object.getOwnPropertyNames(first)
      console.log('Permission props:', allProps)
      console.log('Permission values:', allProps.map(k => `${k}=${first[k]}`).join(', '))
    }
    
    return {
      success: true,
      permissions: permList.map((p, index) => {
        // The library uses _perm for name, _value for value, _skip and _negate for flags
        return {
          permid: index,
          permsid: String(p._perm || `perm_${index}`),
          permvalue: parseInt(p._value) || 0,
          permnegated: p._negate === true,
          permskip: p._skip === true,
        }
      })
    }
  } catch (error) {
    console.log('Permission list error:', error.message)
    if (error.id === '1281' || error.message?.includes('empty result')) {
      return { success: true, permissions: [] }
    }
    return { success: false, error: error.message || 'Failed to get server group permissions' }
  }
})

// Get all available permissions
ipcMain.handle('get-permission-list', async (event, { connectionId }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    const perms = await conn.permissionList()
    const permList = Array.isArray(perms) ? perms : (perms ? [perms] : [])
    return {
      success: true,
      permissions: permList.map(p => {
        // Manually extract properties to avoid circular reference issues
        return {
          permid: parseInt(p.permid) || 0,
          permsid: String(p.permname || p.permsid || ''),
          permdesc: String(p.permdesc || ''),
        }
      })
    }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to get permission list' }
  }
})

// Add permission to server group
ipcMain.handle('add-server-group-permission', async (event, { connectionId, sgid, permsid, permvalue, permnegated, permskip }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    await conn.serverGroupAddPerm(sgid, permsid, permvalue, permnegated ? 1 : 0, permskip ? 1 : 0)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to add permission' }
  }
})

// Remove permission from server group
ipcMain.handle('remove-server-group-permission', async (event, { connectionId, sgid, permsid }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    await conn.serverGroupDelPerm(sgid, permsid)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to remove permission' }
  }
})

// Add client to server group
ipcMain.handle('add-client-to-group', async (event, { connectionId, sgid, cldbid }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    await conn.serverGroupAddClient(cldbid, sgid)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to add client to group' }
  }
})

// Remove client from server group
ipcMain.handle('remove-client-from-group', async (event, { connectionId, sgid, cldbid }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    await conn.serverGroupDelClient(cldbid, sgid)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to remove client from group' }
  }
})

// Create channel
ipcMain.handle('create-channel', async (event, { connectionId, name, parent, options }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    const params = {
      channel_name: name,
      cpid: parent || 0,
      ...options
    }
    const result = await conn.channelCreate(params.channel_name, params)
    const p = JSON.parse(JSON.stringify(result))
    return { success: true, cid: p.cid }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to create channel' }
  }
})

// Edit channel
ipcMain.handle('edit-channel', async (event, { connectionId, cid, properties }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    await conn.channelEdit(cid, properties)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to edit channel' }
  }
})

// Delete channel
ipcMain.handle('delete-channel', async (event, { connectionId, cid, force }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    await conn.channelDelete(cid, force ? 1 : 0)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to delete channel' }
  }
})

// Get client database list
ipcMain.handle('get-client-db-list', async (event, { connectionId, start, duration, pattern }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    let clients
    if (pattern) {
      // Use clientdbfind for searching
      clients = await conn.clientDbFind(pattern, true) // true = search by name
    } else {
      // Fetch all clients by paginating through the entire database
      // The API may limit results per request, so we need to fetch in batches
      const batchSize = 200
      let allClients = []
      let offset = 0
      let hasMore = true
      
      while (hasMore) {
        const batch = await conn.clientDbList(offset, batchSize, true)
        const batchList = Array.isArray(batch) ? batch : (batch ? [batch] : [])
        
        if (batchList.length === 0) {
          hasMore = false
        } else {
          allClients = allClients.concat(batchList)
          offset += batchList.length
          // If we got fewer than requested, we've reached the end
          if (batchList.length < batchSize) {
            hasMore = false
          }
        }
        
        // Safety limit to prevent infinite loops
        if (offset > 50000) {
          hasMore = false
        }
      }
      
      clients = allClients
      console.log(`Fetched ${allClients.length} total clients from database`)
    }
    
    const clientList = Array.isArray(clients) ? clients : [clients]
    return {
      success: true,
      clients: clientList.map(c => {
        const p = JSON.parse(JSON.stringify(c))
        // Handle both camelCase and snake_case field names
        const lastConnected = p.clientLastconnected ?? p.client_lastconnected ?? p.lastconnected ?? 0
        const created = p.clientCreated ?? p.client_created ?? p.created ?? 0
        const totalConnections = p.clientTotalconnections ?? p.client_totalconnections ?? p.totalconnections ?? 0
        
        return {
          cldbid: parseInt(p.cldbid) || 0,
          client_unique_identifier: p.clientUniqueIdentifier || p.client_unique_identifier || '',
          client_nickname: p.clientNickname || p.client_nickname || '',
          client_created: parseInt(created) || 0,
          client_lastconnected: parseInt(lastConnected) || 0,
          client_totalconnections: parseInt(totalConnections) || 0,
          client_description: p.clientDescription || p.client_description || '',
          client_lastip: p.clientLastip || p.client_lastip || '',
        }
      }).filter(c => c.cldbid > 0)
    }
  } catch (error) {
    if (error.message?.includes('empty result')) {
      return { success: true, clients: [] }
    }
    return { success: false, error: error.message || 'Failed to get client database' }
  }
})

// Get client database info (detailed)
ipcMain.handle('get-client-db-info', async (event, { connectionId, cldbid }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    const info = await conn.clientDbInfo(cldbid)
    const clientInfo = Array.isArray(info) ? info[0] : info
    const p = JSON.parse(JSON.stringify(clientInfo))
    
    return {
      success: true,
      client: {
        cldbid: parseInt(p.cldbid || cldbid),
        client_unique_identifier: p.clientUniqueIdentifier,
        client_nickname: p.clientNickname,
        client_created: p.clientCreated,
        client_lastconnected: p.clientLastconnected,
        client_totalconnections: p.clientTotalconnections,
        client_description: p.clientDescription || '',
        client_lastip: p.clientLastip || '',
        client_month_bytes_uploaded: p.clientMonthBytesUploaded || 0,
        client_month_bytes_downloaded: p.clientMonthBytesDownloaded || 0,
        client_total_bytes_uploaded: p.clientTotalBytesUploaded || 0,
        client_total_bytes_downloaded: p.clientTotalBytesDownloaded || 0,
        client_base64HashClientUID: p.clientBase64HashClientUID || '',
      }
    }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to get client database info' }
  }
})

// Edit client database entry
ipcMain.handle('edit-client-db', async (event, { connectionId, cldbid, properties }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    await conn.clientDbEdit(cldbid, properties)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to edit client database entry' }
  }
})

// Delete client database entry
ipcMain.handle('delete-client-db', async (event, { connectionId, cldbid }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    await conn.clientDbDelete(cldbid)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to delete client database entry' }
  }
})

// Move client to channel
ipcMain.handle('move-client', async (event, { connectionId, clid, cid }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    // ts3-nodejs-library clientMove expects { clid, cid } object
    await conn.clientMove(clid, cid)
    return { success: true }
  } catch (error) {
    console.log('Move error:', error)
    // Try alternative: use raw execute command
    try {
      await conn.execute('clientmove', { clid: clid, cid: cid })
      return { success: true }
    } catch (err2) {
      return {
        success: false,
        error: err2.message || error.message || 'Failed to move client',
      }
    }
  }
})

// ==================== PRIVILEGE KEYS ====================

// Get privilege key list
ipcMain.handle('get-privilege-keys', async (event, { connectionId }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    const tokens = await conn.privilegeKeyList()
    const tokenList = Array.isArray(tokens) ? tokens : (tokens ? [tokens] : [])
    return {
      success: true,
      tokens: tokenList.map(t => {
        const p = JSON.parse(JSON.stringify(t))
        return {
          token: p.token,
          token_type: parseInt(p.tokenType) || 0,
          token_id1: parseInt(p.tokenId1) || 0,
          token_id2: parseInt(p.tokenId2) || 0,
          token_created: parseInt(p.tokenCreated) || 0,
          token_description: p.tokenDescription || '',
          token_customset: p.tokenCustomset || '',
        }
      })
    }
  } catch (error) {
    if (error.message?.includes('empty result')) {
      return { success: true, tokens: [] }
    }
    return { success: false, error: error.message || 'Failed to get privilege keys' }
  }
})

// Add privilege key
ipcMain.handle('add-privilege-key', async (event, { connectionId, tokenType, groupId, channelId, description }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    const result = await conn.privilegeKeyAdd(tokenType, groupId, channelId || 0, description || '')
    const p = JSON.parse(JSON.stringify(result))
    return { success: true, token: p.token }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to create privilege key' }
  }
})

// Delete privilege key
ipcMain.handle('delete-privilege-key', async (event, { connectionId, token }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    await conn.privilegeKeyDelete(token)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to delete privilege key' }
  }
})

// ==================== COMPLAINTS ====================

// Get complaints list
ipcMain.handle('get-complaints', async (event, { connectionId, targetCldbid }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    const complaints = targetCldbid 
      ? await conn.complainList(targetCldbid)
      : await conn.complainList()
    const complaintList = Array.isArray(complaints) ? complaints : (complaints ? [complaints] : [])
    return {
      success: true,
      complaints: complaintList.map(c => {
        const p = JSON.parse(JSON.stringify(c))
        return {
          tcldbid: parseInt(p.tcldbid) || 0,
          tname: p.tname || '',
          fcldbid: parseInt(p.fcldbid) || 0,
          fname: p.fname || '',
          message: p.message || '',
          timestamp: parseInt(p.timestamp) || 0,
        }
      })
    }
  } catch (error) {
    if (error.message?.includes('empty result')) {
      return { success: true, complaints: [] }
    }
    return { success: false, error: error.message || 'Failed to get complaints' }
  }
})

// Add complaint
ipcMain.handle('add-complaint', async (event, { connectionId, targetCldbid, message }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    await conn.complainAdd(targetCldbid, message)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to add complaint' }
  }
})

// Delete complaint
ipcMain.handle('delete-complaint', async (event, { connectionId, targetCldbid, fromCldbid }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    await conn.complainDel(targetCldbid, fromCldbid)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to delete complaint' }
  }
})

// Delete all complaints for a client
ipcMain.handle('delete-all-complaints', async (event, { connectionId, targetCldbid }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    await conn.complainDelAll(targetCldbid)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to delete all complaints' }
  }
})

// ==================== SERVER EDIT ====================

// Edit server properties
ipcMain.handle('edit-server', async (event, { connectionId, properties }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    await conn.serverEdit(properties)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to edit server' }
  }
})

// ==================== FILE BROWSER ====================

// Get file list for a channel
ipcMain.handle('get-file-list', async (event, { connectionId, cid, cpw, path }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    // TS3 API: ftgetfilelist cid=X cpw= path=/
    // Path should be "/" for root or "/foldername" for subdirectories
    const filePath = (!path || path === '/') ? '/' : path
    console.log(`Getting file list for channel ${cid}, path: "${filePath}"`)
    
    // Use raw execute to ensure correct parameter format
    const response = await conn.execute('ftgetfilelist', { 
      cid: String(cid), 
      cpw: cpw || '', 
      path: filePath 
    })
    
    console.log('Raw response:', JSON.stringify(response))
    
    // Response could be array or single object or have nested structure
    let fileList = []
    if (Array.isArray(response)) {
      fileList = response
    } else if (response && typeof response === 'object') {
      // Check if it's a single file entry or wrapper
      if (response.name !== undefined) {
        fileList = [response]
      } else if (response.files) {
        fileList = Array.isArray(response.files) ? response.files : [response.files]
      }
    }
    
    console.log(`Found ${fileList.length} files`)
    
    return {
      success: true,
      files: fileList.map(f => {
        const p = JSON.parse(JSON.stringify(f))
        return {
          cid: parseInt(p.cid) || cid,
          path: p.path || path || '/',
          name: p.name || '',
          size: parseInt(p.size) || 0,
          datetime: parseInt(p.datetime) || 0,
          type: parseInt(p.type) || 0, // 0 = directory, 1 = file
        }
      })
    }
  } catch (error) {
    // Error 1281 = "database empty result set" - this is normal for channels with no files
    if (error.id === '1281' || error.id === 1281 || error.message?.includes('empty result') || error.message?.includes('database empty')) {
      return { success: true, files: [] }
    }
    console.log('File list error:', error.message)
    return { success: false, error: error.message || 'Failed to get file list' }
  }
})

// Get file info
ipcMain.handle('get-file-info', async (event, { connectionId, cid, cpw, name }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    const info = await conn.ftGetFileInfo(cid, cpw || '', name)
    const p = JSON.parse(JSON.stringify(info))
    return {
      success: true,
      file: {
        cid: parseInt(p.cid) || cid,
        name: p.name || name,
        size: parseInt(p.size) || 0,
        datetime: parseInt(p.datetime) || 0,
      }
    }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to get file info' }
  }
})

// Create directory
ipcMain.handle('create-directory', async (event, { connectionId, cid, cpw, dirname }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    console.log(`Creating directory: cid=${cid}, dirname="${dirname}"`)
    // Use raw execute to ensure correct parameter format
    // ftcreatedir cid=X cpw= dirname=/path
    await conn.execute('ftcreatedir', {
      cid: String(cid),
      cpw: cpw || '',
      dirname: dirname
    })
    return { success: true }
  } catch (error) {
    console.log('Create dir error:', error.message)
    return { success: false, error: error.message || 'Failed to create directory' }
  }
})

// Delete file
ipcMain.handle('delete-file', async (event, { connectionId, cid, cpw, name }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    console.log(`Deleting file: cid=${cid}, name="${name}"`)
    // Use raw execute to ensure correct parameter format
    await conn.execute('ftdeletefile', {
      cid: String(cid),
      cpw: cpw || '',
      name: name
    })
    return { success: true }
  } catch (error) {
    console.log('Delete file error:', error.message)
    return { success: false, error: error.message || 'Failed to delete file' }
  }
})

// Rename file
ipcMain.handle('rename-file', async (event, { connectionId, cid, cpw, oldName, newName }) => {
  const conn = connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Not connected' }
  }

  try {
    await conn.ftRenameFile(cid, cpw || '', oldName, cid, cpw || '', newName)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to rename file' }
  }
})
