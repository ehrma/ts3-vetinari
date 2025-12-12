'use client'

import { useState, useEffect } from 'react'
import { TS3ClientDetails, TS3Channel, ServerGroup } from '@/types'

interface ClientDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  connectionId: string
  clid: number
  channels: TS3Channel[]
  onMoveClient: (clid: number, cid: number) => Promise<void>
  onRefresh: () => void
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDate(timestamp: number): string {
  if (!timestamp) return 'Never'
  return new Date(timestamp * 1000).toLocaleString()
}

export default function ClientDetailsModal({
  isOpen,
  onClose,
  connectionId,
  clid,
  channels,
  onMoveClient,
  onRefresh,
}: ClientDetailsModalProps) {
  const [client, setClient] = useState<TS3ClientDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<number | null>(null)
  const [moving, setMoving] = useState(false)
  const [serverGroups, setServerGroups] = useState<ServerGroup[]>([])
  const [pokeMessage, setPokeMessage] = useState('')
  const [kickReason, setKickReason] = useState('')
  const [banTime, setBanTime] = useState('')
  const [banReason, setBanReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (isOpen && clid) {
      loadClientInfo()
      loadServerGroups()
    }
  }, [isOpen, clid, connectionId])

  const loadClientInfo = async () => {
    if (!window.electronAPI) return
    setLoading(true)
    setError(null)

    try {
      const result = await window.electronAPI.getClientInfo(connectionId, clid)
      if (result.success && result.client) {
        setClient(result.client)
        setSelectedChannel(result.client.cid)
      } else {
        setError(result.error || 'Failed to load client info')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const loadServerGroups = async () => {
    if (!window.electronAPI) return
    try {
      const result = await window.electronAPI.getServerGroups(connectionId)
      if (result.success && result.groups) {
        setServerGroups(result.groups.filter(g => g.type === 1)) // Only regular groups
      }
    } catch (err) {
      console.error('Failed to load server groups:', err)
    }
  }

  const handleMove = async () => {
    if (!client || selectedChannel === null || selectedChannel === client.cid) return
    setMoving(true)
    try {
      await onMoveClient(client.clid, selectedChannel)
      onClose()
    } catch (err) {
      setError(String(err))
    } finally {
      setMoving(false)
    }
  }

  const handlePoke = async () => {
    if (!window.electronAPI || !client || !pokeMessage.trim()) return
    setActionLoading(true)
    try {
      const result = await window.electronAPI.pokeClient(connectionId, client.clid, pokeMessage)
      if (result.success) {
        setPokeMessage('')
      } else {
        setError(result.error || 'Failed to poke client')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleKick = async (fromServer: boolean) => {
    if (!window.electronAPI || !client) return
    if (!confirm(`Are you sure you want to kick ${client.client_nickname} from ${fromServer ? 'the server' : 'the channel'}?`)) return
    
    setActionLoading(true)
    try {
      const result = await window.electronAPI.kickClient(connectionId, client.clid, fromServer ? 5 : 4, kickReason)
      if (result.success) {
        onRefresh()
        onClose()
      } else {
        setError(result.error || 'Failed to kick client')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleBan = async () => {
    if (!window.electronAPI || !client) return
    if (!confirm(`Are you sure you want to ban ${client.client_nickname}?`)) return
    
    setActionLoading(true)
    try {
      const time = banTime ? parseInt(banTime) : 0
      const result = await window.electronAPI.banClient(connectionId, client.clid, time, banReason)
      if (result.success) {
        onRefresh()
        onClose()
      } else {
        setError(result.error || 'Failed to ban client')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddToGroup = async (sgid: number) => {
    if (!window.electronAPI || !client) return
    setActionLoading(true)
    try {
      const result = await window.electronAPI.addClientToGroup(connectionId, sgid, client.client_database_id)
      if (result.success) {
        loadClientInfo()
      } else {
        setError(result.error || 'Failed to add to group')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemoveFromGroup = async (sgid: number) => {
    if (!window.electronAPI || !client) return
    setActionLoading(true)
    try {
      const result = await window.electronAPI.removeClientFromGroup(connectionId, sgid, client.client_database_id)
      if (result.success) {
        loadClientInfo()
      } else {
        setError(result.error || 'Failed to remove from group')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleSendPrivateMessage = async (msg: string) => {
    if (!window.electronAPI || !client || !msg.trim()) return
    setActionLoading(true)
    try {
      const result = await window.electronAPI.sendMessage(connectionId, 1, client.clid, msg)
      if (!result.success) {
        setError(result.error || 'Failed to send message')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setActionLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">Client Details</h3>

        {loading && (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        )}

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        {client && !loading && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-4 pb-4 border-b border-base-300">
              <div className="avatar placeholder">
                <div className="bg-primary text-primary-content rounded-full w-16">
                  <span className="text-2xl">{client.client_nickname.charAt(0).toUpperCase()}</span>
                </div>
              </div>
              <div>
                <h4 className="text-xl font-bold">{client.client_nickname}</h4>
                <p className="text-sm text-base-content/60">
                  {client.client_country && <span className="mr-2">🌍 {client.client_country}</span>}
                  {client.client_platform}
                </p>
              </div>
              <div className="ml-auto flex gap-2">
                {client.client_away === 1 && <span className="badge badge-warning">Away</span>}
                {client.client_input_muted === 1 && <span className="badge badge-error">Muted</span>}
                {client.client_is_recording === 1 && <span className="badge badge-error">Recording</span>}
                {client.client_is_channel_commander === 1 && <span className="badge badge-info">CC</span>}
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-base-content/60">Client ID:</span>
                <span className="ml-2 font-mono">{client.clid}</span>
              </div>
              <div>
                <span className="text-base-content/60">Database ID:</span>
                <span className="ml-2 font-mono">{client.client_database_id}</span>
              </div>
              <div className="col-span-2">
                <span className="text-base-content/60">Unique ID:</span>
                <span className="ml-2 font-mono text-xs break-all">{client.client_unique_identifier}</span>
              </div>
              <div>
                <span className="text-base-content/60">Version:</span>
                <span className="ml-2">{client.client_version}</span>
              </div>
              <div>
                <span className="text-base-content/60">IP Address:</span>
                <span className="ml-2 font-mono">{client.connection_client_ip}</span>
              </div>
            </div>

            {/* Connection Stats */}
            <div className="bg-base-200 rounded-lg p-4">
              <h5 className="font-semibold mb-2">Connection</h5>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-base-content/60">Connected:</span>
                  <span className="ml-2">{formatDuration(client.connection_connected_time)}</span>
                </div>
                <div>
                  <span className="text-base-content/60">Idle:</span>
                  <span className="ml-2">{formatDuration(client.client_idle_time)}</span>
                </div>
                <div>
                  <span className="text-base-content/60">Sent:</span>
                  <span className="ml-2">{formatBytes(client.connection_bytes_sent_total)}</span>
                </div>
                <div>
                  <span className="text-base-content/60">Received:</span>
                  <span className="ml-2">{formatBytes(client.connection_bytes_received_total)}</span>
                </div>
              </div>
            </div>

            {/* History */}
            <div className="bg-base-200 rounded-lg p-4">
              <h5 className="font-semibold mb-2">History</h5>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-base-content/60">First connected:</span>
                  <span className="ml-2">{formatDate(client.client_created)}</span>
                </div>
                <div>
                  <span className="text-base-content/60">Last connected:</span>
                  <span className="ml-2">{formatDate(client.client_lastconnected)}</span>
                </div>
                <div>
                  <span className="text-base-content/60">Total connections:</span>
                  <span className="ml-2">{client.client_totalconnections}</span>
                </div>
              </div>
            </div>

            {/* Move to Channel */}
            {client.client_type === 0 && (
              <div className="bg-base-200 rounded-lg p-4">
                <h5 className="font-semibold mb-2">Move to Channel</h5>
                <div className="flex gap-2">
                  <select
                    className="select select-bordered flex-1"
                    value={selectedChannel || ''}
                    onChange={(e) => setSelectedChannel(parseInt(e.target.value))}
                  >
                    {channels.map((ch) => (
                      <option key={ch.cid} value={ch.cid}>
                        {ch.channel_name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-primary"
                    onClick={handleMove}
                    disabled={moving || selectedChannel === client.cid}
                  >
                    {moving ? <span className="loading loading-spinner loading-sm"></span> : 'Move'}
                  </button>
                </div>
              </div>
            )}

            {client.client_description && (
              <div className="bg-base-200 rounded-lg p-4">
                <h5 className="font-semibold mb-2">Description</h5>
                <p className="text-sm">{client.client_description}</p>
              </div>
            )}

            {/* Server Groups */}
            {client.client_type === 0 && serverGroups.length > 0 && (
              <div className="bg-base-200 rounded-lg p-4">
                <h5 className="font-semibold mb-2">Server Groups</h5>
                <div className="flex flex-wrap gap-2">
                  {serverGroups.map((group) => {
                    const isInGroup = client.client_servergroups?.includes(String(group.sgid))
                    return (
                      <button
                        key={group.sgid}
                        className={`badge badge-lg cursor-pointer ${isInGroup ? 'badge-primary' : 'badge-ghost'}`}
                        onClick={() => isInGroup ? handleRemoveFromGroup(group.sgid) : handleAddToGroup(group.sgid)}
                        disabled={actionLoading}
                      >
                        {isInGroup ? '✓ ' : '+ '}{group.name}
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-base-content/50 mt-2">Click to add/remove from groups</p>
              </div>
            )}

            {/* Poke */}
            {client.client_type === 0 && (
              <div className="bg-base-200 rounded-lg p-4">
                <h5 className="font-semibold mb-2">Poke Client</h5>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Poke message..."
                    className="input input-sm input-bordered flex-1"
                    value={pokeMessage}
                    onChange={(e) => setPokeMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePoke()}
                  />
                  <button
                    className="btn btn-sm btn-warning"
                    onClick={handlePoke}
                    disabled={actionLoading || !pokeMessage.trim()}
                  >
                    Poke
                  </button>
                </div>
              </div>
            )}

            {/* Kick & Ban */}
            {client.client_type === 0 && (
              <div className="bg-error/10 rounded-lg p-4">
                <h5 className="font-semibold mb-2 text-error">Moderation</h5>
                <div className="space-y-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Kick reason (optional)"
                      className="input input-sm input-bordered w-full mb-2"
                      value={kickReason}
                      onChange={(e) => setKickReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        className="btn btn-sm btn-warning flex-1"
                        onClick={() => handleKick(false)}
                        disabled={actionLoading}
                      >
                        Kick from Channel
                      </button>
                      <button
                        className="btn btn-sm btn-error flex-1"
                        onClick={() => handleKick(true)}
                        disabled={actionLoading}
                      >
                        Kick from Server
                      </button>
                    </div>
                  </div>
                  <div className="divider my-1"></div>
                  <div>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="number"
                        placeholder="Ban duration (seconds, 0=permanent)"
                        className="input input-sm input-bordered flex-1"
                        value={banTime}
                        onChange={(e) => setBanTime(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Ban reason"
                        className="input input-sm input-bordered flex-1"
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                      />
                    </div>
                    <button
                      className="btn btn-sm btn-error w-full"
                      onClick={handleBan}
                      disabled={actionLoading}
                    >
                      Ban Client
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="modal-action">
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  )
}
