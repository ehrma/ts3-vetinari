'use client'

import { useState, useEffect } from 'react'
import { StoredConnection } from '@/types'

interface ConnectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (conn: Omit<StoredConnection, 'id'>) => void
  editingConnection: StoredConnection | null
}

export default function ConnectionModal({
  isOpen,
  onClose,
  onSave,
  editingConnection,
}: ConnectionModalProps) {
  const [name, setName] = useState('')
  const [host, setHost] = useState('')
  const [queryPort, setQueryPort] = useState(10011)
  const [serverPort, setServerPort] = useState(9987)
  const [username, setUsername] = useState('serveradmin')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (editingConnection) {
      setName(editingConnection.name)
      setHost(editingConnection.host)
      setQueryPort(editingConnection.queryPort)
      setServerPort(editingConnection.serverPort)
      setUsername(editingConnection.username)
      setPassword(editingConnection.password)
    } else {
      setName('')
      setHost('')
      setQueryPort(10011)
      setServerPort(9987)
      setUsername('serveradmin')
      setPassword('')
    }
  }, [editingConnection, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      name,
      host,
      queryPort,
      serverPort,
      username,
      password,
    })
  }

  if (!isOpen) return null

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">
          {editingConnection ? 'Edit Connection' : 'Add Connection'}
        </h3>
        
        <form onSubmit={handleSubmit}>
          <div className="form-control mb-3">
            <label className="label">
              <span className="label-text">Connection Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My TS3 Server"
              required
            />
          </div>

          <div className="form-control mb-3">
            <label className="label">
              <span className="label-text">Host</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="ts3.example.com"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="form-control mb-3">
              <label className="label">
                <span className="label-text">Query Port</span>
              </label>
              <input
                type="number"
                className="input input-bordered"
                value={queryPort}
                onChange={(e) => setQueryPort(parseInt(e.target.value))}
                required
              />
            </div>

            <div className="form-control mb-3">
              <label className="label">
                <span className="label-text">Server Port</span>
              </label>
              <input
                type="number"
                className="input input-bordered"
                value={serverPort}
                onChange={(e) => setServerPort(parseInt(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="form-control mb-3">
            <label className="label">
              <span className="label-text">Username</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="serveradmin"
              required
            />
          </div>

          <div className="form-control mb-3">
            <label className="label">
              <span className="label-text">Password</span>
            </label>
            <input
              type="password"
              className="input input-bordered"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingConnection ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  )
}
