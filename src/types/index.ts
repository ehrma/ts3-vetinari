export interface StoredConnection {
  id: string
  name: string
  host: string
  queryPort: number
  serverPort: number
  username: string
  password: string
}

export interface Connection extends StoredConnection {
  connected: boolean
}

export interface TS3Channel {
  cid: number
  pid: number
  channel_name: string
  channel_order: number
  total_clients: number
  channel_needed_subscribe_power: number
}

export interface TS3Client {
  clid: number
  cid: number
  client_nickname: string
  client_type: number
  client_away: number
  client_away_message?: string
  client_input_muted: number
  client_output_muted: number
  client_is_channel_commander: number
  client_is_talker: number
}

export interface ServerInfo {
  virtualserver_name: string
  virtualserver_welcomemessage: string
  virtualserver_maxclients: number
  virtualserver_clientsonline: number
  virtualserver_uptime: number
  virtualserver_version: string
  virtualserver_platform: string
}

export interface ServerState {
  connected: boolean
  serverInfo?: ServerInfo
  channels: TS3Channel[]
  clients: TS3Client[]
}

export interface ConnectResult {
  success: boolean
  error?: string
  serverInfo?: ServerInfo
  channels?: TS3Channel[]
  clients?: TS3Client[]
}

export interface RefreshResult {
  success: boolean
  error?: string
  channels?: TS3Channel[]
  clients?: TS3Client[]
}

export interface TS3ClientDetails {
  clid: number
  cid: number
  client_nickname: string
  client_unique_identifier: string
  client_database_id: number
  client_type: number
  client_away: number
  client_away_message: string
  client_input_muted: number
  client_output_muted: number
  client_is_channel_commander: number
  client_is_talker: number
  client_is_recording: number
  client_version: string
  client_platform: string
  client_country: string
  client_idle_time: number
  client_created: number
  client_lastconnected: number
  client_totalconnections: number
  client_description: string
  client_servergroups: string[]
  client_channel_group_id: number
  connection_client_ip: string
  connection_connected_time: number
  connection_bytes_sent_total: number
  connection_bytes_received_total: number
}

export interface ClientInfoResult {
  success: boolean
  error?: string
  client?: TS3ClientDetails
}

export interface MoveClientResult {
  success: boolean
  error?: string
}

export interface TS3ChannelDetails {
  cid: number
  pid: number
  channel_name: string
  channel_topic: string
  channel_description: string
  channel_password: boolean
  channel_codec: number
  channel_codec_quality: number
  channel_maxclients: number
  channel_maxfamilyclients: number
  channel_order: number
  channel_flag_permanent: number
  channel_flag_semi_permanent: number
  channel_flag_default: number
  channel_flag_password: number
  channel_codec_latency_factor: number
  channel_codec_is_unencrypted: number
  channel_delete_delay: number
  channel_needed_talk_power: number
  channel_icon_id: string
  total_clients: number
  total_clients_family: number
  seconds_empty: number
}

export interface ChannelInfoResult {
  success: boolean
  error?: string
  channel?: TS3ChannelDetails
}

export interface LogEntry {
  id: number
  timestamp: string
  type: 'connected' | 'client_connect' | 'client_disconnect' | 'client_moved' | 'message' | 'server_edit' | 'channel_create' | 'channel_delete' | 'channel_edit'
  message: string
  data: Record<string, unknown>
}

export interface ServerLogEntry {
  timestamp: string
  level: string
  channel: string
  serverId: string
  message: string
  raw: string
}

export interface ServerLogResult {
  success: boolean
  error?: string
  logs?: ServerLogEntry[]
  lastPos?: number
  fileSize?: number
}

export interface Ban {
  banid: number
  ip: string
  name: string
  uid: string
  mytsid: string
  lastnickname: string
  created: number
  duration: number
  invokername: string
  invokercldbid: number
  invokeruid: string
  reason: string
  enforcements: number
}

export interface ServerGroup {
  sgid: number
  name: string
  type: number
  iconid: number
  savedb: number
  sortid: number
  namemode: number
}

export interface BanListResult {
  success: boolean
  error?: string
  bans?: Ban[]
}

export interface ServerGroupsResult {
  success: boolean
  error?: string
  groups?: ServerGroup[]
}

export interface ServerGroupClient {
  cldbid: number
  client_nickname: string
  client_unique_identifier: string
}

export interface ServerGroupClientsResult {
  success: boolean
  error?: string
  clients?: ServerGroupClient[]
}

export interface Permission {
  permid: number
  permsid: string
  permdesc?: string
}

export interface GroupPermission {
  permid: number
  permsid: string
  permvalue: number
  permnegated: boolean
  permskip: boolean
}

export interface PermissionListResult {
  success: boolean
  error?: string
  permissions?: Permission[]
}

export interface GroupPermissionsResult {
  success: boolean
  error?: string
  permissions?: GroupPermission[]
}

export interface SimpleResult {
  success: boolean
  error?: string
}

export interface CreateChannelResult {
  success: boolean
  error?: string
  cid?: number
}

export interface ClientDbEntry {
  cldbid: number
  client_unique_identifier: string
  client_nickname: string
  client_created: number
  client_lastconnected: number
  client_totalconnections: number
  client_description: string
  client_lastip: string
}

export interface ClientDbInfo extends ClientDbEntry {
  client_month_bytes_uploaded: number
  client_month_bytes_downloaded: number
  client_total_bytes_uploaded: number
  client_total_bytes_downloaded: number
  client_base64HashClientUID: string
}

export interface ClientDbListResult {
  success: boolean
  error?: string
  clients?: ClientDbEntry[]
}

export interface ClientDbInfoResult {
  success: boolean
  error?: string
  client?: ClientDbInfo
}

// Privilege Keys
export interface PrivilegeKey {
  token: string
  token_type: number // 0 = server group, 1 = channel group
  token_id1: number // group ID
  token_id2: number // channel ID (for channel groups)
  token_created: number
  token_description: string
  token_customset: string
}

export interface PrivilegeKeyListResult {
  success: boolean
  error?: string
  tokens?: PrivilegeKey[]
}

export interface PrivilegeKeyAddResult {
  success: boolean
  error?: string
  token?: string
}

// Complaints
export interface Complaint {
  tcldbid: number // target client database ID
  tname: string // target name
  fcldbid: number // from client database ID
  fname: string // from name
  message: string
  timestamp: number
}

export interface ComplaintsResult {
  success: boolean
  error?: string
  complaints?: Complaint[]
}

// File Browser
export interface FileEntry {
  cid: number
  path: string
  name: string
  size: number
  datetime: number
  type: number // 0 = file, 1 = directory
}

export interface FileListResult {
  success: boolean
  error?: string
  files?: FileEntry[]
}

export interface FileInfoResult {
  success: boolean
  error?: string
  file?: {
    cid: number
    name: string
    size: number
    datetime: number
  }
}

declare global {
  interface Window {
    electronAPI: {
      getConnections: () => Promise<StoredConnection[]>
      addConnection: (conn: Omit<StoredConnection, 'id'>) => Promise<StoredConnection>
      updateConnection: (conn: StoredConnection) => Promise<StoredConnection>
      deleteConnection: (id: string) => Promise<void>
      connect: (conn: StoredConnection) => Promise<ConnectResult>
      disconnect: (id: string) => Promise<void>
      refreshServer: (id: string) => Promise<RefreshResult>
      getClientInfo: (connectionId: string, clid: number) => Promise<ClientInfoResult>
      getChannelInfo: (connectionId: string, cid: number) => Promise<ChannelInfoResult>
      moveClient: (connectionId: string, clid: number, cid: number) => Promise<MoveClientResult>
      getLogs: (connectionId: string) => Promise<LogEntry[]>
      getServerLogs: (connectionId: string, lines?: number, beginPos?: number) => Promise<ServerLogResult>
      clearLogs: (connectionId: string) => Promise<{ success: boolean }>
      onLogEntry: (callback: (data: { connectionId: string; entry: LogEntry }) => void) => () => void
      // Kick/Ban
      kickClient: (connectionId: string, clid: number, reasonId: number, reasonMsg?: string) => Promise<SimpleResult>
      banClient: (connectionId: string, clid: number, time?: number, reason?: string) => Promise<SimpleResult>
      getBans: (connectionId: string) => Promise<BanListResult>
      addBan: (connectionId: string, ip?: string, name?: string, uid?: string, time?: number, reason?: string) => Promise<SimpleResult>
      deleteBan: (connectionId: string, banid: number) => Promise<SimpleResult>
      // Messaging
      sendMessage: (connectionId: string, targetMode: number, target: number, msg: string) => Promise<SimpleResult>
      pokeClient: (connectionId: string, clid: number, msg: string) => Promise<SimpleResult>
      // Server Groups
      getServerGroups: (connectionId: string) => Promise<ServerGroupsResult>
      getServerGroupClients: (connectionId: string, sgid: number) => Promise<ServerGroupClientsResult>
      copyServerGroup: (connectionId: string, sourceSgid: number, name: string, type?: number) => Promise<{ success: boolean; error?: string; sgid?: number }>
      deleteServerGroup: (connectionId: string, sgid: number, force?: boolean) => Promise<SimpleResult>
      renameServerGroup: (connectionId: string, sgid: number, name: string) => Promise<SimpleResult>
      addClientToGroup: (connectionId: string, sgid: number, cldbid: number) => Promise<SimpleResult>
      removeClientFromGroup: (connectionId: string, sgid: number, cldbid: number) => Promise<SimpleResult>
      // Server Group Permissions
      getServerGroupPermissions: (connectionId: string, sgid: number) => Promise<GroupPermissionsResult>
      getPermissionList: (connectionId: string) => Promise<PermissionListResult>
      addServerGroupPermission: (connectionId: string, sgid: number, permsid: string, permvalue: number, permnegated?: boolean, permskip?: boolean) => Promise<SimpleResult>
      removeServerGroupPermission: (connectionId: string, sgid: number, permsid: string) => Promise<SimpleResult>
      // Channel Management
      createChannel: (connectionId: string, name: string, parent?: number, options?: Record<string, unknown>) => Promise<CreateChannelResult>
      editChannel: (connectionId: string, cid: number, properties: Record<string, unknown>) => Promise<SimpleResult>
      deleteChannel: (connectionId: string, cid: number, force?: boolean) => Promise<SimpleResult>
      // Client Database
      getClientDbList: (connectionId: string, start?: number, duration?: number, pattern?: string) => Promise<ClientDbListResult>
      getClientDbInfo: (connectionId: string, cldbid: number) => Promise<ClientDbInfoResult>
      editClientDb: (connectionId: string, cldbid: number, properties: Record<string, unknown>) => Promise<SimpleResult>
      deleteClientDb: (connectionId: string, cldbid: number) => Promise<SimpleResult>
      // Privilege Keys
      getPrivilegeKeys: (connectionId: string) => Promise<PrivilegeKeyListResult>
      addPrivilegeKey: (connectionId: string, tokenType: number, groupId: number, channelId?: number, description?: string) => Promise<PrivilegeKeyAddResult>
      deletePrivilegeKey: (connectionId: string, token: string) => Promise<SimpleResult>
      // Complaints
      getComplaints: (connectionId: string, targetCldbid?: number) => Promise<ComplaintsResult>
      addComplaint: (connectionId: string, targetCldbid: number, message: string) => Promise<SimpleResult>
      deleteComplaint: (connectionId: string, targetCldbid: number, fromCldbid: number) => Promise<SimpleResult>
      deleteAllComplaints: (connectionId: string, targetCldbid: number) => Promise<SimpleResult>
      // Server Edit
      editServer: (connectionId: string, properties: Record<string, unknown>) => Promise<SimpleResult>
      // File Browser
      getFileList: (connectionId: string, cid: number, cpw?: string, path?: string) => Promise<FileListResult>
      getFileInfo: (connectionId: string, cid: number, cpw?: string, name?: string) => Promise<FileInfoResult>
      createDirectory: (connectionId: string, cid: number, cpw?: string, dirname?: string) => Promise<SimpleResult>
      deleteFile: (connectionId: string, cid: number, cpw?: string, name?: string) => Promise<SimpleResult>
      renameFile: (connectionId: string, cid: number, cpw?: string, oldName?: string, newName?: string) => Promise<SimpleResult>
      // App Info & Updates
      getAppVersion: () => Promise<string>
      checkForUpdates: () => Promise<{ updateAvailable: boolean; currentVersion: string; latestVersion?: string; releaseNotes?: string; error?: string }>
      downloadUpdate: () => Promise<{ success: boolean; error?: string }>
      installUpdate: () => void
      openExternalUrl: (url: string) => Promise<void>
      onUpdateDownloadProgress: (callback: (data: { percent: number; transferred: number; total: number }) => void) => () => void
      onUpdateDownloaded: (callback: (data: { version: string }) => void) => () => void
      onUpdateError: (callback: (data: { error: string }) => void) => () => void
    }
  }
}
