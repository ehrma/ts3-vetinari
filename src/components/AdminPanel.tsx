'use client'

import { useState, useEffect } from 'react'
import { Ban, ServerGroup, TS3Channel } from '@/types'

interface AdminPanelProps {
  connectionId: string
  channels: TS3Channel[]
  isOpen: boolean
  onClose: () => void
  onRefresh: () => void
}

type TabType = 'bans' | 'groups' | 'channels' | 'message'

export default function AdminPanel({ connectionId, channels, isOpen, onClose, onRefresh }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('bans')
  const [bans, setBans] = useState<Ban[]>([])
  const [groups, setGroups] = useState<ServerGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ban form state
  const [banIp, setBanIp] = useState('')
  const [banName, setBanName] = useState('')
  const [banUid, setBanUid] = useState('')
  const [banTime, setBanTime] = useState('')
  const [banReason, setBanReason] = useState('')

  // Channel form state
  const [channelName, setChannelName] = useState('')
  const [channelParent, setChannelParent] = useState<number>(0)
  const [channelPermanent, setChannelPermanent] = useState(true)

  // Message form state
  const [messageTarget, setMessageTarget] = useState<'server' | 'channel'>('server')
  const [messageChannelId, setMessageChannelId] = useState<number>(0)
  const [messageText, setMessageText] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'bans') loadBans()
      if (activeTab === 'groups') loadGroups()
    }
  }, [isOpen, activeTab])

  const loadBans = async () => {
    if (!window.electronAPI) return
    setLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI.getBans(connectionId)
      if (result.success && result.bans) {
        setBans(result.bans)
      } else {
        setError(result.error || 'Failed to load bans')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const loadGroups = async () => {
    if (!window.electronAPI) return
    setLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI.getServerGroups(connectionId)
      if (result.success && result.groups) {
        setGroups(result.groups)
      } else {
        setError(result.error || 'Failed to load server groups')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleAddBan = async () => {
    if (!window.electronAPI) return
    if (!banIp && !banName && !banUid) {
      setError('Please provide at least one of: IP, Name, or UID')
      return
    }
    
    setLoading(true)
    try {
      const time = banTime ? parseInt(banTime) : undefined
      const result = await window.electronAPI.addBan(connectionId, banIp || undefined, banName || undefined, banUid || undefined, time, banReason || undefined)
      if (result.success) {
        setBanIp('')
        setBanName('')
        setBanUid('')
        setBanTime('')
        setBanReason('')
        loadBans()
      } else {
        setError(result.error || 'Failed to add ban')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBan = async (banid: number) => {
    if (!window.electronAPI) return
    if (!confirm('Are you sure you want to delete this ban?')) return
    
    try {
      const result = await window.electronAPI.deleteBan(connectionId, banid)
      if (result.success) {
        loadBans()
      } else {
        setError(result.error || 'Failed to delete ban')
      }
    } catch (err) {
      setError(String(err))
    }
  }

  const handleCreateChannel = async () => {
    if (!window.electronAPI) return
    if (!channelName.trim()) {
      setError('Please enter a channel name')
      return
    }

    setLoading(true)
    try {
      const options: Record<string, unknown> = {}
      if (channelPermanent) {
        options.channel_flag_permanent = 1
      }
      
      const result = await window.electronAPI.createChannel(connectionId, channelName, channelParent, options)
      if (result.success) {
        setChannelName('')
        setChannelParent(0)
        onRefresh()
      } else {
        setError(result.error || 'Failed to create channel')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteChannel = async (cid: number, name: string) => {
    if (!window.electronAPI) return
    if (!confirm(`Are you sure you want to delete channel "${name}"?`)) return

    try {
      const result = await window.electronAPI.deleteChannel(connectionId, cid, true)
      if (result.success) {
        onRefresh()
      } else {
        setError(result.error || 'Failed to delete channel')
      }
    } catch (err) {
      setError(String(err))
    }
  }

  const handleSendMessage = async () => {
    if (!window.electronAPI) return
    if (!messageText.trim()) {
      setError('Please enter a message')
      return
    }

    setLoading(true)
    try {
      const targetMode = messageTarget === 'server' ? 3 : 2
      const target = messageTarget === 'server' ? 0 : messageChannelId
      
      const result = await window.electronAPI.sendMessage(connectionId, targetMode, target, messageText)
      if (result.success) {
        setMessageText('')
      } else {
        setError(result.error || 'Failed to send message')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp * 1000).toLocaleString()
  }

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return 'Permanent'
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-base-100 rounded-lg shadow-xl w-[900px] max-w-[95vw] h-[700px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h3 className="font-bold text-lg">Server Administration</h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-boxed m-4 mb-0">
          <button className={`tab ${activeTab === 'bans' ? 'tab-active' : ''}`} onClick={() => setActiveTab('bans')}>
            🚫 Bans
          </button>
          <button className={`tab ${activeTab === 'groups' ? 'tab-active' : ''}`} onClick={() => setActiveTab('groups')}>
            👥 Server Groups
          </button>
          <button className={`tab ${activeTab === 'channels' ? 'tab-active' : ''}`} onClick={() => setActiveTab('channels')}>
            📁 Channels
          </button>
          <button className={`tab ${activeTab === 'message' ? 'tab-active' : ''}`} onClick={() => setActiveTab('message')}>
            💬 Send Message
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="alert alert-error mx-4 mt-4">
            <span>{error}</span>
            <button className="btn btn-xs btn-ghost" onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          )}

          {/* Bans Tab */}
          {activeTab === 'bans' && !loading && (
            <div className="space-y-4">
              {/* Add Ban Form */}
              <div className="bg-base-200 rounded-lg p-4">
                <h4 className="font-semibold mb-3">Add New Ban</h4>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="IP Address (regex)"
                    className="input input-sm input-bordered"
                    value={banIp}
                    onChange={(e) => setBanIp(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Name (regex)"
                    className="input input-sm input-bordered"
                    value={banName}
                    onChange={(e) => setBanName(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Unique ID"
                    className="input input-sm input-bordered"
                    value={banUid}
                    onChange={(e) => setBanUid(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Duration (seconds, 0=permanent)"
                    className="input input-sm input-bordered"
                    value={banTime}
                    onChange={(e) => setBanTime(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Reason"
                    className="input input-sm input-bordered col-span-2"
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                  />
                </div>
                <button className="btn btn-sm btn-primary mt-3" onClick={handleAddBan}>
                  Add Ban
                </button>
              </div>

              {/* Ban List */}
              <div className="bg-base-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold">Active Bans ({bans.length})</h4>
                  <button className="btn btn-xs btn-ghost" onClick={loadBans}>Refresh</button>
                </div>
                {bans.length === 0 ? (
                  <p className="text-base-content/50 text-center py-4">No active bans</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-xs">
                      <thead>
                        <tr>
                          <th>Target</th>
                          <th>Reason</th>
                          <th>Created</th>
                          <th>Duration</th>
                          <th>By</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {bans.map((ban) => (
                          <tr key={ban.banid}>
                            <td>
                              {ban.ip && <div className="text-xs">IP: {ban.ip}</div>}
                              {ban.name && <div className="text-xs">Name: {ban.name}</div>}
                              {ban.uid && <div className="text-xs truncate max-w-32">UID: {ban.uid}</div>}
                              {ban.lastnickname && <div className="text-xs text-base-content/50">({ban.lastnickname})</div>}
                            </td>
                            <td className="max-w-40 truncate">{ban.reason || '-'}</td>
                            <td className="text-xs">{formatDate(ban.created)}</td>
                            <td>{formatDuration(ban.duration)}</td>
                            <td className="text-xs">{ban.invokername}</td>
                            <td>
                              <button 
                                className="btn btn-xs btn-error btn-ghost"
                                onClick={() => handleDeleteBan(ban.banid)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Server Groups Tab */}
          {activeTab === 'groups' && !loading && (
            <div className="bg-base-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold">Server Groups ({groups.length})</h4>
                <button className="btn btn-xs btn-ghost" onClick={loadGroups}>Refresh</button>
              </div>
              {groups.length === 0 ? (
                <p className="text-base-content/50 text-center py-4">No server groups found</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {groups.map((group) => (
                    <div key={group.sgid} className="flex items-center gap-2 p-2 bg-base-100 rounded">
                      <span className="badge badge-sm badge-primary">{group.sgid}</span>
                      <span className="flex-1">{group.name}</span>
                      <span className="text-xs text-base-content/50">
                        {group.type === 0 ? 'Template' : group.type === 1 ? 'Regular' : 'Query'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-base-content/50 mt-4">
                Tip: To add/remove clients from groups, click on a client in the channel tree and use the client details modal.
              </p>
            </div>
          )}

          {/* Channels Tab */}
          {activeTab === 'channels' && !loading && (
            <div className="space-y-4">
              {/* Create Channel Form */}
              <div className="bg-base-200 rounded-lg p-4">
                <h4 className="font-semibold mb-3">Create New Channel</h4>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Channel Name"
                    className="input input-sm input-bordered"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                  />
                  <select
                    className="select select-sm select-bordered"
                    value={channelParent}
                    onChange={(e) => setChannelParent(parseInt(e.target.value))}
                  >
                    <option value={0}>No Parent (Root)</option>
                    {channels.map((ch) => (
                      <option key={ch.cid} value={ch.cid}>{ch.channel_name}</option>
                    ))}
                  </select>
                </div>
                <label className="label cursor-pointer justify-start gap-2 mt-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={channelPermanent}
                    onChange={(e) => setChannelPermanent(e.target.checked)}
                  />
                  <span className="label-text">Permanent Channel</span>
                </label>
                <button className="btn btn-sm btn-primary mt-3" onClick={handleCreateChannel}>
                  Create Channel
                </button>
              </div>

              {/* Channel List */}
              <div className="bg-base-200 rounded-lg p-4">
                <h4 className="font-semibold mb-3">Existing Channels ({channels.length})</h4>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {channels.map((ch) => (
                    <div key={ch.cid} className="flex items-center justify-between p-2 bg-base-100 rounded">
                      <div className="flex items-center gap-2">
                        <span className="badge badge-xs badge-ghost">{ch.cid}</span>
                        <span className="text-sm">{ch.channel_name}</span>
                        {ch.pid > 0 && <span className="text-xs text-base-content/50">(sub-channel)</span>}
                      </div>
                      <button
                        className="btn btn-xs btn-error btn-ghost"
                        onClick={() => handleDeleteChannel(ch.cid, ch.channel_name)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Send Message Tab */}
          {activeTab === 'message' && !loading && (
            <div className="bg-base-200 rounded-lg p-4">
              <h4 className="font-semibold mb-3">Send Message</h4>
              <div className="space-y-3">
                <div className="flex gap-4">
                  <label className="label cursor-pointer gap-2">
                    <input
                      type="radio"
                      name="messageTarget"
                      className="radio radio-sm"
                      checked={messageTarget === 'server'}
                      onChange={() => setMessageTarget('server')}
                    />
                    <span className="label-text">Server Message</span>
                  </label>
                  <label className="label cursor-pointer gap-2">
                    <input
                      type="radio"
                      name="messageTarget"
                      className="radio radio-sm"
                      checked={messageTarget === 'channel'}
                      onChange={() => setMessageTarget('channel')}
                    />
                    <span className="label-text">Channel Message</span>
                  </label>
                </div>

                {messageTarget === 'channel' && (
                  <select
                    className="select select-sm select-bordered w-full"
                    value={messageChannelId}
                    onChange={(e) => setMessageChannelId(parseInt(e.target.value))}
                  >
                    <option value={0}>Select Channel</option>
                    {channels.map((ch) => (
                      <option key={ch.cid} value={ch.cid}>{ch.channel_name}</option>
                    ))}
                  </select>
                )}

                <textarea
                  className="textarea textarea-bordered w-full"
                  placeholder="Enter your message..."
                  rows={4}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />

                <button className="btn btn-primary" onClick={handleSendMessage}>
                  Send Message
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
