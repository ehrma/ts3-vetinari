'use client'

import { useState, useEffect } from 'react'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

type Theme = 'dark' | 'light' | 'system'

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [autoRefreshInterval, setAutoRefreshInterval] = useState('0')
  const [showOfflineClients, setShowOfflineClients] = useState(false)
  const [confirmActions, setConfirmActions] = useState(true)
  const [appVersion, setAppVersion] = useState('...')
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error'>('idle')
  const [latestVersion, setLatestVersion] = useState('')
  const [updateError, setUpdateError] = useState('')
  const [downloadProgress, setDownloadProgress] = useState(0)

  useEffect(() => {
    // Load app version
    if (typeof window !== 'undefined' && window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then((version: string) => {
        setAppVersion(version)
      })
    }

    // Listen for update events
    let unsubProgress: (() => void) | undefined
    let unsubDownloaded: (() => void) | undefined
    let unsubError: (() => void) | undefined

    if (typeof window !== 'undefined' && window.electronAPI) {
      unsubProgress = window.electronAPI.onUpdateDownloadProgress?.((data) => {
        setDownloadProgress(Math.round(data.percent))
      })
      unsubDownloaded = window.electronAPI.onUpdateDownloaded?.(() => {
        setUpdateStatus('ready')
      })
      unsubError = window.electronAPI.onUpdateError?.((data) => {
        setUpdateStatus('error')
        setUpdateError(data.error)
      })
    }

    // Load settings from localStorage
    const savedTheme = localStorage.getItem('ts-inspect-theme') as Theme
    if (savedTheme) {
      setTheme(savedTheme)
    }
    
    const savedAutoRefresh = localStorage.getItem('ts-inspect-auto-refresh')
    if (savedAutoRefresh) {
      setAutoRefreshInterval(savedAutoRefresh)
    }
    
    const savedShowOffline = localStorage.getItem('ts-inspect-show-offline')
    if (savedShowOffline) {
      setShowOfflineClients(savedShowOffline === 'true')
    }
    
    const savedConfirmActions = localStorage.getItem('ts-inspect-confirm-actions')
    if (savedConfirmActions !== null) {
      setConfirmActions(savedConfirmActions !== 'false')
    }

    // Cleanup event listeners
    return () => {
      unsubProgress?.()
      unsubDownloaded?.()
      unsubError?.()
    }
  }, [isOpen])

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('ts-inspect-theme', newTheme)
    
    // Apply theme
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
    } else {
      document.documentElement.setAttribute('data-theme', newTheme)
    }
  }

  const handleAutoRefreshChange = (value: string) => {
    setAutoRefreshInterval(value)
    localStorage.setItem('ts-inspect-auto-refresh', value)
  }

  const handleShowOfflineChange = (value: boolean) => {
    setShowOfflineClients(value)
    localStorage.setItem('ts-inspect-show-offline', String(value))
  }

  const handleConfirmActionsChange = (value: boolean) => {
    setConfirmActions(value)
    localStorage.setItem('ts-inspect-confirm-actions', String(value))
  }

  const handleCheckForUpdates = async () => {
    if (!window.electronAPI?.checkForUpdates) return
    
    setUpdateStatus('checking')
    setUpdateError('')
    
    try {
      const result = await window.electronAPI.checkForUpdates()
      if (result.error) {
        setUpdateStatus('error')
        setUpdateError(result.error)
      } else if (result.updateAvailable) {
        setUpdateStatus('available')
        setLatestVersion(result.latestVersion || '')
      } else {
        setUpdateStatus('idle')
        setLatestVersion('')
      }
    } catch (err) {
      setUpdateStatus('error')
      setUpdateError(String(err))
    }
  }

  const handleDownloadUpdate = async () => {
    if (!window.electronAPI?.downloadUpdate) return
    
    setUpdateStatus('downloading')
    try {
      const result = await window.electronAPI.downloadUpdate()
      if (result.success) {
        setUpdateStatus('ready')
      } else {
        setUpdateStatus('error')
        setUpdateError(result.error || 'Download failed')
      }
    } catch (err) {
      setUpdateStatus('error')
      setUpdateError(String(err))
    }
  }

  const handleInstallUpdate = () => {
    if (window.electronAPI?.installUpdate) {
      window.electronAPI.installUpdate()
    }
  }

  const handleOpenGitHub = () => {
    if (window.electronAPI?.openExternalUrl) {
      window.electronAPI.openExternalUrl('https://github.com/ehrma/ts3-vetinari')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-base-100 rounded-lg shadow-xl w-[500px] max-w-[95vw] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h3 className="font-bold text-lg">⚙️ Settings</h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Appearance Section */}
          <div>
            <h4 className="font-semibold text-sm text-base-content/70 uppercase tracking-wide mb-3">
              Appearance
            </h4>
            <div className="bg-base-200 rounded-lg p-4 space-y-4">
              <div>
                <label className="label">
                  <span className="label-text font-medium">Theme</span>
                </label>
                <div className="flex gap-2">
                  <button
                    className={`btn btn-sm flex-1 ${theme === 'light' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => handleThemeChange('light')}
                  >
                    ☀️ Light
                  </button>
                  <button
                    className={`btn btn-sm flex-1 ${theme === 'dark' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => handleThemeChange('dark')}
                  >
                    🌙 Dark
                  </button>
                  <button
                    className={`btn btn-sm flex-1 ${theme === 'system' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => handleThemeChange('system')}
                  >
                    💻 System
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Behavior Section */}
          <div>
            <h4 className="font-semibold text-sm text-base-content/70 uppercase tracking-wide mb-3">
              Behavior
            </h4>
            <div className="bg-base-200 rounded-lg p-4 space-y-4">
              <div>
                <label className="label">
                  <span className="label-text font-medium">Auto-refresh interval</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={autoRefreshInterval}
                  onChange={(e) => handleAutoRefreshChange(e.target.value)}
                >
                  <option value="0">Disabled</option>
                  <option value="5">Every 5 seconds</option>
                  <option value="10">Every 10 seconds</option>
                  <option value="30">Every 30 seconds</option>
                  <option value="60">Every minute</option>
                </select>
                <label className="label">
                  <span className="label-text-alt text-base-content/50">
                    Automatically refresh server data
                  </span>
                </label>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={confirmActions}
                    onChange={(e) => handleConfirmActionsChange(e.target.checked)}
                  />
                  <div>
                    <span className="label-text font-medium">Confirm destructive actions</span>
                    <p className="text-xs text-base-content/50">
                      Show confirmation dialogs for kick, ban, delete, etc.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Display Section */}
          <div>
            <h4 className="font-semibold text-sm text-base-content/70 uppercase tracking-wide mb-3">
              Display
            </h4>
            <div className="bg-base-200 rounded-lg p-4 space-y-4">
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={showOfflineClients}
                    onChange={(e) => handleShowOfflineChange(e.target.checked)}
                  />
                  <div>
                    <span className="label-text font-medium">Show offline clients in tree</span>
                    <p className="text-xs text-base-content/50">
                      Display recently disconnected clients (grayed out)
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* About Section */}
          <div>
            <h4 className="font-semibold text-sm text-base-content/70 uppercase tracking-wide mb-3">
              About
            </h4>
            <div className="bg-base-200 rounded-lg p-4">
              <div className="text-center">
                <img src="./logo.png" alt="TS3 Vetinari" className="w-16 h-16 mx-auto mb-2" />
                <h5 className="font-bold text-lg">TS3 Vetinari</h5>
                <p className="text-sm text-base-content/60">Version {appVersion}</p>
                <p className="text-xs text-base-content/50 mt-2">
                  A TeamSpeak3 Serveradmin Utility
                </p>
                
                <div className="mt-4 space-y-2">
                  <button
                    className="btn btn-sm btn-outline w-full"
                    onClick={handleOpenGitHub}
                  >
                    🔗 View on GitHub
                  </button>
                  
                  {updateStatus === 'idle' && (
                    <button
                      className="btn btn-sm btn-outline w-full"
                      onClick={handleCheckForUpdates}
                    >
                      🔄 Check for Updates
                    </button>
                  )}
                  
                  {updateStatus === 'checking' && (
                    <button className="btn btn-sm btn-outline w-full" disabled>
                      <span className="loading loading-spinner loading-xs"></span>
                      Checking...
                    </button>
                  )}
                  
                  {updateStatus === 'available' && (
                    <div className="space-y-2">
                      <p className="text-sm text-success">✓ Update available: v{latestVersion}</p>
                      <button
                        className="btn btn-sm btn-primary w-full"
                        onClick={handleDownloadUpdate}
                      >
                        ⬇️ Download Update
                      </button>
                    </div>
                  )}
                  
                  {updateStatus === 'downloading' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <progress className="progress progress-primary flex-1" value={downloadProgress} max="100"></progress>
                        <span className="text-sm">{downloadProgress}%</span>
                      </div>
                      <p className="text-xs text-base-content/60 text-center">Downloading update...</p>
                    </div>
                  )}
                  
                  {updateStatus === 'ready' && (
                    <button
                      className="btn btn-sm btn-success w-full"
                      onClick={handleInstallUpdate}
                    >
                      🚀 Restart & Install
                    </button>
                  )}
                  
                  {updateStatus === 'error' && (
                    <div className="space-y-2">
                      <p className="text-sm text-error">Error: {updateError}</p>
                      <button
                        className="btn btn-sm btn-outline w-full"
                        onClick={handleCheckForUpdates}
                      >
                        🔄 Try Again
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-base-300">
          <button className="btn btn-primary w-full" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
