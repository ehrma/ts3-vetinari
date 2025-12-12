'use client'

import { useState, useEffect } from 'react'
import { PrivilegeKey, Complaint, FileEntry, ServerGroup, TS3Channel } from '@/types'

interface ServerManagementProps {
  connectionId: string
  serverInfo: {
    virtualserver_name?: string
    virtualserver_welcomemessage?: string
    virtualserver_maxclients?: number
    virtualserver_hostmessage?: string
    virtualserver_hostmessage_mode?: number
    virtualserver_password?: string
  } | null
  channels: TS3Channel[]
  isOpen: boolean
  onClose: () => void
  onRefresh: () => void
}

function formatDate(timestamp: number): string {
  if (!timestamp) return 'Never'
  return new Date(timestamp * 1000).toLocaleString()
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function ServerManagement({ 
  connectionId, 
  serverInfo, 
  channels,
  isOpen, 
  onClose,
  onRefresh 
}: ServerManagementProps) {
  const [activeTab, setActiveTab] = useState<'tokens' | 'complaints' | 'server' | 'files'>('tokens')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Privilege Keys state
  const [tokens, setTokens] = useState<PrivilegeKey[]>([])
  const [serverGroups, setServerGroups] = useState<ServerGroup[]>([])
  const [newTokenType, setNewTokenType] = useState<number>(0)
  const [newTokenGroup, setNewTokenGroup] = useState<number>(0)
  const [newTokenDescription, setNewTokenDescription] = useState('')
  const [createdToken, setCreatedToken] = useState<string | null>(null)

  // Complaints state
  const [complaints, setComplaints] = useState<Complaint[]>([])

  // Server Edit state
  const [serverName, setServerName] = useState('')
  const [serverWelcome, setServerWelcome] = useState('')
  const [serverMaxClients, setServerMaxClients] = useState('')
  const [serverHostMessage, setServerHostMessage] = useState('')
  const [serverPassword, setServerPassword] = useState('')

  // File Browser state
  const [files, setFiles] = useState<FileEntry[]>([])
  const [selectedChannel, setSelectedChannel] = useState<number>(0)
  const [currentPath, setCurrentPath] = useState('/')
  const [newDirName, setNewDirName] = useState('')
  const [channelFileCounts, setChannelFileCounts] = useState<Map<number, number>>(new Map())

  useEffect(() => {
    if (isOpen) {
      loadData()
      // Load file counts for all channels when opening files tab
      if (activeTab === 'files') {
        loadChannelFileCounts()
      }
    }
  }, [isOpen, activeTab])

  const loadChannelFileCounts = async () => {
    if (!window.electronAPI) return
    const counts = new Map<number, number>()
    
    // Load file counts for each channel (in parallel, limited batch)
    const batchSize = 10
    for (let i = 0; i < channels.length; i += batchSize) {
      const batch = channels.slice(i, i + batchSize)
      const results = await Promise.all(
        batch.map(async (ch) => {
          try {
            const result = await window.electronAPI.getFileList(connectionId, ch.cid, '', '/')
            return { cid: ch.cid, count: result.success ? (result.files?.length || 0) : 0 }
          } catch {
            return { cid: ch.cid, count: 0 }
          }
        })
      )
      results.forEach(r => counts.set(r.cid, r.count))
    }
    
    setChannelFileCounts(counts)
  }

  useEffect(() => {
    if (serverInfo) {
      setServerName(serverInfo.virtualserver_name || '')
      setServerWelcome(serverInfo.virtualserver_welcomemessage || '')
      setServerMaxClients(String(serverInfo.virtualserver_maxclients || ''))
      setServerHostMessage(serverInfo.virtualserver_hostmessage || '')
    }
  }, [serverInfo])

  const loadData = async () => {
    if (!window.electronAPI) return
    setLoading(true)
    setError(null)

    try {
      if (activeTab === 'tokens') {
        const [tokensResult, groupsResult] = await Promise.all([
          window.electronAPI.getPrivilegeKeys(connectionId),
          window.electronAPI.getServerGroups(connectionId)
        ])
        if (tokensResult.success) setTokens(tokensResult.tokens || [])
        if (groupsResult.success) setServerGroups(groupsResult.groups || [])
      } else if (activeTab === 'complaints') {
        const result = await window.electronAPI.getComplaints(connectionId)
        if (result.success) setComplaints(result.complaints || [])
      } else if (activeTab === 'files' && selectedChannel > 0) {
        const result = await window.electronAPI.getFileList(connectionId, selectedChannel, '', currentPath)
        if (result.success) setFiles(result.files || [])
        else setError(result.error || 'Failed to load files')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleCreateToken = async () => {
    if (!window.electronAPI || newTokenGroup === 0) return
    setLoading(true)
    setError(null)
    setCreatedToken(null)

    try {
      const result = await window.electronAPI.addPrivilegeKey(
        connectionId,
        newTokenType,
        newTokenGroup,
        0,
        newTokenDescription
      )
      if (result.success && result.token) {
        setCreatedToken(result.token)
        setNewTokenDescription('')
        loadData()
      } else {
        setError(result.error || 'Failed to create token')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteToken = async (token: string) => {
    if (!window.electronAPI) return
    if (!confirm('Delete this privilege key?')) return

    try {
      const result = await window.electronAPI.deletePrivilegeKey(connectionId, token)
      if (result.success) {
        loadData()
      } else {
        setError(result.error || 'Failed to delete token')
      }
    } catch (err) {
      setError(String(err))
    }
  }

  const handleDeleteComplaint = async (tcldbid: number, fcldbid: number) => {
    if (!window.electronAPI) return

    try {
      const result = await window.electronAPI.deleteComplaint(connectionId, tcldbid, fcldbid)
      if (result.success) {
        loadData()
      } else {
        setError(result.error || 'Failed to delete complaint')
      }
    } catch (err) {
      setError(String(err))
    }
  }

  const handleSaveServer = async () => {
    if (!window.electronAPI) return
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const properties: Record<string, unknown> = {}
      if (serverName) properties.virtualserver_name = serverName
      if (serverWelcome) properties.virtualserver_welcomemessage = serverWelcome
      if (serverMaxClients) properties.virtualserver_maxclients = parseInt(serverMaxClients)
      if (serverHostMessage) properties.virtualserver_hostmessage = serverHostMessage
      if (serverPassword) properties.virtualserver_password = serverPassword

      const result = await window.electronAPI.editServer(connectionId, properties)
      if (result.success) {
        setSuccess('Server settings saved successfully')
        setServerPassword('')
        onRefresh()
      } else {
        setError(result.error || 'Failed to save server settings')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleChannelSelect = async (cid: number) => {
    setSelectedChannel(cid)
    setCurrentPath('/')
    setFiles([])
    
    // Immediately load files for the selected channel
    if (cid > 0 && window.electronAPI) {
      setLoading(true)
      try {
        const result = await window.electronAPI.getFileList(connectionId, cid, '', '/')
        if (result.success) {
          setFiles(result.files || [])
        } else {
          setError(result.error || 'Failed to load files')
        }
      } catch (err) {
        setError(String(err))
      } finally {
        setLoading(false)
      }
    }
  }

  const handleNavigate = (name: string, isDir: boolean) => {
    if (isDir) {
      // TS3 uses forward slash paths like "/folder" or "/folder/subfolder"
      const newPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`
      setCurrentPath(newPath)
    }
  }

  const handleGoUp = () => {
    if (currentPath === '/' || currentPath === '') return
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    setCurrentPath(parts.length === 0 ? '/' : '/' + parts.join('/'))
  }

  useEffect(() => {
    if (selectedChannel > 0 && activeTab === 'files') {
      loadData()
    }
  }, [currentPath])

  const handleCreateDir = async () => {
    if (!window.electronAPI || !newDirName.trim() || selectedChannel === 0) return

    try {
      const dirPath = currentPath === '/' ? `/${newDirName}` : `${currentPath}/${newDirName}`
      const result = await window.electronAPI.createDirectory(connectionId, selectedChannel, '', dirPath)
      if (result.success) {
        setNewDirName('')
        loadData()
      } else {
        setError(result.error || 'Failed to create directory')
      }
    } catch (err) {
      setError(String(err))
    }
  }

  const handleDeleteFile = async (name: string) => {
    if (!window.electronAPI || selectedChannel === 0) return
    if (!confirm(`Delete "${name}"?`)) return

    try {
      const filePath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`
      const result = await window.electronAPI.deleteFile(connectionId, selectedChannel, '', filePath)
      if (result.success) {
        loadData()
      } else {
        setError(result.error || 'Failed to delete file')
      }
    } catch (err) {
      setError(String(err))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-base-100 rounded-lg shadow-xl w-[900px] max-w-[95vw] h-[700px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h3 className="font-bold text-lg">Server Management</h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-boxed bg-base-200 mx-4 mt-4">
          <button 
            className={`tab ${activeTab === 'tokens' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('tokens')}
          >
            🔑 Privilege Keys
          </button>
          <button 
            className={`tab ${activeTab === 'complaints' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('complaints')}
          >
            📋 Complaints
          </button>
          <button 
            className={`tab ${activeTab === 'server' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('server')}
          >
            ⚙️ Server Settings
          </button>
          <button 
            className={`tab ${activeTab === 'files' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            📁 File Browser
          </button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="alert alert-error mx-4 mt-4 py-2">
            <span>{error}</span>
            <button className="btn btn-xs btn-ghost" onClick={() => setError(null)}>✕</button>
          </div>
        )}
        {success && (
          <div className="alert alert-success mx-4 mt-4 py-2">
            <span>{success}</span>
            <button className="btn btn-xs btn-ghost" onClick={() => setSuccess(null)}>✕</button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : (
            <>
              {/* Privilege Keys Tab */}
              {activeTab === 'tokens' && (
                <div className="space-y-4">
                  {/* Create Token Form */}
                  <div className="bg-base-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-3">Create New Token</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="label label-text text-xs">Type</label>
                        <select 
                          className="select select-bordered select-sm w-full"
                          value={newTokenType}
                          onChange={(e) => setNewTokenType(parseInt(e.target.value))}
                        >
                          <option value={0}>Server Group</option>
                          <option value={1}>Channel Group</option>
                        </select>
                      </div>
                      <div>
                        <label className="label label-text text-xs">Group</label>
                        <select 
                          className="select select-bordered select-sm w-full"
                          value={newTokenGroup}
                          onChange={(e) => setNewTokenGroup(parseInt(e.target.value))}
                        >
                          <option value={0}>Select group...</option>
                          {serverGroups.map(g => (
                            <option key={g.sgid} value={g.sgid}>{g.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label label-text text-xs">Description</label>
                        <input
                          type="text"
                          className="input input-bordered input-sm w-full"
                          placeholder="Optional description"
                          value={newTokenDescription}
                          onChange={(e) => setNewTokenDescription(e.target.value)}
                        />
                      </div>
                    </div>
                    <button 
                      className="btn btn-primary btn-sm mt-3"
                      onClick={handleCreateToken}
                      disabled={newTokenGroup === 0}
                    >
                      Create Token
                    </button>
                  </div>

                  {/* Created Token Display */}
                  {createdToken && (
                    <div className="alert alert-info">
                      <div>
                        <span className="font-semibold">New Token Created:</span>
                        <code className="ml-2 bg-base-300 px-2 py-1 rounded select-all">{createdToken}</code>
                      </div>
                      <button className="btn btn-xs btn-ghost" onClick={() => setCreatedToken(null)}>✕</button>
                    </div>
                  )}

                  {/* Token List */}
                  <div className="bg-base-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-3">Existing Tokens ({tokens.length})</h4>
                    {tokens.length === 0 ? (
                      <p className="text-base-content/50">No privilege keys found</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="table table-xs">
                          <thead>
                            <tr>
                              <th>Token</th>
                              <th>Type</th>
                              <th>Group ID</th>
                              <th>Created</th>
                              <th>Description</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {tokens.map((t, i) => (
                              <tr key={i}>
                                <td className="font-mono text-xs max-w-[200px] truncate">{t.token}</td>
                                <td>{t.token_type === 0 ? 'Server' : 'Channel'}</td>
                                <td>{t.token_id1}</td>
                                <td className="text-xs">{formatDate(t.token_created)}</td>
                                <td className="max-w-[150px] truncate">{t.token_description || '-'}</td>
                                <td>
                                  <button 
                                    className="btn btn-xs btn-error"
                                    onClick={() => handleDeleteToken(t.token)}
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

              {/* Complaints Tab */}
              {activeTab === 'complaints' && (
                <div className="space-y-4">
                  <div className="bg-base-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-3">Complaints ({complaints.length})</h4>
                    {complaints.length === 0 ? (
                      <p className="text-base-content/50">No complaints found</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="table table-xs">
                          <thead>
                            <tr>
                              <th>Target</th>
                              <th>From</th>
                              <th>Message</th>
                              <th>Date</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {complaints.map((c, i) => (
                              <tr key={i}>
                                <td>
                                  <div className="font-medium">{c.tname}</div>
                                  <div className="text-xs text-base-content/50">ID: {c.tcldbid}</div>
                                </td>
                                <td>
                                  <div className="font-medium">{c.fname}</div>
                                  <div className="text-xs text-base-content/50">ID: {c.fcldbid}</div>
                                </td>
                                <td className="max-w-[250px]">{c.message}</td>
                                <td className="text-xs">{formatDate(c.timestamp)}</td>
                                <td>
                                  <button 
                                    className="btn btn-xs btn-error"
                                    onClick={() => handleDeleteComplaint(c.tcldbid, c.fcldbid)}
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

              {/* Server Settings Tab */}
              {activeTab === 'server' && (
                <div className="space-y-4">
                  <div className="bg-base-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-3">Server Settings</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="label label-text">Server Name</label>
                        <input
                          type="text"
                          className="input input-bordered w-full"
                          value={serverName}
                          onChange={(e) => setServerName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="label label-text">Max Clients</label>
                        <input
                          type="number"
                          className="input input-bordered w-full"
                          value={serverMaxClients}
                          onChange={(e) => setServerMaxClients(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="label label-text">Welcome Message</label>
                        <textarea
                          className="textarea textarea-bordered w-full"
                          rows={3}
                          value={serverWelcome}
                          onChange={(e) => setServerWelcome(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="label label-text">Host Message</label>
                        <textarea
                          className="textarea textarea-bordered w-full"
                          rows={2}
                          value={serverHostMessage}
                          onChange={(e) => setServerHostMessage(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="label label-text">Server Password (leave empty to keep current)</label>
                        <input
                          type="password"
                          className="input input-bordered w-full"
                          placeholder="Enter new password..."
                          value={serverPassword}
                          onChange={(e) => setServerPassword(e.target.value)}
                        />
                      </div>
                      <button 
                        className="btn btn-primary"
                        onClick={handleSaveServer}
                      >
                        Save Settings
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* File Browser Tab */}
              {activeTab === 'files' && (
                <div className="space-y-4">
                  {/* Channel Selector */}
                  <div className="bg-base-200 rounded-lg p-4">
                    <label className="label label-text">Select Channel</label>
                    <select 
                      className="select select-bordered w-full"
                      value={selectedChannel}
                      onChange={(e) => handleChannelSelect(parseInt(e.target.value))}
                    >
                      <option value={0}>Select a channel...</option>
                      {channels.map(ch => {
                        const fileCount = channelFileCounts.get(ch.cid)
                        const hasFiles = fileCount !== undefined && fileCount > 0
                        return (
                          <option key={ch.cid} value={ch.cid}>
                            {hasFiles ? `📁 ` : ''}{ch.channel_name}{hasFiles ? ` (${fileCount} files)` : ''}
                          </option>
                        )
                      })}
                    </select>
                    {channelFileCounts.size === 0 && (
                      <p className="text-xs text-base-content/50 mt-1">Loading file counts...</p>
                    )}
                  </div>

                  {selectedChannel > 0 && (
                    <>
                      {/* Path & Navigation */}
                      <div className="bg-base-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <button 
                            className="btn btn-sm btn-ghost"
                            onClick={handleGoUp}
                            disabled={currentPath === '/'}
                          >
                            ⬆️ Up
                          </button>
                          <span className="font-mono text-sm bg-base-300 px-3 py-1 rounded flex-1">
                            {currentPath}
                          </span>
                          <button 
                            className="btn btn-sm btn-ghost"
                            onClick={loadData}
                          >
                            🔄 Refresh
                          </button>
                        </div>

                        {/* Create Directory */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="input input-bordered input-sm flex-1"
                            placeholder="New folder name..."
                            value={newDirName}
                            onChange={(e) => setNewDirName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateDir()}
                          />
                          <button 
                            className="btn btn-sm btn-primary"
                            onClick={handleCreateDir}
                            disabled={!newDirName.trim()}
                          >
                            Create Folder
                          </button>
                        </div>
                      </div>

                      {/* File List */}
                      <div className="bg-base-200 rounded-lg p-4">
                        <h4 className="font-semibold mb-3">Files ({files.length})</h4>
                        {files.length === 0 ? (
                          <p className="text-base-content/50">No files in this directory</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="table table-xs">
                              <thead>
                                <tr>
                                  <th>Name</th>
                                  <th>Size</th>
                                  <th>Modified</th>
                                  <th></th>
                                </tr>
                              </thead>
                              <tbody>
                                {files.map((f, i) => (
                                  <tr key={i}>
                                    <td>
                                      <button
                                        className={`flex items-center gap-2 ${f.type === 0 ? 'text-primary cursor-pointer hover:underline' : ''}`}
                                        onClick={() => handleNavigate(f.name, f.type === 0)}
                                        disabled={f.type !== 0}
                                      >
                                        <span>{f.type === 0 ? '📁' : '📄'}</span>
                                        <span>{f.name}</span>
                                      </button>
                                    </td>
                                    <td>{f.type === 1 ? formatBytes(f.size) : '-'}</td>
                                    <td className="text-xs">{formatDate(f.datetime)}</td>
                                    <td>
                                      <button 
                                        className="btn btn-xs btn-error"
                                        onClick={() => handleDeleteFile(f.name)}
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
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
