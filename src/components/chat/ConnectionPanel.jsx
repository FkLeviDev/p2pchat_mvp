import { useState, useCallback } from 'react';
import { Copy, Check, LogOut, Crown, AlertCircle, Plus, ArrowRight, Users } from 'lucide-react';
import { usePeer } from '../../context/PeerContext';

export default function ConnectionPanel() {
  const {
    localId, role, roomId, members,
    roomError, clearRoomError,
    createRoom, joinRoom, leaveRoom,
  } = usePeer();

  const inRoom = role !== null;

  return (
    <div className="flex flex-col h-full">
      {inRoom
        ? <InRoom role={role} roomId={roomId} members={members} localId={localId} onLeave={leaveRoom} />
        : <Lobby localId={localId} roomError={roomError} clearError={clearRoomError} onCreate={createRoom} onJoin={joinRoom} />
      }
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   LOBBY
   ═══════════════════════════════════════════════════════════ */
function Lobby({ localId, roomError, clearError, onCreate, onJoin }) {
  const [tab,    setTab]    = useState('create');
  const [target, setTarget] = useState('');

  const handleJoin = useCallback(() => {
    if (target.trim()) onJoin(target.trim());
  }, [target, onJoin]);

  return (
    <div className="flex flex-col flex-1 py-2">

      {/* Your peer ID */}
      <Section>
        <p className="label mb-2.5">Your Peer ID</p>
        <CopyableId value={localId} />
      </Section>

      <Divider />

      {/* Tab switcher */}
      <div className="flex mx-3 mt-3 mb-1 p-1 bg-[#e4e4e7] rounded-lg">
        {[['create', 'Create room'], ['join', 'Join room']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 text-[13px] font-semibold rounded-md transition-all ${
              tab === key
                ? 'bg-white text-[#18181b] shadow-sm'
                : 'text-[#71717a] hover:text-[#18181b]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Form content */}
      <Section>
        {tab === 'create' ? (
          <div className="flex flex-col gap-3">
            <p className="text-[14px] text-[#52525b] leading-relaxed">
              Start a new room. Share your Peer ID with others so they can join.
            </p>
            <button onClick={onCreate} className="btn-primary w-full">
              <Plus size={15} />
              Create room
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-semibold text-[#18181b]">Room ID</label>
              <input
                type="text"
                value={target}
                onChange={e => { setTarget(e.target.value); clearError(); }}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder="Paste the host's Peer ID…"
                className="input font-mono text-[13px]"
                spellCheck={false}
                autoFocus
              />
            </div>
            <button
              onClick={handleJoin}
              disabled={!target.trim()}
              className="btn-primary w-full"
            >
              <ArrowRight size={15} />
              Join room
            </button>
          </div>
        )}

        {roomError && (
          <div className="flex items-start gap-2.5 bg-[#fef2f2] border border-[#fecaca] rounded-lg p-3 mt-1 fade-in">
            <AlertCircle size={14} className="text-[#ef4444] mt-0.5 shrink-0" />
            <p className="text-[13px] text-[#ef4444] flex-1">{roomError}</p>
            <button onClick={clearError} className="text-[#f87171] hover:text-[#ef4444] text-lg leading-none">×</button>
          </div>
        )}
      </Section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   IN-ROOM
   ═══════════════════════════════════════════════════════════ */
function InRoom({ role, roomId, members, localId, onLeave }) {
  const { myName } = usePeer();
  const isHost = role === 'host';

  const allMembers = [
    { peerId: localId, name: myName, isSelf: true, isHost },
    ...members.map(m => ({ ...m, isSelf: false, isHost: m.peerId === roomId })),
  ];

  return (
    <div className="flex flex-col flex-1 py-2">

      {/* Room ID */}
      <Section>
        <div className="flex items-center justify-between mb-2.5">
          <p className="label">Room ID</p>
          {isHost && (
            <span className="badge badge-blue text-[11px]">
              <Crown size={10} /> Host
            </span>
          )}
        </div>
        <CopyableId value={roomId} />
        <p className="text-[13px] text-[#71717a] mt-2.5 leading-relaxed">
          Share this ID to invite people to your room.
        </p>
      </Section>

      <Divider />

      {/* Members */}
      <Section className="flex-1">
        <div className="flex items-center gap-2 mb-3">
          <Users size={14} className="text-[#71717a]" />
          <p className="label">Members</p>
          <span className="ml-auto bg-[#e4e4e7] text-[#52525b] text-[12px] font-semibold rounded-full px-2 py-0.5">
            {allMembers.length}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          {allMembers.map(m => <MemberRow key={m.peerId} member={m} />)}
        </div>
      </Section>

      {/* Leave */}
      <div className="px-3 pt-2 pb-3 mt-auto border-t border-[#e4e4e7]">
        <button onClick={onLeave} className="btn-danger w-full">
          <LogOut size={14} />
          Leave room
        </button>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

function MemberRow({ member }) {
  const colors = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];
  const color  = colors[(member.name?.charCodeAt(0) ?? 0) % colors.length];
  return (
    <div className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-[#e4e4e7]/50 transition-colors">
      <div
        style={{ background: color }}
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[13px] font-bold shrink-0 select-none"
      >
        {member.name?.slice(0, 1).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-[#18181b] truncate">
          {member.name}
          {member.isSelf && <span className="text-[12px] text-[#a1a1aa] font-normal ml-1.5">(you)</span>}
        </p>
      </div>
      {member.isHost && <Crown size={13} className="text-[#2563eb] shrink-0" />}
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
        className="flex-1 text-[12px] font-mono text-[#2563eb] bg-[#eff6ff] border border-[#bfdbfe] rounded-lg px-3 py-2.5 truncate select-all min-w-0"
      >
        {value ?? '…'}
      </div>
      <button onClick={handleCopy} className="btn-icon shrink-0" title="Copy">
        {copied
          ? <Check size={14} className="text-[#10b981]" />
          : <Copy size={14} />
        }
      </button>
    </div>
  );
}

function Section({ children, className = '' }) {
  return <div className={`px-3 py-3 flex flex-col gap-0 ${className}`}>{children}</div>;
}

function Divider() {
  return <div className="mx-3 my-1 h-px bg-[#e4e4e7]" />;
}
