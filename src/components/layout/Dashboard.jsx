import { useState } from 'react';
import { usePeer } from '../../context/PeerContext';
import { Users, MessageSquare, Shield, Network } from 'lucide-react';

export default function Dashboard({ sidebar, main }) {
  const { myName, localId, role } = usePeer();
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'lobby' (mobil nézetben)

  return (
    <div className="h-full w-full flex items-center justify-center bg-grid-pattern p-0 sm:p-4 md:p-6 lg:p-8">
      
      {/* ── Outer Premium Workspace Container ────────────────── */}
      <div className="w-full h-full sm:h-[90vh] max-w-6xl bg-white sm:border border-[#e4e4e7] sm:rounded-3xl premium-shadow overflow-hidden flex flex-col animate-card relative">
        
        {/* ── Custom Top Header ───────────────────────────────── */}
        <header className="shrink-0 h-16 flex items-center justify-between px-5 bg-[#fafafc] border-b border-[#e4e4e7]">
          {/* Logo mark & title */}
          <div className="flex items-center gap-3">
            <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-[#2563eb] to-[#3b82f6] flex items-center justify-center shadow-sm">
              <Network size={16} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-extrabold text-[#09090b] tracking-tight leading-none">PIED PIPER</span>
              <span className="text-[11px] font-mono text-[#71717a] mt-0.5 uppercase tracking-widest">P2P Network</span>
            </div>
          </div>

          {/* Central status badge (desktop only) */}
          {role && (
            <div className="hidden md:flex items-center gap-2 bg-white border border-[#e4e4e7] rounded-full px-3 py-1">
              <div className={`w-1.5 h-1.5 rounded-full ${role === 'host' ? 'bg-[#2563eb]' : 'bg-[#10b981]'}`} />
              <span className="text-[12px] font-semibold text-[#09090b]">
                {role === 'host' ? 'Hosting' : 'Connected to host'}
              </span>
            </div>
          )}

          {/* Profile Badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2.5 bg-white border border-[#e4e4e7] rounded-xl px-3 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="w-6.5 h-6.5 rounded-lg bg-[#2563eb] flex items-center justify-center text-white text-[12px] font-bold select-none shrink-0">
                {myName?.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[13px] font-bold text-[#09090b] leading-tight truncate max-w-[80px] sm:max-w-[120px]">{myName}</span>
                <span className="text-[10px] font-mono text-[#a1a1aa] leading-none">
                  {localId?.slice(0, 6)}…
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* ── Main Layout Split ────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden relative">

          {/* Desktop Layout: Sidebar always visible, Chat in the center */}
          <div className="hidden md:flex flex-1 overflow-hidden">
            {/* Modular Sidebar (Lobby/Status) */}
            <aside className="w-80 shrink-0 bg-[#fafafc] border-r border-[#e4e4e7] flex flex-col">
              {sidebar}
            </aside>

            {/* Modular Main Stream */}
            <main className="flex-1 flex flex-col overflow-hidden bg-white">
              {main}
            </main>
          </div>

          {/* Mobile Layout: Tabbed view (Chat vs Lobby) */}
          <div className="flex md:hidden flex-col flex-1 overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
              {activeTab === 'chat' ? (
                <main className="flex-1 flex flex-col overflow-hidden bg-white">
                  {main}
                </main>
              ) : (
                <aside className="flex-1 flex flex-col overflow-hidden bg-[#fafafc]">
                  {sidebar}
                </aside>
              )}
            </div>

            {/* Mobile bottom nav tabs */}
            <nav className="h-16 border-t border-[#e4e4e7] bg-white flex items-center justify-around px-6 shrink-0">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex flex-col items-center gap-1 py-1.5 px-6 rounded-xl transition-all ${
                  activeTab === 'chat'
                    ? 'text-[#2563eb] bg-[#eff6ff]'
                    : 'text-[#71717a]'
                }`}
              >
                <MessageSquare size={18} />
                <span className="text-[10px] font-bold">Chat Stream</span>
              </button>

              <button
                onClick={() => setActiveTab('lobby')}
                className={`flex flex-col items-center gap-1 py-1.5 px-6 rounded-xl transition-all ${
                  activeTab === 'lobby'
                    ? 'text-[#2563eb] bg-[#eff6ff]'
                    : 'text-[#71717a]'
                }`}
              >
                <Users size={18} />
                <span className="text-[10px] font-bold">Lobby & Nodes</span>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
