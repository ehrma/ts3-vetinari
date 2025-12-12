'use client'

import { useState, useEffect } from 'react'
import { TS3ChannelDetails } from '@/types'

interface ChannelDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  connectionId: string
  cid: number
}

const CODEC_NAMES: Record<number, string> = {
  0: 'Speex Narrowband',
  1: 'Speex Wideband',
  2: 'Speex Ultra-Wideband',
  3: 'CELT Mono',
  4: 'Opus Voice',
  5: 'Opus Music',
}

function formatDuration(seconds: number): string {
  if (seconds < 0) return 'Never'
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m`
  return `${seconds}s`
}

export default function ChannelDetailsModal({
  isOpen,
  onClose,
  connectionId,
  cid,
}: ChannelDetailsModalProps) {
  const [channel, setChannel] = useState<TS3ChannelDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && cid) {
      loadChannelInfo()
    }
  }, [isOpen, cid, connectionId])

  const loadChannelInfo = async () => {
    if (!window.electronAPI) return
    setLoading(true)
    setError(null)

    try {
      const result = await window.electronAPI.getChannelInfo(connectionId, cid)
      if (result.success && result.channel) {
        setChannel(result.channel)
      } else {
        setError(result.error || 'Failed to load channel info')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">Channel Details</h3>

        {loading && (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        )}

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        {channel && !loading && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-4 pb-4 border-b border-base-300">
              <div className="avatar placeholder">
                <div className="bg-primary text-primary-content rounded-full w-16">
                  <span className="text-2xl">📢</span>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-bold">{channel.channel_name}</h4>
                {channel.channel_topic && (
                  <p className="text-sm text-base-content/60">{channel.channel_topic}</p>
                )}
              </div>
              <div className="flex flex-col gap-1 items-end">
                {channel.channel_flag_default === 1 && (
                  <span className="badge badge-primary badge-sm">Default</span>
                )}
                {channel.channel_flag_permanent === 1 && (
                  <span className="badge badge-success badge-sm">Permanent</span>
                )}
                {channel.channel_flag_semi_permanent === 1 && (
                  <span className="badge badge-warning badge-sm">Semi-Permanent</span>
                )}
                {channel.channel_flag_password === 1 && (
                  <span className="badge badge-error badge-sm">Password</span>
                )}
              </div>
            </div>

            {/* Description */}
            {channel.channel_description && (
              <div className="bg-base-200 rounded-lg p-4">
                <h5 className="font-semibold mb-2">Description</h5>
                <p className="text-sm whitespace-pre-wrap">{channel.channel_description}</p>
              </div>
            )}

            {/* Channel Info */}
            <div className="bg-base-200 rounded-lg p-4">
              <h5 className="font-semibold mb-2">Channel Information</h5>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-base-content/60">Channel ID:</span>
                  <span className="ml-2 font-mono">{channel.cid}</span>
                </div>
                <div>
                  <span className="text-base-content/60">Parent ID:</span>
                  <span className="ml-2 font-mono">{channel.pid || 'None (Root)'}</span>
                </div>
                <div>
                  <span className="text-base-content/60">Clients:</span>
                  <span className="ml-2">{channel.total_clients} / {channel.channel_maxclients === -1 ? 'Unlimited' : channel.channel_maxclients}</span>
                </div>
                <div>
                  <span className="text-base-content/60">Family Clients:</span>
                  <span className="ml-2">{channel.total_clients_family}</span>
                </div>
              </div>
            </div>

            {/* Audio Settings */}
            <div className="bg-base-200 rounded-lg p-4">
              <h5 className="font-semibold mb-2">Audio Settings</h5>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-base-content/60">Codec:</span>
                  <span className="ml-2">{CODEC_NAMES[channel.channel_codec] || `Unknown (${channel.channel_codec})`}</span>
                </div>
                <div>
                  <span className="text-base-content/60">Quality:</span>
                  <span className="ml-2">{channel.channel_codec_quality}/10</span>
                </div>
                <div>
                  <span className="text-base-content/60">Encrypted:</span>
                  <span className="ml-2">{channel.channel_codec_is_unencrypted === 0 ? 'Yes' : 'No'}</span>
                </div>
                <div>
                  <span className="text-base-content/60">Talk Power:</span>
                  <span className="ml-2">{channel.channel_needed_talk_power}</span>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="bg-base-200 rounded-lg p-4">
              <h5 className="font-semibold mb-2">Status</h5>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-base-content/60">Empty for:</span>
                  <span className="ml-2">{formatDuration(channel.seconds_empty)}</span>
                </div>
                <div>
                  <span className="text-base-content/60">Delete Delay:</span>
                  <span className="ml-2">{channel.channel_delete_delay > 0 ? `${channel.channel_delete_delay}s` : 'None'}</span>
                </div>
              </div>
            </div>
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
