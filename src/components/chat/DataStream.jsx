import { usePeer } from '../../context/PeerContext';
import { useChat } from '../../hooks/useChat';
import { MessageSquare, ShieldAlert, Cpu } from 'lucide-react';

export default function DataStream() {
  const { role, members } = usePeer();
  const { messages, streamEndRef } = useChat();
  const inRoom = role !== null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">

      {/* ── Sub-header / Room Info Bar ──────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-5 h-14 border-b border-[#e4e4e7] bg-[#fafafc]">
        {inRoom ? (
          <>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
              <span className="text-[14px] font-bold text-[#09090b] tracking-tight">
                {role === 'host' ? 'Direct Host Session' : 'Direct Relay Client'}
              </span>
            </div>
            <span className="text-[12px] font-bold text-[#71717a] bg-white border border-[#e4e4e7] rounded-lg px-2.5 py-1">
              {members.length + 1} Node{members.length + 1 === 1 ? '' : 's'} Active
            </span>
          </>
        ) : (
          <div className="flex items-center gap-2 text-[#71717a]">
            <ShieldAlert size={14} />
            <span className="text-[12px] font-medium">Session Status: Offline</span>
          </div>
        )}
      </div>

      {/* ── Message History Stream ─────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 flex flex-col gap-2 bg-[#fcfcfe]">
        {messages.length === 0
          ? <EmptyState inRoom={inRoom} />
          : messages.map((msg, i) => {
              const prev = messages[i - 1];
              const showName =
                msg.type === 'chat' && !msg.isLocal && (
                  !prev || prev.type !== 'chat' ||
                  prev.senderId !== msg.senderId || prev.isLocal
                );
              return <MessageItem key={msg.id} msg={msg} showName={showName} />;
            })
        }
        <div ref={streamEndRef} />
      </div>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────── */

function EmptyState({ inRoom }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-12 h-12 rounded-2xl bg-[#eff6ff] border border-[#dbeafe] flex items-center justify-center shadow-sm">
        <MessageSquare size={20} className="text-[#2563eb]" />
      </div>
      <div className="text-center px-4">
        <p className="text-[15px] font-bold text-[#09090b]">
          {inRoom ? 'Secure Data Stream Initialized' : 'Offline Sandbox'}
        </p>
        <p className="text-[13px] text-[#71717a] mt-1 max-w-xs leading-normal mx-auto">
          {inRoom
            ? 'Start typing below. All messages are streamed directly to connected peers.'
            : 'Deploy a new room or connect to a friend to open a P2P data connection.'
          }
        </p>
      </div>
    </div>
  );
}

function MessageItem({ msg, showName }) {
  if (msg.type === 'system') {
    return (
      <div className="flex justify-center my-3 slide-up">
        <span className="text-[11px] font-mono font-bold text-[#71717a] bg-[#f4f4f5] border border-[#e4e4e7] rounded-lg px-3 py-1 select-none">
          ⚡ SYSTEM: {msg.text.toUpperCase()}
        </span>
      </div>
    );
  }

  const isLocal = msg.isLocal;
  const time = new Date(msg.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  const colors = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];
  const avatarColor = colors[(msg.senderName?.charCodeAt(0) ?? 0) % colors.length];

  return (
    <div
      className={`flex items-end gap-2.5 ${isLocal ? 'flex-row-reverse' : 'flex-row'} ${showName ? 'mt-3' : 'mt-0.5'} slide-up`}
    >
      {/* Avatar (only for remote nodes) */}
      {!isLocal && (
        <div
          style={{ background: showName ? avatarColor : 'transparent', border: showName ? '1px solid rgba(0,0,0,0.05)' : 'none' }}
          className={`w-7 h-7 rounded-lg shrink-0 mb-0.5 flex items-center justify-center text-white text-[11px] font-bold select-none`}
        >
          {showName ? msg.senderName?.slice(0, 1).toUpperCase() : ''}
        </div>
      )}

      {/* Message Content Area */}
      <div className={`flex flex-col gap-0.5 max-w-[85%] md:max-w-[65%] ${isLocal ? 'items-end' : 'items-start'}`}>
        
        {/* Name tag */}
        {showName && (
          <span className="text-[12px] font-bold text-[#71717a] mb-1 px-1">
            {msg.senderName}
          </span>
        )}

        {/* Bubble */}
        <div
          className={`px-4 py-2.5 rounded-2xl text-[14.5px] leading-relaxed break-words shadow-sm border ${
            isLocal
              ? 'bg-[#2563eb] text-white border-[#2563eb] rounded-br-none'
              : 'bg-white border-[#e4e4e7] text-[#09090b] rounded-bl-none'
          }`}
        >
          {msg.text}
        </div>

        {/* Time stamp */}
        <span className="text-[10px] font-mono text-[#a1a1aa] px-1.5 mt-0.5">{time}</span>
      </div>
    </div>
  );
}
