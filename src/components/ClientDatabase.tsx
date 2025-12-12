'use client'

import { useState, useEffect } from 'react'
import { ClientDbEntry, ClientDbInfo } from '@/types'

interface ClientDatabaseProps {
  connectionId: string
  isOpen: boolean
  onClose: () => void
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

type SortField = 'cldbid' | 'client_nickname' | 'client_lastconnected' | 'client_totalconnections'
type SortDirection = 'asc' | 'desc'

export default function ClientDatabase({ connectionId, isOpen, onClose }: ClientDatabaseProps) {
  const [allClients, setAllClients] = useState<ClientDbEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchPattern, setSearchPattern] = useState('')
  const [page, setPage] = useState(0)
  const [selectedClient, setSelectedClient] = useState<ClientDbInfo | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [editDescription, setEditDescription] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [sortField, setSortField] = useState<SortField>('client_lastconnected')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const pageSize = 25

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
    setPage(0) // Reset to first page when sorting changes
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="opacity-30 ml-1">↕</span>
    return <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
  }

  useEffect(() => {
    if (isOpen) {
      loadClients()
    }
  }, [isOpen])

  const loadClients = async () => {
    if (!window.electronAPI) return
    setLoading(true)
    setError(null)

    try {
      // Always fetch all clients, then filter client-side for search
      // This ensures sorting works correctly across all results
      const result = await window.electronAPI.getClientDbList(
        connectionId,
        0,
        10000,
        undefined // Don't use server-side search, we'll filter client-side
      )
      if (result.success && result.clients) {
        setAllClients(result.clients)
        setPage(0)
      } else {
        setError(result.error || 'Failed to load client database')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  // Filter clients based on search pattern (client-side)
  const filteredClients = searchPattern
    ? allClients.filter(c => 
        c.client_nickname.toLowerCase().includes(searchPattern.toLowerCase()) ||
        c.client_unique_identifier.toLowerCase().includes(searchPattern.toLowerCase())
      )
    : allClients

  // Sort filtered clients
  const sortedClients = [...filteredClients].sort((a, b) => {
    let aVal: string | number = a[sortField]
    let bVal: string | number = b[sortField]
    
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase()
      bVal = (bVal as string).toLowerCase()
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  // Paginate after sorting
  const paginatedClients = sortedClients.slice(page * pageSize, (page + 1) * pageSize)
  const totalPages = Math.ceil(sortedClients.length / pageSize)

  const handleSearch = () => {
    setPage(0) // Reset to first page when searching
  }

  const loadClientDetails = async (cldbid: number) => {
    if (!window.electronAPI) return
    setDetailsLoading(true)
    setError(null)

    try {
      const result = await window.electronAPI.getClientDbInfo(connectionId, cldbid)
      if (result.success && result.client) {
        setSelectedClient(result.client)
        setEditDescription(result.client.client_description || '')
      } else {
        setError(result.error || 'Failed to load client details')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleSaveDescription = async () => {
    if (!window.electronAPI || !selectedClient) return
    setDetailsLoading(true)

    try {
      const result = await window.electronAPI.editClientDb(connectionId, selectedClient.cldbid, {
        client_description: editDescription
      })
      if (result.success) {
        setIsEditing(false)
        loadClientDetails(selectedClient.cldbid)
      } else {
        setError(result.error || 'Failed to save description')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleDeleteClient = async (cldbid: number, nickname: string) => {
    if (!window.electronAPI) return
    if (!confirm(`Are you sure you want to delete "${nickname}" from the database? This cannot be undone.`)) return

    try {
      const result = await window.electronAPI.deleteClientDb(connectionId, cldbid)
      if (result.success) {
        setSelectedClient(null)
        loadClients()
      } else {
        setError(result.error || 'Failed to delete client')
      }
    } catch (err) {
      setError(String(err))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-base-100 rounded-lg shadow-xl w-[1000px] max-w-[95vw] h-[800px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h3 className="font-bold text-lg">Client Database</h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>✕</button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-base-300">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search by nickname..."
              className="input input-bordered flex-1"
              value={searchPattern}
              onChange={(e) => setSearchPattern(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button className="btn btn-primary" onClick={handleSearch}>
              Search
            </button>
            <button className="btn btn-ghost" onClick={() => { setSearchPattern(''); setPage(0); loadClients(); }}>
              Clear
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="alert alert-error mx-4 mt-4">
            <span>{error}</span>
            <button className="btn btn-xs btn-ghost" onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Client List */}
          <div className="w-1/2 border-r border-base-300 flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <span className="loading loading-spinner loading-lg"></span>
                </div>
              ) : allClients.length === 0 ? (
                <div className="text-center py-8 text-base-content/50">
                  No clients found
                </div>
              ) : (
                <table className="table table-xs table-pin-rows">
                  <thead>
                    <tr>
                      <th 
                        className="cursor-pointer hover:bg-base-300 select-none"
                        onClick={() => handleSort('cldbid')}
                      >
                        ID<SortIcon field="cldbid" />
                      </th>
                      <th 
                        className="cursor-pointer hover:bg-base-300 select-none"
                        onClick={() => handleSort('client_nickname')}
                      >
                        Nickname<SortIcon field="client_nickname" />
                      </th>
                      <th 
                        className="cursor-pointer hover:bg-base-300 select-none"
                        onClick={() => handleSort('client_lastconnected')}
                      >
                        Last Connected<SortIcon field="client_lastconnected" />
                      </th>
                      <th 
                        className="cursor-pointer hover:bg-base-300 select-none"
                        onClick={() => handleSort('client_totalconnections')}
                      >
                        Connections<SortIcon field="client_totalconnections" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedClients.map((client) => (
                      <tr
                        key={client.cldbid}
                        className={`cursor-pointer hover:bg-base-200 ${selectedClient?.cldbid === client.cldbid ? 'bg-primary/20' : ''}`}
                        onClick={() => loadClientDetails(client.cldbid)}
                      >
                        <td className="font-mono text-xs">{client.cldbid}</td>
                        <td className="font-medium">{client.client_nickname}</td>
                        <td className="text-xs">{formatDate(client.client_lastconnected)}</td>
                        <td className="text-center">{client.client_totalconnections}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            <div className="p-2 border-t border-base-300 flex justify-between items-center">
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                ← Previous
              </button>
              <span className="text-sm text-base-content/60">
                Page {page + 1} of {Math.max(1, totalPages)} ({sortedClients.length} clients{searchPattern ? ` matching "${searchPattern}"` : ''})
              </span>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages - 1}
              >
                Next →
              </button>
            </div>
          </div>

          {/* Client Details */}
          <div className="w-1/2 p-4 overflow-y-auto">
            {detailsLoading ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : selectedClient ? (
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center gap-4">
                  <div className="avatar placeholder">
                    <div className="bg-primary text-primary-content rounded-full w-16">
                      <span className="text-2xl">{selectedClient.client_nickname.charAt(0).toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold">{selectedClient.client_nickname}</h4>
                    <p className="text-sm text-base-content/60">Database ID: {selectedClient.cldbid}</p>
                  </div>
                </div>

                {/* Unique ID */}
                <div className="bg-base-200 rounded-lg p-3">
                  <h5 className="font-semibold text-sm mb-1">Unique Identifier</h5>
                  <p className="font-mono text-xs break-all">{selectedClient.client_unique_identifier}</p>
                </div>

                {/* Connection Info */}
                <div className="bg-base-200 rounded-lg p-3">
                  <h5 className="font-semibold text-sm mb-2">Connection History</h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-base-content/60">First seen:</span>
                      <div>{formatDate(selectedClient.client_created)}</div>
                    </div>
                    <div>
                      <span className="text-base-content/60">Last seen:</span>
                      <div>{formatDate(selectedClient.client_lastconnected)}</div>
                    </div>
                    <div>
                      <span className="text-base-content/60">Total connections:</span>
                      <div>{selectedClient.client_totalconnections}</div>
                    </div>
                    <div>
                      <span className="text-base-content/60">Last IP:</span>
                      <div className="font-mono text-xs">{selectedClient.client_lastip || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* Transfer Stats */}
                <div className="bg-base-200 rounded-lg p-3">
                  <h5 className="font-semibold text-sm mb-2">Transfer Statistics</h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-base-content/60">Month uploaded:</span>
                      <div>{formatBytes(selectedClient.client_month_bytes_uploaded)}</div>
                    </div>
                    <div>
                      <span className="text-base-content/60">Month downloaded:</span>
                      <div>{formatBytes(selectedClient.client_month_bytes_downloaded)}</div>
                    </div>
                    <div>
                      <span className="text-base-content/60">Total uploaded:</span>
                      <div>{formatBytes(selectedClient.client_total_bytes_uploaded)}</div>
                    </div>
                    <div>
                      <span className="text-base-content/60">Total downloaded:</span>
                      <div>{formatBytes(selectedClient.client_total_bytes_downloaded)}</div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-base-200 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-semibold text-sm">Description</h5>
                    {!isEditing && (
                      <button className="btn btn-xs btn-ghost" onClick={() => setIsEditing(true)}>
                        Edit
                      </button>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        className="textarea textarea-bordered w-full"
                        rows={3}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button className="btn btn-sm btn-primary" onClick={handleSaveDescription}>
                          Save
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => {
                          setIsEditing(false)
                          setEditDescription(selectedClient.client_description || '')
                        }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm">{selectedClient.client_description || 'No description'}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="bg-error/10 rounded-lg p-3">
                  <h5 className="font-semibold text-sm mb-2 text-error">Danger Zone</h5>
                  <button
                    className="btn btn-sm btn-error"
                    onClick={() => handleDeleteClient(selectedClient.cldbid, selectedClient.client_nickname)}
                  >
                    Delete from Database
                  </button>
                  <p className="text-xs text-base-content/50 mt-2">
                    This will permanently remove this client from the database.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-base-content/50">
                Select a client to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
