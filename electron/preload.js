const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getConnections: () => ipcRenderer.invoke('get-connections'),
  addConnection: (conn) => ipcRenderer.invoke('add-connection', conn),
  updateConnection: (conn) => ipcRenderer.invoke('update-connection', conn),
  deleteConnection: (id) => ipcRenderer.invoke('delete-connection', id),
  connect: (conn) => ipcRenderer.invoke('connect', conn),
  disconnect: (id) => ipcRenderer.invoke('disconnect', id),
  refreshServer: (id) => ipcRenderer.invoke('refresh-server', id),
  getClientInfo: (connectionId, clid) => ipcRenderer.invoke('get-client-info', { connectionId, clid }),
  getChannelInfo: (connectionId, cid) => ipcRenderer.invoke('get-channel-info', { connectionId, cid }),
  moveClient: (connectionId, clid, cid) => ipcRenderer.invoke('move-client', { connectionId, clid, cid }),
  getLogs: (connectionId) => ipcRenderer.invoke('get-logs', { connectionId }),
  getServerLogs: (connectionId, lines, beginPos) => ipcRenderer.invoke('get-server-logs', { connectionId, lines, beginPos }),
  clearLogs: (connectionId) => ipcRenderer.invoke('clear-logs', { connectionId }),
  onLogEntry: (callback) => {
    ipcRenderer.on('log-entry', (event, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('log-entry')
  },
  // Kick/Ban
  kickClient: (connectionId, clid, reasonId, reasonMsg) => ipcRenderer.invoke('kick-client', { connectionId, clid, reasonId, reasonMsg }),
  banClient: (connectionId, clid, time, reason) => ipcRenderer.invoke('ban-client', { connectionId, clid, time, reason }),
  getBans: (connectionId) => ipcRenderer.invoke('get-bans', { connectionId }),
  addBan: (connectionId, ip, name, uid, time, reason) => ipcRenderer.invoke('add-ban', { connectionId, ip, name, uid, time, reason }),
  deleteBan: (connectionId, banid) => ipcRenderer.invoke('delete-ban', { connectionId, banid }),
  // Messaging
  sendMessage: (connectionId, targetMode, target, msg) => ipcRenderer.invoke('send-message', { connectionId, targetMode, target, msg }),
  pokeClient: (connectionId, clid, msg) => ipcRenderer.invoke('poke-client', { connectionId, clid, msg }),
  // Server Groups
  getServerGroups: (connectionId) => ipcRenderer.invoke('get-server-groups', { connectionId }),
  addClientToGroup: (connectionId, sgid, cldbid) => ipcRenderer.invoke('add-client-to-group', { connectionId, sgid, cldbid }),
  removeClientFromGroup: (connectionId, sgid, cldbid) => ipcRenderer.invoke('remove-client-from-group', { connectionId, sgid, cldbid }),
  // Channel Management
  createChannel: (connectionId, name, parent, options) => ipcRenderer.invoke('create-channel', { connectionId, name, parent, options }),
  editChannel: (connectionId, cid, properties) => ipcRenderer.invoke('edit-channel', { connectionId, cid, properties }),
  deleteChannel: (connectionId, cid, force) => ipcRenderer.invoke('delete-channel', { connectionId, cid, force }),
  // Client Database
  getClientDbList: (connectionId, start, duration, pattern) => ipcRenderer.invoke('get-client-db-list', { connectionId, start, duration, pattern }),
  getClientDbInfo: (connectionId, cldbid) => ipcRenderer.invoke('get-client-db-info', { connectionId, cldbid }),
  editClientDb: (connectionId, cldbid, properties) => ipcRenderer.invoke('edit-client-db', { connectionId, cldbid, properties }),
  deleteClientDb: (connectionId, cldbid) => ipcRenderer.invoke('delete-client-db', { connectionId, cldbid }),
})
