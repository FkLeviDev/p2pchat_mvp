import { Send } from 'lucide-react';
import { usePeer } from '../../context/PeerContext';
import { useChat } from '../../hooks/useChat';

export default function MessageInput() {
  const { role } = usePeer();
  const { draft, inputRef, updateDraft, handleKeyDown, commitPacket } = useChat();

  const canType = role !== null;
  const canSend = canType && draft.trim().length > 0;

  return (
    <div className="shrink-0 bg-white border-t border-[#e4e4e7] px-4 py-4 sm:px-6">
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={updateDraft}
          onKeyDown={handleKeyDown}
          disabled={!canType}
          placeholder={canType ? 'Write a secure message…' : 'Establish a P2P node session to start typing'}
          maxLength={2000}
          spellCheck={false}
          autoComplete="off"
          className="flex-1 input-premium !py-3 !px-4 text-[14.5px] disabled:bg-[#f4f4f5] disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          onClick={commitPacket}
          disabled={!canSend}
          className="btn-premium-primary !p-3 shrink-0 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          title="Send packet"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
