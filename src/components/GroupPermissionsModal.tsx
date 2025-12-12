'use client'

import { useState, useEffect } from 'react'
import { GroupPermission, Permission, ServerGroup } from '@/types'

interface GroupPermissionsModalProps {
  connectionId: string
  group: ServerGroup | null
  isOpen: boolean
  onClose: () => void
}

export default function GroupPermissionsModal({ 
  connectionId, 
  group, 
  isOpen, 
  onClose 
}: GroupPermissionsModalProps) {
  const [permissions, setPermissions] = useState<GroupPermission[]>([])
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Add permission form
  const [searchTerm, setSearchTerm] = useState('')
  const [newPermId, setNewPermId] = useState('')
  const [newPermValue, setNewPermValue] = useState('75')
  const [newPermNegated, setNewPermNegated] = useState(false)
  const [newPermSkip, setNewPermSkip] = useState(false)
  
  // Filter for current permissions
  const [filterTerm, setFilterTerm] = useState('')

  useEffect(() => {
    if (isOpen && group) {
      loadPermissions()
    }
  }, [isOpen, group])

  const loadPermissions = async () => {
    if (!window.electronAPI || !group) return
    setLoading(true)
    setError(null)
    
    try {
      const [permsResult, allPermsResult] = await Promise.all([
        window.electronAPI.getServerGroupPermissions(connectionId, group.sgid),
        allPermissions.length === 0 
          ? window.electronAPI.getPermissionList(connectionId) 
          : Promise.resolve({ success: true, permissions: allPermissions })
      ])
      
      if (permsResult.success) {
        setPermissions(permsResult.permissions || [])
      } else {
        setError(permsResult.error || 'Failed to load permissions')
      }
      
      if (allPermsResult.success && allPermsResult.permissions) {
        setAllPermissions(allPermsResult.permissions)
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleAddPermission = async () => {
    if (!window.electronAPI || !group || !newPermId) return
    setLoading(true)
    setError(null)
    
    try {
      const result = await window.electronAPI.addServerGroupPermission(
        connectionId,
        group.sgid,
        newPermId,
        parseInt(newPermValue) || 75,
        newPermNegated,
        newPermSkip
      )
      
      if (result.success) {
        setNewPermId('')
        setNewPermValue('75')
        setNewPermNegated(false)
        setNewPermSkip(false)
        setSearchTerm('')
        setSuccess('Permission added')
        loadPermissions()
      } else {
        setError(result.error || 'Failed to add permission')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleRemovePermission = async (permsid: string) => {
    if (!window.electronAPI || !group) return
    if (!confirm(`Remove permission "${permsid}"?`)) return
    
    try {
      const result = await window.electronAPI.removeServerGroupPermission(connectionId, group.sgid, permsid)
      if (result.success) {
        setSuccess('Permission removed')
        loadPermissions()
      } else {
        setError(result.error || 'Failed to remove permission')
      }
    } catch (err) {
      setError(String(err))
    }
  }

  const handleUpdatePermission = async (permsid: string, newValue: number, negated: boolean, skip: boolean) => {
    if (!window.electronAPI || !group) return
    
    try {
      const result = await window.electronAPI.addServerGroupPermission(
        connectionId,
        group.sgid,
        permsid,
        newValue,
        negated,
        skip
      )
      if (result.success) {
        setSuccess('Permission updated')
        loadPermissions()
      } else {
        setError(result.error || 'Failed to update permission')
      }
    } catch (err) {
      setError(String(err))
    }
  }

  // Filter available permissions for search
  const filteredAvailablePermissions = allPermissions.filter(p => 
    searchTerm && (
      p.permsid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.permdesc && p.permdesc.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  ).slice(0, 50)

  // Filter current permissions
  const filteredPermissions = permissions.filter(p =>
    !filterTerm || p.permsid.toLowerCase().includes(filterTerm.toLowerCase())
  )

  // Get permission description
  const getPermDescription = (permsid: string) => {
    const perm = allPermissions.find(p => p.permsid === permsid)
    return perm?.permdesc || ''
  }

  if (!isOpen || !group) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-base-100 rounded-lg shadow-xl w-[1000px] max-w-[95vw] h-[800px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <div>
            <h3 className="font-bold text-lg">Group Permissions</h3>
            <p className="text-sm text-base-content/60">
              {group.name} (ID: {group.sgid})
            </p>
          </div>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>✕</button>
        </div>

        {/* Messages */}
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
        <div className="flex-1 flex overflow-hidden p-4 gap-4">
          {/* Left: Add Permission */}
          <div className="w-1/3 flex flex-col">
            <div className="bg-base-200 rounded-lg p-4 flex-1 flex flex-col">
              <h4 className="font-semibold mb-3">Add Permission</h4>
              
              {/* Search */}
              <div className="mb-3">
                <label className="label label-text text-xs">Search Permissions</label>
                <input
                  type="text"
                  placeholder="Type to search..."
                  className="input input-sm input-bordered w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Search Results */}
              {searchTerm && (
                <div className="flex-1 overflow-y-auto mb-3 bg-base-100 rounded max-h-64">
                  {filteredAvailablePermissions.length === 0 ? (
                    <p className="text-center text-base-content/50 py-4 text-sm">No permissions found</p>
                  ) : (
                    <div className="divide-y divide-base-300">
                      {filteredAvailablePermissions.map(p => (
                        <div 
                          key={p.permid}
                          className="p-2 hover:bg-base-200 cursor-pointer"
                          onClick={() => {
                            setNewPermId(p.permsid)
                            setSearchTerm('')
                          }}
                        >
                          <div className="font-mono text-sm">{p.permsid}</div>
                          {p.permdesc && (
                            <div className="text-xs text-base-content/50 truncate">{p.permdesc}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Selected Permission */}
              <div className="space-y-3 mt-auto">
                <div>
                  <label className="label label-text text-xs">Permission ID</label>
                  <input
                    type="text"
                    placeholder="e.g. b_client_kick_from_server"
                    className="input input-sm input-bordered w-full font-mono"
                    value={newPermId}
                    onChange={(e) => setNewPermId(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label label-text text-xs">Value</label>
                  <input
                    type="number"
                    className="input input-sm input-bordered w-full"
                    value={newPermValue}
                    onChange={(e) => setNewPermValue(e.target.value)}
                  />
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={newPermNegated}
                      onChange={(e) => setNewPermNegated(e.target.checked)}
                    />
                    <span className="text-sm">Negated</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={newPermSkip}
                      onChange={(e) => setNewPermSkip(e.target.checked)}
                    />
                    <span className="text-sm">Skip</span>
                  </label>
                </div>

                <button 
                  className="btn btn-primary w-full"
                  onClick={handleAddPermission}
                  disabled={!newPermId || loading}
                >
                  {loading ? <span className="loading loading-spinner loading-sm"></span> : 'Add Permission'}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Current Permissions */}
          <div className="w-2/3 flex flex-col">
            <div className="bg-base-200 rounded-lg p-4 flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">Current Permissions ({permissions.length})</h4>
                <button 
                  className="btn btn-xs btn-ghost"
                  onClick={loadPermissions}
                  disabled={loading}
                >
                  {loading ? <span className="loading loading-spinner loading-xs"></span> : 'Refresh'}
                </button>
              </div>

              {/* Filter */}
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Filter permissions..."
                  className="input input-sm input-bordered w-full"
                  value={filterTerm}
                  onChange={(e) => setFilterTerm(e.target.value)}
                />
              </div>

              {/* Permissions Table */}
              <div className="flex-1 overflow-y-auto bg-base-100 rounded">
                {loading && permissions.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <span className="loading loading-spinner loading-lg"></span>
                  </div>
                ) : filteredPermissions.length === 0 ? (
                  <p className="text-center text-base-content/50 py-8">
                    {filterTerm ? 'No matching permissions' : 'No permissions assigned'}
                  </p>
                ) : (
                  <table className="table table-sm table-pin-rows">
                    <thead>
                      <tr>
                        <th>Permission</th>
                        <th className="w-24">Value</th>
                        <th className="w-16 text-center">Neg</th>
                        <th className="w-16 text-center">Skip</th>
                        <th className="w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPermissions.map((perm, index) => (
                        <tr key={perm.permsid || `perm-${index}`} className="hover">
                          <td>
                            <div className="font-mono text-sm">{perm.permsid}</div>
                            <div className="text-xs text-base-content/50 truncate max-w-[300px]">
                              {getPermDescription(perm.permsid)}
                            </div>
                          </td>
                          <td>
                            <input
                              type="number"
                              className="input input-xs input-bordered w-20"
                              defaultValue={perm.permvalue}
                              onBlur={(e) => {
                                const newVal = parseInt(e.target.value)
                                if (!isNaN(newVal) && newVal !== perm.permvalue) {
                                  handleUpdatePermission(perm.permsid, newVal, perm.permnegated, perm.permskip)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  (e.target as HTMLInputElement).blur()
                                }
                              }}
                            />
                          </td>
                          <td className="text-center">
                            <input
                              type="checkbox"
                              className="checkbox checkbox-sm"
                              checked={perm.permnegated}
                              onChange={(e) => handleUpdatePermission(perm.permsid, perm.permvalue, e.target.checked, perm.permskip)}
                            />
                          </td>
                          <td className="text-center">
                            <input
                              type="checkbox"
                              className="checkbox checkbox-sm"
                              checked={perm.permskip}
                              onChange={(e) => handleUpdatePermission(perm.permsid, perm.permvalue, perm.permnegated, e.target.checked)}
                            />
                          </td>
                          <td>
                            <button 
                              className="btn btn-xs btn-error btn-ghost"
                              onClick={() => handleRemovePermission(perm.permsid)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
