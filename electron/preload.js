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
  getServerGroupClients: (connectionId, sgid) => ipcRenderer.invoke('get-server-group-clients', { connectionId, sgid }),
  copyServerGroup: (connectionId, sourceSgid, name, type) => ipcRenderer.invoke('copy-server-group', { connectionId, sourceSgid, name, type }),
  deleteServerGroup: (connectionId, sgid, force) => ipcRenderer.invoke('delete-server-group', { connectionId, sgid, force }),
  renameServerGroup: (connectionId, sgid, name) => ipcRenderer.invoke('rename-server-group', { connectionId, sgid, name }),
  addClientToGroup: (connectionId, sgid, cldbid) => ipcRenderer.invoke('add-client-to-group', { connectionId, sgid, cldbid }),
  removeClientFromGroup: (connectionId, sgid, cldbid) => ipcRenderer.invoke('remove-client-from-group', { connectionId, sgid, cldbid }),
  // Server Group Permissions
  getServerGroupPermissions: (connectionId, sgid) => ipcRenderer.invoke('get-server-group-permissions', { connectionId, sgid }),
  getPermissionList: (connectionId) => ipcRenderer.invoke('get-permission-list', { connectionId }),
  addServerGroupPermission: (connectionId, sgid, permsid, permvalue, permnegated, permskip) => ipcRenderer.invoke('add-server-group-permission', { connectionId, sgid, permsid, permvalue, permnegated, permskip }),
  removeServerGroupPermission: (connectionId, sgid, permsid) => ipcRenderer.invoke('remove-server-group-permission', { connectionId, sgid, permsid }),
  // Channel Management
  createChannel: (connectionId, name, parent, options) => ipcRenderer.invoke('create-channel', { connectionId, name, parent, options }),
  editChannel: (connectionId, cid, properties) => ipcRenderer.invoke('edit-channel', { connectionId, cid, properties }),
  deleteChannel: (connectionId, cid, force) => ipcRenderer.invoke('delete-channel', { connectionId, cid, force }),
  // Client Database
  getClientDbList: (connectionId, start, duration, pattern) => ipcRenderer.invoke('get-client-db-list', { connectionId, start, duration, pattern }),
  getClientDbInfo: (connectionId, cldbid) => ipcRenderer.invoke('get-client-db-info', { connectionId, cldbid }),
  editClientDb: (connectionId, cldbid, properties) => ipcRenderer.invoke('edit-client-db', { connectionId, cldbid, properties }),
  deleteClientDb: (connectionId, cldbid) => ipcRenderer.invoke('delete-client-db', { connectionId, cldbid }),
  // Privilege Keys
  getPrivilegeKeys: (connectionId) => ipcRenderer.invoke('get-privilege-keys', { connectionId }),
  addPrivilegeKey: (connectionId, tokenType, groupId, channelId, description) => ipcRenderer.invoke('add-privilege-key', { connectionId, tokenType, groupId, channelId, description }),
  deletePrivilegeKey: (connectionId, token) => ipcRenderer.invoke('delete-privilege-key', { connectionId, token }),
  // Complaints
  getComplaints: (connectionId, targetCldbid) => ipcRenderer.invoke('get-complaints', { connectionId, targetCldbid }),
  addComplaint: (connectionId, targetCldbid, message) => ipcRenderer.invoke('add-complaint', { connectionId, targetCldbid, message }),
  deleteComplaint: (connectionId, targetCldbid, fromCldbid) => ipcRenderer.invoke('delete-complaint', { connectionId, targetCldbid, fromCldbid }),
  deleteAllComplaints: (connectionId, targetCldbid) => ipcRenderer.invoke('delete-all-complaints', { connectionId, targetCldbid }),
  // Server Edit
  editServer: (connectionId, properties) => ipcRenderer.invoke('edit-server', { connectionId, properties }),
  // File Browser
  getFileList: (connectionId, cid, cpw, path) => ipcRenderer.invoke('get-file-list', { connectionId, cid, cpw, path }),
  getFileInfo: (connectionId, cid, cpw, name) => ipcRenderer.invoke('get-file-info', { connectionId, cid, cpw, name }),
  createDirectory: (connectionId, cid, cpw, dirname) => ipcRenderer.invoke('create-directory', { connectionId, cid, cpw, dirname }),
  deleteFile: (connectionId, cid, cpw, name) => ipcRenderer.invoke('delete-file', { connectionId, cid, cpw, name }),
  renameFile: (connectionId, cid, cpw, oldName, newName) => ipcRenderer.invoke('rename-file', { connectionId, cid, cpw, oldName, newName }),
  // App Info & Updates
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
  onUpdateDownloadProgress: (callback) => {
    ipcRenderer.on('update-download-progress', (event, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('update-download-progress')
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (event, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('update-downloaded')
  },
  onUpdateError: (callback) => {
    ipcRenderer.on('update-error', (event, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('update-error')
  },
})
