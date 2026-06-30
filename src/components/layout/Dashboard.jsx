import { usePeer } from '../../context/PeerContext';

export default function Dashboard({ sidebar, main }) {
  const { myName, localId, role } = usePeer();

  return (
    <div className="h-full w-full flex flex-col bg-[#f4f4f5]">

      {/* ── Top bar ───────────────────────────────────────── */}
      <header className="shrink-0 h-14 flex items-center justify-between px-5 bg-white border-b border-[#e4e4e7] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">

        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#2563eb] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M10 3 L17 7 L17 13 L10 17 L3 13 L3 7 Z" stroke="white" strokeWidth="1.5" fill="none"/>
              <circle cx="10" cy="10" r="2.5" fill="white"/>
            </svg>
          </div>
          <span className="text-[15px] font-bold text-[#18181b] tracking-tight">P2P Chat</span>
        </div>

        {/* Identity */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-[#f4f4f5] border border-[#e4e4e7] rounded-full px-3.5 py-1.5">
            {/* Avatar */}
            <div className="w-6 h-6 rounded-full bg-[#2563eb] flex items-center justify-center text-white text-[11px] font-bold select-none shrink-0">
              {myName?.slice(0, 1).toUpperCase()}
            </div>
            <span className="text-[13px] font-semibold text-[#18181b]">{myName}</span>
            <span className="hidden sm:block text-[11px] font-mono text-[#a1a1aa]">
              {localId?.slice(0, 10)}…
            </span>
          </div>
          {role && (
            <div className={`badge ${role === 'host' ? 'badge-blue' : 'badge-green'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${role === 'host' ? 'bg-[#2563eb]' : 'bg-[#10b981]'}`} />
              {role === 'host' ? 'Host' : 'Connected'}
            </div>
          )}
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar — light grey */}
        <aside className="w-72 shrink-0 bg-[#f4f4f5] border-r border-[#e4e4e7] flex flex-col overflow-y-auto">
          {sidebar}
        </aside>

        {/* Main — white */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          {main}
        </main>
      </div>
    </div>
  );
}
