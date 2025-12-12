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
      addClientToGroup: (connectionId: string, sgid: number, cldbid: number) => Promise<SimpleResult>
      removeClientFromGroup: (connectionId: string, sgid: number, cldbid: number) => Promise<SimpleResult>
      // Channel Management
      createChannel: (connectionId: string, name: string, parent?: number, options?: Record<string, unknown>) => Promise<CreateChannelResult>
      editChannel: (connectionId: string, cid: number, properties: Record<string, unknown>) => Promise<SimpleResult>
      deleteChannel: (connectionId: string, cid: number, force?: boolean) => Promise<SimpleResult>
      // Client Database
      getClientDbList: (connectionId: string, start?: number, duration?: number, pattern?: string) => Promise<ClientDbListResult>
      getClientDbInfo: (connectionId: string, cldbid: number) => Promise<ClientDbInfoResult>
      editClientDb: (connectionId: string, cldbid: number, properties: Record<string, unknown>) => Promise<SimpleResult>
      deleteClientDb: (connectionId: string, cldbid: number) => Promise<SimpleResult>
    }
  }
}
