'use client'

import { TS3Channel, TS3Client } from '@/types'

interface ChannelTreeProps {
  channels: TS3Channel[]
  clients: TS3Client[]
  onClientClick?: (client: TS3Client) => void
  onChannelClick?: (channel: TS3Channel) => void
}

interface ChannelNode extends TS3Channel {
  children: ChannelNode[]
  channelClients: TS3Client[]
}

function buildChannelTree(channels: TS3Channel[], clients: TS3Client[]): ChannelNode[] {
  const channelMap = new Map<number, ChannelNode>()
  
  // Create nodes for all channels
  channels.forEach(channel => {
    channelMap.set(channel.cid, {
      ...channel,
      children: [],
      channelClients: clients.filter(c => c.cid === channel.cid && c.client_type === 0),
    })
  })
  
  // Build tree structure
  const rootChannels: ChannelNode[] = []
  
  channelMap.forEach(channel => {
    if (channel.pid === 0) {
      rootChannels.push(channel)
    } else {
      const parent = channelMap.get(channel.pid)
      if (parent) {
        parent.children.push(channel)
      }
    }
  })
  
  // Sort channels by order
  const sortChannels = (channels: ChannelNode[]): ChannelNode[] => {
    return channels.sort((a, b) => a.channel_order - b.channel_order).map(ch => ({
      ...ch,
      children: sortChannels(ch.children),
    }))
  }
  
  return sortChannels(rootChannels)
}

function ChannelItem({ channel, depth = 0, onClientClick, onChannelClick }: { channel: ChannelNode; depth?: number; onClientClick?: (client: TS3Client) => void; onChannelClick?: (channel: TS3Channel) => void }) {
  const isRootChannel = depth === 0
  const hasChildren = channel.children.length > 0 || channel.channelClients.length > 0
  
  return (
    <div className={depth > 0 ? 'ml-3 border-l border-base-300' : ''}>
      <div 
        className={`flex items-center gap-2 py-1.5 px-3 hover:bg-base-200 rounded-lg cursor-pointer transition-colors ${
          isRootChannel ? 'bg-base-200/50 font-semibold' : ''
        }`}
        style={{ marginLeft: depth > 0 ? '8px' : '0' }}
        onClick={() => onChannelClick?.(channel)}
      >
        {/* Tree connector for sub-channels */}
        {depth > 0 && (
          <span className="text-base-content/30 -ml-4 mr-1">└</span>
        )}
        
        {/* Channel icon - different for root vs sub */}
        {isRootChannel ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-primary">
            <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-base-content/50">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
        )}
        
        <span className={`flex-1 truncate ${isRootChannel ? 'text-base-content' : 'text-base-content/80'}`}>
          {channel.channel_name}
        </span>
        
        {channel.channelClients.length > 0 && (
          <span className={`badge badge-sm ${isRootChannel ? 'badge-primary' : 'badge-ghost'}`}>
            {channel.channelClients.length}
          </span>
        )}
        
        {hasChildren && channel.children.length > 0 && (
          <span className="text-xs text-base-content/40">
            +{channel.children.length}
          </span>
        )}
      </div>
      
      {/* Clients in this channel */}
      <div className={depth > 0 ? 'ml-2' : 'ml-4'}>
        {channel.channelClients.map(client => (
          <ClientItem key={client.clid} client={client} depth={depth + 1} onClientClick={onClientClick} />
        ))}
      </div>
      
      {/* Child channels */}
      {channel.children.map(child => (
        <ChannelItem key={child.cid} channel={child} depth={depth + 1} onClientClick={onClientClick} onChannelClick={onChannelClick} />
      ))}
    </div>
  )
}

function ClientItem({ client, depth, onClientClick }: { client: TS3Client; depth: number; onClientClick?: (client: TS3Client) => void }) {
  const isMuted = client.client_input_muted === 1 || client.client_output_muted === 1
  const isAway = client.client_away === 1
  
  const statusColor = isAway ? 'text-warning' : isMuted ? 'text-error' : 'text-success'
  const bgColor = isAway ? 'bg-warning/20' : isMuted ? 'bg-error/20' : 'bg-success/20'
  
  return (
    <div 
      className="flex items-center gap-2 py-1 px-2 ml-2 hover:bg-base-200/70 rounded cursor-pointer transition-colors"
      onClick={() => onClientClick?.(client)}
    >
      <div className="relative flex-shrink-0">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${bgColor}`}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-3.5 h-3.5 ${statusColor}`}>
            <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      <span className={`flex-1 truncate text-sm ${isAway ? 'text-base-content/50 italic' : 'text-base-content/90'}`}>
        {client.client_nickname}
      </span>
      {isAway && client.client_away_message && (
        <span className="text-xs text-base-content/40 truncate max-w-24">[{client.client_away_message}]</span>
      )}
      {client.client_is_channel_commander === 1 && (
        <span className="badge badge-xs badge-warning">CC</span>
      )}
    </div>
  )
}

export default function ChannelTree({ channels, clients, onClientClick, onChannelClick }: ChannelTreeProps) {
  const tree = buildChannelTree(channels, clients)
  
  if (channels.length === 0) {
    return (
      <div className="text-center text-base-content/60 py-8">
        No channels found
      </div>
    )
  }
  
  return (
    <div className="font-mono text-sm">
      {tree.map(channel => (
        <ChannelItem key={channel.cid} channel={channel} onClientClick={onClientClick} onChannelClick={onChannelClick} />
      ))}
    </div>
  )
}
