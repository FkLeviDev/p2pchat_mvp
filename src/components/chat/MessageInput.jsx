import { Send } from 'lucide-react';
import { usePeer } from '../../context/PeerContext';
import { useChat } from '../../hooks/useChat';

export default function MessageInput() {
  const { role } = usePeer();
  const { draft, inputRef, updateDraft, handleKeyDown, commitPacket } = useChat();

  const canType = role !== null;
  const canSend = canType && draft.trim().length > 0;

  return (
    <div className="shrink-0 bg-white border-t border-[#e4e4e7] px-5 py-3.5">
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={updateDraft}
          onKeyDown={handleKeyDown}
          disabled={!canType}
          placeholder={canType ? 'Type a message…' : 'Join a room to start chatting'}
          maxLength={2000}
          spellCheck={false}
          autoComplete="off"
          className="flex-1 bg-[#f4f4f5] border border-[#e4e4e7] rounded-xl px-4 py-3 text-[16px] text-[#18181b] placeholder:text-[#a1a1aa] outline-none transition-all focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          onClick={commitPacket}
          disabled={!canSend}
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all bg-[#2563eb] text-white hover:bg-[#1d4ed8] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#2563eb]"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
