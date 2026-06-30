import { useState, useCallback } from 'react';
import { Loader, AlertCircle, Network, User } from 'lucide-react';
import { usePeer } from '../context/PeerContext';

export default function SetupScreen() {
  const { initPeer, initError, clearInitError } = usePeer();

  const [peerId,  setPeerId]  = useState('');
  const [name,    setName]    = useState('');
  const [loading, setLoading] = useState(false);

  if (initError && loading) setLoading(false);

  const handleSubmit = useCallback(() => {
    if (!name.trim()) return;
    setLoading(true);
    clearInitError();
    initPeer(peerId.trim() || undefined, name.trim());
  }, [peerId, name, initPeer, clearInitError]);

  const onKey = (e) => { if (e.key === 'Enter') handleSubmit(); };

  return (
    <div className="h-full w-full flex items-center justify-center bg-grid-pattern px-4">
      <div className="w-full max-w-md animate-card">

        {/* ── Outer Card ────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-[#e4e4e7] premium-shadow overflow-hidden">

          {/* Card Header */}
          <div className="px-6 py-6 sm:px-8 sm:py-7 border-b border-[#f4f4f5] bg-[#fafafc]">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2563eb] to-[#3b82f6] flex items-center justify-center shadow-md">
                <Network size={20} className="text-white" />
              </div>
              <div className="flex flex-col text-left">
                <h1 className="text-[17px] font-extrabold text-[#09090b] tracking-tight leading-none">PIED PIPER</h1>
                <p className="text-[11px] font-mono text-[#71717a] mt-1 uppercase tracking-wider">Node Configuration</p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="px-6 py-6 sm:px-8 sm:py-7 flex flex-col gap-5">

            {/* Display Name Input */}
            <div className="flex flex-col gap-2 text-left">
              <label className="text-[12px] font-bold text-[#09090b] uppercase tracking-wider">Display name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={onKey}
                placeholder="e.g. Richard Hendricks"
                maxLength={30}
                autoFocus
                className="input-premium"
              />
            </div>

            {/* Peer ID Input */}
            <div className="flex flex-col gap-2 text-left">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-bold text-[#09090b] uppercase tracking-wider">Custom Peer ID</label>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563eb] bg-[#eff6ff] px-2 py-0.5 rounded-full border border-[#bfdbfe]">optional</span>
              </div>
              <input
                type="text"
                value={peerId}
                onChange={e => { setPeerId(e.target.value.replace(/\s/g, '')); clearInitError(); }}
                onKeyDown={onKey}
                placeholder="e.g. richard-pied-piper"
                maxLength={64}
                className="input-premium font-mono text-[13.5px]"
                spellCheck={false}
              />
              <p className="text-[12px] text-[#71717a] leading-normal">
                Memorable IDs allow friends to reconnect instantly. Leave blank to generate a random network address.
              </p>
            </div>

            {/* Error Message */}
            {initError && (
              <div className="flex items-start gap-3 bg-[#fef2f2] border border-[#fecaca] rounded-2xl p-3.5 fade-in">
                <AlertCircle size={16} className="text-[#ef4444] mt-0.5 shrink-0" />
                <p className="text-[12px] font-medium text-[#ef4444] text-left leading-snug">{initError}</p>
              </div>
            )}

            {/* Connect Button */}
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || loading}
              className="btn-premium-primary w-full mt-2 shadow-sm disabled:opacity-40"
            >
              {loading
                ? <><Loader size={16} className="animate-spin" /> Routing Node to Relay…</>
                : 'Initialize Node'
              }
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] font-mono text-[#a1a1aa] mt-6 tracking-wide">
          DECENTRALIZED P2P NETWORK PROTOCOL · NO CENTRAL LOGS
        </p>
      </div>
    </div>
  );
}
