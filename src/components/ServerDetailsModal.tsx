'use client'

import { ServerInfo } from '@/types'

interface ServerDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  serverInfo: ServerInfo | undefined
  connectionName: string
  host: string
  port: number
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export default function ServerDetailsModal({
  isOpen,
  onClose,
  serverInfo,
  connectionName,
  host,
  port,
}: ServerDetailsModalProps) {
  if (!isOpen) return null

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">Server Details</h3>

        {serverInfo ? (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-4 pb-4 border-b border-base-300">
              <div className="avatar placeholder">
                <div className="bg-primary text-primary-content rounded-full w-16">
                  <span className="text-2xl">🖥️</span>
                </div>
              </div>
              <div>
                <h4 className="text-xl font-bold">{serverInfo.virtualserver_name}</h4>
                <p className="text-sm text-base-content/60">{host}:{port}</p>
              </div>
              <div className="ml-auto">
                <span className="badge badge-success badge-lg">
                  {serverInfo.virtualserver_clientsonline} / {serverInfo.virtualserver_maxclients} online
                </span>
              </div>
            </div>

            {/* Welcome Message */}
            {serverInfo.virtualserver_welcomemessage && (
              <div className="bg-base-200 rounded-lg p-4">
                <h5 className="font-semibold mb-2">Welcome Message</h5>
                <p className="text-sm whitespace-pre-wrap">{serverInfo.virtualserver_welcomemessage}</p>
              </div>
            )}

            {/* Server Info */}
            <div className="bg-base-200 rounded-lg p-4">
              <h5 className="font-semibold mb-2">Server Information</h5>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-base-content/60">Platform:</span>
                  <span className="ml-2">{serverInfo.virtualserver_platform}</span>
                </div>
                <div>
                  <span className="text-base-content/60">Version:</span>
                  <span className="ml-2">{serverInfo.virtualserver_version}</span>
                </div>
                <div>
                  <span className="text-base-content/60">Uptime:</span>
                  <span className="ml-2">{formatUptime(serverInfo.virtualserver_uptime)}</span>
                </div>
                <div>
                  <span className="text-base-content/60">Max Clients:</span>
                  <span className="ml-2">{serverInfo.virtualserver_maxclients}</span>
                </div>
              </div>
            </div>

            {/* Connection Info */}
            <div className="bg-base-200 rounded-lg p-4">
              <h5 className="font-semibold mb-2">Connection</h5>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-base-content/60">Profile Name:</span>
                  <span className="ml-2">{connectionName}</span>
                </div>
                <div>
                  <span className="text-base-content/60">Address:</span>
                  <span className="ml-2 font-mono">{host}:{port}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-base-content/60">
            No server information available
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
