import { usePeer } from '../../context/PeerContext';
import { useChat } from '../../hooks/useChat';
import { MessageSquare } from 'lucide-react';

export default function DataStream() {
  const { role, members } = usePeer();
  const { messages, streamEndRef } = useChat();
  const inRoom = role !== null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">

      {/* Chat header */}
      <div className="shrink-0 flex items-center justify-between px-6 h-[57px] border-b border-[#e4e4e7] bg-white">
        {inRoom ? (
          <>
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-[#10b981]" />
              <span className="text-[17px] font-semibold text-[#18181b]">
                {role === 'host' ? 'Your room' : 'Group chat'}
              </span>
            </div>
            <span className="text-[14px] text-[#71717a]">
              {members.length + 1} {members.length + 1 === 1 ? 'member' : 'members'}
            </span>
          </>
        ) : (
          <span className="text-[15px] text-[#a1a1aa]">
            Create or join a room to start chatting
          </span>
        )}
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-1 bg-[#fafafa]">
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
    <div className="flex-1 flex flex-col items-center justify-center py-32 gap-3">
      <div className="w-12 h-12 rounded-2xl bg-[#eff6ff] flex items-center justify-center">
        <MessageSquare size={22} className="text-[#2563eb]" />
      </div>
      <div className="text-center">
        <p className="text-[16px] font-semibold text-[#18181b]">
          {inRoom ? 'No messages yet' : 'No room joined'}
        </p>
        <p className="text-[14px] text-[#71717a] mt-1">
          {inRoom
            ? 'Be the first to say hello 👋'
            : 'Create or join a room from the sidebar'
          }
        </p>
      </div>
    </div>
  );
}

function MessageItem({ msg, showName }) {
  if (msg.type === 'system') {
    return (
      <div className="flex justify-center my-4 slide-up">
        <span className="text-[13px] font-medium text-[#52525b] bg-[#f4f4f5] border border-[#e4e4e7] rounded-full px-3.5 py-1">
          {msg.text}
        </span>
      </div>
    );
  }

  const isLocal = msg.isLocal;
  const time = new Date(msg.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  // Colorful avatar for remote senders
  const colors = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];
  const avatarColor = colors[(msg.senderName?.charCodeAt(0) ?? 0) % colors.length];

  return (
    <div
      className={`flex items-end gap-2.5 ${isLocal ? 'flex-row-reverse' : 'flex-row'} ${showName ? 'mt-4' : 'mt-1'} slide-up`}
    >
      {/* Avatar (remote only, first in group) */}
      {!isLocal && (
        <div
          style={{ background: showName ? avatarColor : 'transparent' }}
          className={`w-8 h-8 rounded-full shrink-0 mb-0.5 flex items-center justify-center text-white text-[13px] font-bold select-none`}
        >
          {showName ? msg.senderName?.slice(0, 1).toUpperCase() : ''}
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-[62%] ${isLocal ? 'items-end' : 'items-start'}`}>
        {showName && (
          <span className="text-[14px] font-semibold text-[#52525b] px-1">
            {msg.senderName}
          </span>
        )}

        <div
          className={`px-4 py-3 rounded-2xl text-[16px] leading-relaxed ${
            isLocal
              ? 'bg-[#2563eb] text-white rounded-br-sm'
              : 'bg-white border border-[#e4e4e7] text-[#18181b] rounded-bl-sm shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
          }`}
        >
          {msg.text}
        </div>

        <span className="text-[12px] text-[#a1a1aa] px-1">{time}</span>
      </div>
    </div>
  );
}
