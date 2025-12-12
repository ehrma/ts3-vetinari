'use client'

import { StoredConnection, ServerState } from '@/types'

interface ConnectionListProps {
  connections: StoredConnection[]
  activeConnections: Map<string, ServerState>
  selectedId: string | null
  onSelect: (id: string) => void
  onConnect: (conn: StoredConnection) => void
  onDisconnect: (id: string) => void
  onEdit: (conn: StoredConnection) => void
  onDelete: (id: string) => void
}

export default function ConnectionList({
  connections,
  activeConnections,
  selectedId,
  onSelect,
  onConnect,
  onDisconnect,
  onEdit,
  onDelete,
}: ConnectionListProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <ul className="menu p-2 gap-1">
        {connections.map((conn) => {
          const isActive = activeConnections.has(conn.id)
          const isSelected = selectedId === conn.id
          
          return (
            <li key={conn.id}>
              <div
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer ${
                  isSelected ? 'bg-primary/20 border border-primary/40' : 'hover:bg-base-300'
                }`}
                onClick={() => onSelect(conn.id)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-success' : 'bg-base-content/30'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{conn.name}</div>
                    <div className="text-xs text-base-content/60 truncate">
                      {conn.host}:{conn.serverPort}
                    </div>
                  </div>
                </div>
                
                <div className="dropdown dropdown-end" onClick={(e) => e.stopPropagation()}>
                  <label tabIndex={0} className="btn btn-ghost btn-xs btn-circle">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </label>
                  <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-300 rounded-box w-40">
                    {isActive ? (
                      <li>
                        <button onClick={() => onDisconnect(conn.id)} className="text-warning">
                          Disconnect
                        </button>
                      </li>
                    ) : (
                      <li>
                        <button onClick={() => onConnect(conn)} className="text-success">
                          Connect
                        </button>
                      </li>
                    )}
                    <li>
                      <button onClick={() => onEdit(conn)}>Edit</button>
                    </li>
                    <li>
                      <button onClick={() => onDelete(conn.id)} className="text-error">
                        Delete
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </li>
          )
        })}
        
        {connections.length === 0 && (
          <li className="text-center text-base-content/60 py-4">
            No connections yet
          </li>
        )}
      </ul>
    </div>
  )
}
