import { useState, useCallback } from 'react';
import { Loader, AlertCircle } from 'lucide-react';
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
    <div className="h-full w-full flex items-center justify-center bg-[#f4f4f5] px-4">
      <div className="w-full max-w-md fade-in">

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#e4e4e7] shadow-sm overflow-hidden">

          {/* Card header */}
          <div className="px-8 pt-8 pb-6 border-b border-[#f4f4f5]">
            <div className="flex items-center gap-3 mb-1">
              {/* Logo mark */}
              <div className="w-9 h-9 rounded-xl bg-[#2563eb] flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M10 3 L17 7 L17 13 L10 17 L3 13 L3 7 Z" stroke="white" strokeWidth="1.5" fill="none"/>
                  <circle cx="10" cy="10" r="2.5" fill="white"/>
                </svg>
              </div>
              <div>
                <h1 className="text-[18px] font-bold text-[#18181b] tracking-tight">P2P Chat</h1>
                <p className="text-[13px] text-[#71717a]">Encrypted · Serverless · Instant</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="px-8 py-7 flex flex-col gap-5">

            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-semibold text-[#18181b]">Display name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={onKey}
                placeholder="e.g. Richard Hendricks"
                maxLength={30}
                autoFocus
                className="input"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[14px] font-semibold text-[#18181b]">Peer ID</label>
                <span className="badge badge-blue">optional</span>
              </div>
              <input
                type="text"
                value={peerId}
                onChange={e => { setPeerId(e.target.value.replace(/\s/g, '')); clearInitError(); }}
                onKeyDown={onKey}
                placeholder="e.g. richard-pied-piper"
                maxLength={64}
                className="input font-mono text-[13px]"
                spellCheck={false}
              />
              <p className="text-[13px] text-[#71717a] leading-relaxed">
                A memorable ID lets you share it once — friends can always find you with the same ID.
                Leave blank for a random one.
              </p>
            </div>

            {initError && (
              <div className="flex items-start gap-3 bg-[#fef2f2] border border-[#fecaca] rounded-lg p-3.5 fade-in">
                <AlertCircle size={15} className="text-[#ef4444] mt-0.5 shrink-0" />
                <p className="text-[13px] text-[#ef4444]">{initError}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!name.trim() || loading}
              className="btn-primary w-full mt-1 !py-3"
            >
              {loading
                ? <><Loader size={15} className="animate-spin" /> Connecting to relay…</>
                : 'Get started →'
              }
            </button>
          </div>
        </div>

        <p className="text-center text-[12px] text-[#a1a1aa] mt-5">
          Peer-to-peer · No accounts · No logs
        </p>
      </div>
    </div>
  );
}
