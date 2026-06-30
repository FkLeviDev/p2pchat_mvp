import { useState, useRef, useEffect, useCallback } from 'react';
import { usePeer } from '../context/PeerContext';

export function useChat() {
  const { messages, sendMessage, role } = usePeer();

  const [draft, setDraft]     = useState('');
  const [sending, setSending] = useState(false);
  const streamEndRef          = useRef(null);
  const inputRef              = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    streamEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  // Focus input when joining a room
  useEffect(() => {
    if (role) inputRef.current?.focus();
  }, [role]);

  const commitPacket = useCallback(() => {
    const text = draft.trim();
    if (!text || !role) return;

    setSending(true);
    sendMessage(text);
    setDraft('');
    setTimeout(() => setSending(false), 200);
  }, [draft, role, sendMessage]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commitPacket();
    }
  }, [commitPacket]);

  const updateDraft = useCallback((e) => setDraft(e.target.value), []);

  return { messages, draft, sending, streamEndRef, inputRef, updateDraft, handleKeyDown, commitPacket };
}
