import { useState, useCallback } from 'react';
import { Copy, Check, LogOut, Crown, AlertCircle, Plus, ArrowRight, Users, Laptop, Radio } from 'lucide-react';
import { usePeer } from '../../context/PeerContext';

export default function ConnectionPanel() {
  const {
    localId, role, roomId, members,
    roomError, clearRoomError,
    createRoom, joinRoom, leaveRoom,
  } = usePeer();

  const inRoom = role !== null;

  return (
    <div className="flex flex-col h-full bg-[#fafafc]">
      {inRoom
        ? <InRoom role={role} roomId={roomId} members={members} localId={localId} onLeave={leaveRoom} />
        : <Lobby localId={localId} roomError={roomError} clearError={clearRoomError} onCreate={createRoom} onJoin={joinRoom} />
      }
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   LOBBY (Setup Lobby view)
   ═══════════════════════════════════════════════════════════ */
function Lobby({ localId, roomError, clearError, onCreate, onJoin }) {
  const [tab,    setTab]    = useState('create');
  const [target, setTarget] = useState('');

  const handleJoin = useCallback(() => {
    if (target.trim()) onJoin(target.trim());
  }, [target, onJoin]);

  return (
    <div className="flex flex-col flex-1 py-4 px-4 overflow-y-auto">

      {/* Your Local Node Info Card */}
      <div className="bg-white border border-[#e4e4e7] rounded-2xl p-4 premium-shadow mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Laptop size={15} className="text-[#2563eb]" />
          <span className="text-[12px] font-bold text-[#09090b] uppercase tracking-wider">Local Node Status</span>
        </div>
        <p className="text-[11px] text-[#71717a] mb-2">Share your Peer ID to let friends connect directly to you:</p>
        <CopyableId value={localId} />
      </div>

      {/* Tab Switcher */}
      <div className="flex p-1 bg-[#f4f4f5] border border-[#e4e4e7] rounded-xl mb-4">
        {[['create', 'Create Room'], ['join', 'Join Room']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2.5 text-[13px] font-bold rounded-lg transition-all ${
              tab === key
                ? 'bg-white text-[#09090b] shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#e4e4e7]'
                : 'text-[#71717a] hover:text-[#09090b]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main card */}
      <div className="bg-white border border-[#e4e4e7] rounded-2xl p-4 premium-shadow flex-1 flex flex-col justify-between">
        <div>
          {tab === 'create' ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[#10b981]">
                <Radio size={15} className="animate-pulse" />
                <span className="text-[12px] font-bold uppercase tracking-wider">Deploy Serverless Room</span>
              </div>
              <p className="text-[13.5px] text-[#71717a] leading-relaxed">
                Click below to start a decentralized room host. No central servers are involved — all traffic is relayed directly via WebRTC.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-[#09090b] uppercase tracking-wider">Target Peer ID</label>
                <input
                  type="text"
                  value={target}
                  onChange={e => { setTarget(e.target.value); clearError(); }}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  placeholder="Paste room host's ID…"
                  className="input-premium font-mono text-[13px] !py-2.5"
                  spellCheck={false}
                  autoFocus
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {roomError && (
            <div className="flex items-start gap-2.5 bg-[#fef2f2] border border-[#fecaca] rounded-xl p-3 fade-in">
              <AlertCircle size={15} className="text-[#ef4444] mt-0.5 shrink-0" />
              <p className="text-[12px] font-medium text-[#ef4444] flex-1 leading-snug">{roomError}</p>
              <button onClick={clearError} className="text-[#f87171] hover:text-[#ef4444] text-[15px] font-bold leading-none">×</button>
            </div>
          )}

          {tab === 'create' ? (
            <button onClick={onCreate} className="btn-premium-primary w-full shadow-sm">
              <Plus size={16} />
              Deploy Room
            </button>
          ) : (
            <button
              onClick={handleJoin}
              disabled={!target.trim()}
              className="btn-premium-primary w-full shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowRight size={16} />
              Connect to Peer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   IN-ROOM (Active chat sidebar view)
   ═══════════════════════════════════════════════════════════ */
function InRoom({ role, roomId, members, localId, onLeave }) {
  const { myName } = usePeer();
  const isHost = role === 'host';

  const allMembers = [
    { peerId: localId, name: myName, isSelf: true, isHost },
    ...members.map(m => ({ ...m, isSelf: false, isHost: m.peerId === roomId })),
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      
      {/* Scrollable info section */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        
        {/* Room Identity Card */}
        <div className="bg-white border border-[#e4e4e7] rounded-2xl p-4 premium-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold text-[#09090b] uppercase tracking-wider">Active Channel</span>
            {isHost && (
              <span className="badge badge-blue text-[10px] uppercase font-bold py-0.5">
                <Crown size={9} /> Host
              </span>
            )}
          </div>
          <CopyableId value={roomId} />
          <p className="text-[11px] text-[#71717a] mt-2.5 leading-normal">
            Send this ID to your friends. They can connect directly to your local WebRTC stream.
          </p>
        </div>

        {/* Member Directory Card */}
        <div className="bg-white border border-[#e4e4e7] rounded-2xl p-4 premium-shadow flex-1 flex flex-col min-h-[250px]">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#f4f4f5]">
            <Users size={14} className="text-[#2563eb]" />
            <span className="text-[12px] font-bold text-[#09090b] uppercase tracking-wider">Connected Nodes</span>
            <span className="ml-auto bg-[#eff6ff] text-[#2563eb] text-[11px] font-bold rounded-full px-2 py-0.5 border border-[#bfdbfe]">
              {allMembers.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1">
            {allMembers.map(m => <MemberRow key={m.peerId} member={m} />)}
          </div>
        </div>

      </div>

      {/* Connection Termination Footer */}
      <div className="p-4 bg-white border-t border-[#e4e4e7] shrink-0">
        <button onClick={onLeave} className="btn-premium-danger w-full shadow-sm flex items-center justify-center">
          <LogOut size={15} />
          Disconnect Node
        </button>
      </div>
    </div>
  );
}

/* ── Custom UI Helpers ───────────────────────────────────── */

function MemberRow({ member }) {
  const colors = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];
  const color  = colors[(member.name?.charCodeAt(0) ?? 0) % colors.length];
  return (
    <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-[#f4f4f5] transition-all border border-transparent hover:border-[#e4e4e7]/40">
      <div
        style={{ background: color }}
        className="w-7.5 h-7.5 rounded-lg flex items-center justify-center text-white text-[12px] font-bold shrink-0 select-none shadow-sm"
      >
        {member.name?.slice(0, 1).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-semibold text-[#09090b] truncate flex items-center gap-1.5">
          {member.name}
          {member.isSelf && <span className="text-[10px] text-[#a1a1aa] font-mono font-normal bg-[#f4f4f5] px-1.5 py-0.5 rounded-md border border-[#e4e4e7]">(you)</span>}
        </p>
      </div>
      {member.isHost && <Crown size={12} className="text-[#2563eb] shrink-0" />}
    </div>
  );
}

function CopyableId({ value }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <div
        title={value}
        className="flex-1 text-[11px] font-mono text-[#2563eb] bg-[#f0f4ff] border border-[#bfdbfe] rounded-xl px-3 py-2.5 truncate select-all min-w-0"
      >
        {value ?? 'Initializing…'}
      </div>
      <button 
        onClick={handleCopy} 
        className="btn-premium-secondary shrink-0 !p-2.5 hover:border-[#2563eb]/30 hover:text-[#2563eb]" 
        title="Copy ID"
      >
        {copied
          ? <Check size={14} className="text-[#10b981]" />
          : <Copy size={14} />
        }
      </button>
    </div>
  );
}
