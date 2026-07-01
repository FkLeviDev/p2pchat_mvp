import { useState, useCallback } from 'react';
import { Loader, AlertCircle, Network, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { usePeer } from '../context/PeerContext';

export default function SetupScreen() {
  const { initPeer, initError, clearInitError, iceConfig, updateIceConfig } = usePeer();

  const [peerId,  setPeerId]  = useState('');
  const [name,    setName]    = useState('');
  const [loading, setLoading] = useState(false);

  /* ── Local Advanced Network State ────────────────────── */
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [useCustom, setUseCustom] = useState(iceConfig.useCustom);
  const [stunUrls, setStunUrls] = useState(iceConfig.stunUrls);
  const [turnUrl, setTurnUrl] = useState(iceConfig.turnUrl);
  const [turnUsername, setTurnUsername] = useState(iceConfig.turnUsername);
  const [turnCredential, setTurnCredential] = useState(iceConfig.turnCredential);

  if (initError && loading) setLoading(false);

  const handleSubmit = useCallback(() => {
    if (!name.trim()) return;
    setLoading(true);
    clearInitError();

    // Save ICE config before initializing peer
    updateIceConfig({
      useCustom,
      stunUrls,
      turnUrl,
      turnUsername,
      turnCredential,
    });

    initPeer(peerId.trim() || undefined, name.trim());
  }, [peerId, name, initPeer, clearInitError, updateIceConfig, useCustom, stunUrls, turnUrl, turnUsername, turnCredential]);

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

            {/* Advanced Settings Toggle */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#f4f4f5]">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#71717a] hover:text-[#09090b] transition-colors py-1 w-full"
              >
                <span className="flex items-center gap-1.5">
                  <Settings size={12} />
                  Network & ICE Configuration
                </span>
                {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showAdvanced && (
                <div className="flex flex-col gap-4 mt-2 bg-[#fafafc] border border-[#e4e4e7] rounded-2xl p-4 animate-card text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-[#09090b] uppercase tracking-wider">NAT Traversal Mode</span>
                    <button
                      type="button"
                      onClick={() => setUseCustom(!useCustom)}
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border transition-all ${
                        useCustom
                          ? 'bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]'
                          : 'bg-[#f4f4f5] text-[#71717a] border-[#e4e4e7]'
                      }`}
                    >
                      {useCustom ? 'Custom ICE' : 'Default STUN'}
                    </button>
                  </div>

                  <p className="text-[11px] text-[#71717a] leading-normal">
                    {useCustom
                      ? 'Configure custom STUN/TURN servers to enable connections behind strict firewalls and symmetric NATs.'
                      : 'Uses default public STUN servers for direct peer-to-peer discovery. No relay (TURN) is included.'}
                  </p>

                  {useCustom && (
                    <div className="flex flex-col gap-3.5 mt-1 border-t border-[#e4e4e7]/60 pt-3">
                      {/* STUN Servers Textarea */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-[#09090b] uppercase tracking-wider">STUN Servers (one per line)</label>
                        <textarea
                          rows={2}
                          value={stunUrls}
                          onChange={e => setStunUrls(e.target.value)}
                          placeholder="stun:stun.l.google.com:19302"
                          className="input-premium font-mono text-[12px] !py-2.5 resize-none"
                        />
                      </div>

                      {/* TURN Server URL */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-[#09090b] uppercase tracking-wider">TURN Server URL</label>
                        <input
                          type="text"
                          value={turnUrl}
                          onChange={e => setTurnUrl(e.target.value)}
                          placeholder="e.g. turn:your-turn-server.com:3478"
                          className="input-premium font-mono text-[12px] !py-2"
                        />
                      </div>

                      {/* TURN Credentials */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-[#09090b] uppercase tracking-wider">Username</label>
                          <input
                            type="text"
                            value={turnUsername}
                            onChange={e => setTurnUsername(e.target.value)}
                            placeholder="user"
                            className="input-premium font-mono text-[12px] !py-2"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-[#09090b] uppercase tracking-wider">Password</label>
                          <input
                            type="password"
                            value={turnCredential}
                            onChange={e => setTurnCredential(e.target.value)}
                            placeholder="password"
                            className="input-premium font-mono text-[12px] !py-2"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
