'use client'

import { useState, useEffect } from 'react'
import ConnectionList from '@/components/ConnectionList'
import ConnectionModal from '@/components/ConnectionModal'
import ServerView from '@/components/ServerView'
import ClientDetailsModal from '@/components/ClientDetailsModal'
import ServerDetailsModal from '@/components/ServerDetailsModal'
import ChannelDetailsModal from '@/components/ChannelDetailsModal'
import LogViewer from '@/components/LogViewer'
import AdminPanel from '@/components/AdminPanel'
import ClientDatabase from '@/components/ClientDatabase'
import { Connection, StoredConnection, ServerState, TS3Client, TS3Channel } from '@/types'

export default function Home() {
  const [connections, setConnections] = useState<StoredConnection[]>([])
  const [activeConnections, setActiveConnections] = useState<Map<string, ServerState>>(new Map())
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingConnection, setEditingConnection] = useState<StoredConnection | null>(null)
  const [selectedClient, setSelectedClient] = useState<TS3Client | null>(null)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [isServerModalOpen, setIsServerModalOpen] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<TS3Channel | null>(null)
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false)
  const [isLogViewerOpen, setIsLogViewerOpen] = useState(false)
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false)
  const [isClientDbOpen, setIsClientDbOpen] = useState(false)

  useEffect(() => {
    loadConnections()
  }, [])

  const loadConnections = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const stored = await window.electronAPI.getConnections()
      setConnections(stored)
    }
  }

  const saveConnection = async (conn: Omit<StoredConnection, 'id'>) => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      if (editingConnection) {
        await window.electronAPI.updateConnection({ ...conn, id: editingConnection.id })
      } else {
        await window.electronAPI.addConnection(conn)
      }
      await loadConnections()
      setIsModalOpen(false)
      setEditingConnection(null)
    }
  }

  const deleteConnection = async (id: string) => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.deleteConnection(id)
      if (activeConnections.has(id)) {
        await disconnectFromServer(id)
      }
      await loadConnections()
    }
  }

  const connectToServer = async (conn: StoredConnection) => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const result = await window.electronAPI.connect(conn)
        if (result.success) {
          setActiveConnections(prev => {
            const next = new Map(prev)
            next.set(conn.id, {
              connected: true,
              serverInfo: result.serverInfo,
              channels: result.channels || [],
              clients: result.clients || [],
            })
            return next
          })
          setSelectedConnectionId(conn.id)
        } else {
          alert(`Connection failed: ${result.error}`)
        }
      } catch (err) {
        alert(`Connection error: ${err}`)
      }
    }
  }

  const disconnectFromServer = async (id: string) => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.disconnect(id)
      setActiveConnections(prev => {
        const next = new Map(prev)
        next.delete(id)
        return next
      })
      if (selectedConnectionId === id) {
        setSelectedConnectionId(null)
      }
    }
  }

  const refreshServerData = async (id: string) => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const result = await window.electronAPI.refreshServer(id)
      if (result.success) {
        setActiveConnections(prev => {
          const next = new Map(prev)
          const current = next.get(id)
          if (current) {
            next.set(id, {
              ...current,
              channels: result.channels || [],
              clients: result.clients || [],
            })
          }
          return next
        })
      }
    }
  }

  const selectedConnection = connections.find(c => c.id === selectedConnectionId)
  const selectedServerState = selectedConnectionId ? activeConnections.get(selectedConnectionId) : null

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-72 bg-base-200 flex flex-col border-r border-base-300">
        <div className="p-4 border-b border-base-300">
          <h1 className="text-xl font-bold text-primary">TS3 Inspect</h1>
        </div>
        
        <div className="p-2">
          <button 
            className="btn btn-primary btn-sm w-full"
            onClick={() => {
              setEditingConnection(null)
              setIsModalOpen(true)
            }}
          >
            + Add Connection
          </button>
        </div>

        <ConnectionList
          connections={connections}
          activeConnections={activeConnections}
          selectedId={selectedConnectionId}
          onSelect={setSelectedConnectionId}
          onConnect={connectToServer}
          onDisconnect={disconnectFromServer}
          onEdit={(conn) => {
            setEditingConnection(conn)
            setIsModalOpen(true)
          }}
          onDelete={deleteConnection}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedConnection && selectedServerState ? (
          <ServerView
            connection={selectedConnection}
            serverState={selectedServerState}
            onRefresh={() => refreshServerData(selectedConnection.id)}
            onDisconnect={() => disconnectFromServer(selectedConnection.id)}
            onClientClick={(client) => {
              setSelectedClient(client)
              setIsClientModalOpen(true)
            }}
            onChannelClick={(channel) => {
              setSelectedChannel(channel)
              setIsChannelModalOpen(true)
            }}
            onServerClick={() => setIsServerModalOpen(true)}
            onLogsClick={() => setIsLogViewerOpen(true)}
            onAdminClick={() => setIsAdminPanelOpen(true)}
            onClientDbClick={() => setIsClientDbOpen(true)}
          />
        ) : selectedConnection ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">{selectedConnection.name}</h2>
              <p className="text-base-content/60 mb-4">Not connected</p>
              <button 
                className="btn btn-primary"
                onClick={() => connectToServer(selectedConnection)}
              >
                Connect
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-base-content/60">
              <p>Select a connection from the sidebar or add a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* Connection Modal */}
      <ConnectionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingConnection(null)
        }}
        onSave={saveConnection}
        editingConnection={editingConnection}
      />

      {/* Client Details Modal */}
      {selectedConnectionId && selectedClient && (
        <ClientDetailsModal
          isOpen={isClientModalOpen}
          onClose={() => {
            setIsClientModalOpen(false)
            setSelectedClient(null)
          }}
          connectionId={selectedConnectionId}
          clid={selectedClient.clid}
          channels={selectedServerState?.channels || []}
          onMoveClient={async (clid, cid) => {
            if (window.electronAPI) {
              const result = await window.electronAPI.moveClient(selectedConnectionId, clid, cid)
              if (result.success) {
                await refreshServerData(selectedConnectionId)
              } else {
                alert(`Failed to move client: ${result.error}`)
              }
            }
          }}
          onRefresh={() => refreshServerData(selectedConnectionId)}
        />
      )}

      {/* Server Details Modal */}
      {selectedConnection && (
        <ServerDetailsModal
          isOpen={isServerModalOpen}
          onClose={() => setIsServerModalOpen(false)}
          serverInfo={selectedServerState?.serverInfo}
          connectionName={selectedConnection.name}
          host={selectedConnection.host}
          port={selectedConnection.serverPort}
        />
      )}

      {/* Channel Details Modal */}
      {selectedConnectionId && selectedChannel && (
        <ChannelDetailsModal
          isOpen={isChannelModalOpen}
          onClose={() => {
            setIsChannelModalOpen(false)
            setSelectedChannel(null)
          }}
          connectionId={selectedConnectionId}
          cid={selectedChannel.cid}
        />
      )}

      {/* Log Viewer */}
      {selectedConnectionId && (
        <LogViewer
          connectionId={selectedConnectionId}
          isOpen={isLogViewerOpen}
          onClose={() => setIsLogViewerOpen(false)}
        />
      )}

      {/* Admin Panel */}
      {selectedConnectionId && (
        <AdminPanel
          connectionId={selectedConnectionId}
          channels={selectedServerState?.channels || []}
          isOpen={isAdminPanelOpen}
          onClose={() => setIsAdminPanelOpen(false)}
          onRefresh={() => refreshServerData(selectedConnectionId)}
        />
      )}

      {/* Client Database */}
      {selectedConnectionId && (
        <ClientDatabase
          connectionId={selectedConnectionId}
          isOpen={isClientDbOpen}
          onClose={() => setIsClientDbOpen(false)}
        />
      )}
    </div>
  )
}
