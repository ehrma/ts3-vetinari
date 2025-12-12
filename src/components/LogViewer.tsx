'use client'

import { useState, useEffect, useRef } from 'react'
import { LogEntry, ServerLogEntry } from '@/types'

interface LogViewerProps {
  connectionId: string
  isOpen: boolean
  onClose: () => void
}

const LOG_TYPE_ICONS: Record<string, string> = {
  connected: '🔗',
  client_connect: '➡️',
  client_disconnect: '⬅️',
  client_moved: '↔️',
  message: '💬',
  server_edit: '⚙️',
  channel_create: '➕',
  channel_delete: '➖',
  channel_edit: '✏️',
}

const LOG_TYPE_COLORS: Record<string, string> = {
  connected: 'text-success',
  client_connect: 'text-success',
  client_disconnect: 'text-error',
  client_moved: 'text-info',
  message: 'text-primary',
  server_edit: 'text-warning',
  channel_create: 'text-success',
  channel_delete: 'text-error',
  channel_edit: 'text-warning',
}

const LOG_LEVEL_COLORS: Record<string, string> = {
  'CRITICAL': 'text-error',
  'ERROR': 'text-error',
  'WARNING': 'text-warning',
  'INFO': 'text-info',
  'DEBUG': 'text-base-content/70',
}

const LOG_LEVEL_BADGES: Record<string, string> = {
  'CRITICAL': 'badge-error',
  'ERROR': 'badge-error',
  'WARNING': 'badge-warning',
  'INFO': 'badge-info',
  'DEBUG': 'badge-ghost',
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString()
}

function formatServerLogTime(timestamp: string): string {
  // Server log format: 2024-12-11 23:45:12 (server time, likely UTC)
  // Parse and convert to local time
  try {
    // Treat as UTC and convert to local
    const utcDate = new Date(timestamp.replace(' ', 'T') + 'Z')
    return utcDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + utcDate.toLocaleTimeString()
  } catch {
    return timestamp
  }
}

export default function LogViewer({ connectionId, isOpen, onClose }: LogViewerProps) {
  const [activeTab, setActiveTab] = useState<'live' | 'server'>('live')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [serverLogs, setServerLogs] = useState<ServerLogEntry[]>([])
  const [serverLogsLoading, setServerLogsLoading] = useState(false)
  const [serverLogsError, setServerLogsError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const logContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && connectionId && window.electronAPI) {
      loadLogs()
      
      const unsubscribe = window.electronAPI.onLogEntry((data) => {
        if (data.connectionId === connectionId) {
          setLogs(prev => [...prev, data.entry])
        }
      })

      return () => {
        unsubscribe()
      }
    }
  }, [isOpen, connectionId])

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs, serverLogs, autoScroll])

  const loadLogs = async () => {
    if (!window.electronAPI) return
    const existingLogs = await window.electronAPI.getLogs(connectionId)
    setLogs(existingLogs)
  }

  const loadServerLogs = async () => {
    if (!window.electronAPI) return
    setServerLogsLoading(true)
    setServerLogsError(null)
    try {
      const result = await window.electronAPI.getServerLogs(connectionId, 100)
      if (result.success && result.logs) {
        setServerLogs(result.logs)
      } else {
        setServerLogsError(result.error || 'Failed to load server logs')
      }
    } catch (err) {
      setServerLogsError(String(err))
    } finally {
      setServerLogsLoading(false)
    }
  }

  const clearLogs = async () => {
    if (!window.electronAPI) return
    await window.electronAPI.clearLogs(connectionId)
    setLogs([])
  }

  const filteredLogs = filter === 'all' 
    ? logs 
    : filter === 'messages' 
      ? logs.filter(l => l.type === 'message')
      : filter === 'connections'
        ? logs.filter(l => ['client_connect', 'client_disconnect', 'connected'].includes(l.type))
        : filter === 'channels'
          ? logs.filter(l => ['channel_create', 'channel_delete', 'channel_edit', 'client_moved'].includes(l.type))
          : logs

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-base-100 rounded-lg shadow-xl w-[900px] max-w-[90vw] h-[650px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-lg">Logs</h3>
            <div className="tabs tabs-boxed">
              <button 
                className={`tab tab-sm ${activeTab === 'live' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('live')}
              >
                Live Events
              </button>
              <button 
                className={`tab tab-sm ${activeTab === 'server' ? 'tab-active' : ''}`}
                onClick={() => {
                  setActiveTab('server')
                  if (serverLogs.length === 0) loadServerLogs()
                }}
              >
                Server Log
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'live' && (
              <>
                <select 
                  className="select select-sm select-bordered"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All Events</option>
                  <option value="messages">Messages Only</option>
                  <option value="connections">Connections</option>
                  <option value="channels">Channel Events</option>
                </select>
                <button className="btn btn-sm btn-ghost" onClick={clearLogs}>
                  Clear
                </button>
              </>
            )}
            {activeTab === 'server' && (
              <button 
                className="btn btn-sm btn-ghost" 
                onClick={loadServerLogs}
                disabled={serverLogsLoading}
              >
                {serverLogsLoading ? <span className="loading loading-spinner loading-xs"></span> : 'Refresh'}
              </button>
            )}
            <label className="label cursor-pointer gap-2">
              <span className="label-text text-sm">Auto-scroll</span>
              <input 
                type="checkbox" 
                className="checkbox checkbox-sm" 
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
            </label>
            <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* Log Content */}
        <div 
          ref={logContainerRef}
          className="flex-1 overflow-y-auto p-4 font-mono text-sm bg-base-200"
        >
          {activeTab === 'live' ? (
            filteredLogs.length === 0 ? (
              <div className="text-center text-base-content/50 py-8">
                No log entries yet. Events will appear here as they happen.
              </div>
            ) : (
              <div className="space-y-1">
                {filteredLogs.map((entry) => (
                  <div 
                    key={entry.id} 
                    className="flex items-start gap-2 py-1 px-2 hover:bg-base-300 rounded"
                  >
                    <span className="text-base-content/50 flex-shrink-0 w-36 text-xs">
                      {formatTime(entry.timestamp)}
                    </span>
                    <span className="flex-shrink-0 w-6">
                      {LOG_TYPE_ICONS[entry.type] || '📋'}
                    </span>
                    <span className={`flex-1 ${LOG_TYPE_COLORS[entry.type] || ''}`}>
                      {entry.message}
                    </span>
                  </div>
                ))}
              </div>
            )
          ) : (
            serverLogsLoading ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : serverLogsError ? (
              <div className="text-center text-error py-8">
                {serverLogsError}
              </div>
            ) : serverLogs.length === 0 ? (
              <div className="text-center text-base-content/50 py-8">
                No server logs available. Click Refresh to load.
              </div>
            ) : (
              <div className="space-y-1">
                {serverLogs.map((entry, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start gap-2 py-1.5 px-2 hover:bg-base-300 rounded"
                  >
                    <span className="text-base-content/50 flex-shrink-0 w-32 text-xs">
                      {formatServerLogTime(entry.timestamp)}
                    </span>
                    <span className={`badge badge-xs flex-shrink-0 ${LOG_LEVEL_BADGES[entry.level] || 'badge-ghost'}`}>
                      {entry.level}
                    </span>
                    <span className="text-base-content/40 flex-shrink-0 text-xs w-28 truncate" title={entry.channel}>
                      {entry.channel}
                    </span>
                    <span className={`flex-1 text-sm ${LOG_LEVEL_COLORS[entry.level] || ''}`}>
                      {entry.message}
                    </span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-base-300 text-xs text-base-content/50 text-center">
          {activeTab === 'live' 
            ? `${filteredLogs.length} entries ${filter !== 'all' ? `(filtered from ${logs.length} total)` : ''}`
            : `${serverLogs.length} server log entries`
          }
        </div>
      </div>
    </div>
  )
}
