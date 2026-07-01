import { useState, useCallback, useEffect } from 'react';
import { Copy, Check, LogOut, Crown, AlertCircle, Plus, ArrowRight, Users, Laptop, Radio, Phone, PhoneCall, PhoneOff, Mic, MicOff, Brain, Sliders, Database, Sparkles, Cpu } from 'lucide-react';
import { usePeer } from '../../context/PeerContext';

export default function ConnectionPanel() {
  const {
    localId, role, roomId, members,
    roomError, clearRoomError,
    createRoom, joinRoom, leaveRoom,
    disconnectNode,
  } = usePeer();

  const inRoom = role !== null;

  return (
    <div className="flex flex-col h-full bg-[#fafafc]">
      {inRoom
        ? <InRoom role={role} roomId={roomId} members={members} localId={localId} onLeave={leaveRoom} />
        : <Lobby localId={localId} roomError={roomError} clearError={clearRoomError} onCreate={createRoom} onJoin={joinRoom} onDisconnect={disconnectNode} />
      }
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   LOBBY (Setup Lobby view)
   ═══════════════════════════════════════════════════════════ */
function Lobby({ localId, roomError, clearError, onCreate, onJoin, onDisconnect }) {
  const [tab,    setTab]    = useState('create');
  const [target, setTarget] = useState('');

  const handleJoin = useCallback(() => {
    if (target.trim()) onJoin(target.trim());
  }, [target, onJoin]);

  return (
    <div className="flex flex-col flex-1 py-4 px-4 overflow-y-auto">

      {/* Your Local Node Info Card */}
      <div className="bg-white border border-[#e4e4e7] rounded-2xl p-4 premium-shadow mb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Laptop size={15} className="text-[#2563eb]" />
            <span className="text-[12px] font-bold text-[#09090b] uppercase tracking-wider">Local Node Status</span>
          </div>
          <button
            onClick={onDisconnect}
            className="text-[10px] font-bold uppercase tracking-wider text-[#ef4444] hover:text-[#dc2626] flex items-center gap-1 transition-colors cursor-pointer"
            title="Disconnect node and change network settings/identity"
          >
            <LogOut size={11} />
            Shut Down
          </button>
        </div>
        <div>
          <p className="text-[11px] text-[#71717a] mb-2">Share your Peer ID to let friends connect directly to you:</p>
          <CopyableId value={localId} />
        </div>
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
   IN-ROOM (Active chat sidebar view with Voice Calling)
   ═══════════════════════════════════════════════════════════ */
function InRoom({ role, roomId, members, localId, onLeave }) {
  const { 
    myName,
    // Call states and commands
    callStatus, callType, callPartner, isMuted, setIsMuted,
    isAutoPilotVoice, updateIsAutoPilotVoice,
    startCall, acceptCall, declineCall, endCall,
    // Model settings
    ttsEngine, updateTtsEngine,
    allTalkUrl, updateAllTalkUrl,
    allTalkVoice, updateAllTalkVoice,
    whisperUrl, updateWhisperUrl,
    whisperModel, updateWhisperModel,
    vadThreshold, updateVadThreshold,
    vadSilenceMs, updateVadSilenceMs
  } = usePeer();

  const [activeTab, setActiveTab] = useState('nodes'); // 'nodes' | 'voice-settings'
  const [showSecretSettings, setShowSecretSettings] = useState(() => {
    return localStorage.getItem('p2p_showSecretSettings') === 'true';
  });

  const isHost = role === 'host';

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        setShowSecretSettings(prev => {
          const next = !prev;
          localStorage.setItem('p2p_showSecretSettings', next ? 'true' : 'false');
          console.log(`%c[AI Settings] ${next ? '🔓 UNLOCKED' : '🔒 HIDDEN'}`, 'color: #8b5cf6; font-weight: bold;');
          if (!next) {
            setActiveTab('nodes'); // Reset tab view if settings were active
          }
          return next;
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const uniqueMembersMap = new Map();
  uniqueMembersMap.set(localId, { peerId: localId, name: myName, isSelf: true, isHost });
  members.forEach(m => {
    if (m.peerId) {
      uniqueMembersMap.set(m.peerId, { ...m, isSelf: false, isHost: m.peerId === roomId });
    }
  });
  const allMembers = Array.from(uniqueMembersMap.values());

  return (
    <div className="flex flex-col h-full overflow-hidden">
      
      {/* ── Call HUD (Displays if call is active) ────────────────── */}
      {callStatus !== 'idle' && (
        <div className="shrink-0 p-4 border-b border-[#e4e4e7] bg-gradient-to-r from-[#eff6ff] to-[#f5f3ff]">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
                callStatus === 'connected' ? 'bg-[#10b981] animate-pulse' : 'bg-[#2563eb] animate-pulse'
              }`}>
                {callStatus === 'connected' ? <Phone size={15} /> : <PhoneCall size={15} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-bold text-[#09090b] truncate">
                  {callStatus === 'ringing' && `Incoming Call`}
                  {callStatus === 'calling' && `Calling Peer…`}
                  {callStatus === 'connecting' && `Connecting Call…`}
                  {callStatus === 'connected' && `Voice Call Connected`}
                </p>
                <p className="text-[11px] text-[#71717a] truncate font-semibold">
                  {callPartner?.name} ({callPartner?.peerId?.slice(0, 6)}…)
                </p>
              </div>
            </div>

            {/* Actions for Ringing */}
            {callStatus === 'ringing' && (
              <div className="flex gap-2">
                <button
                  onClick={() => acceptCall(false)}
                  className="flex-1 py-1.5 px-3 bg-[#10b981] hover:bg-[#059669] text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <Phone size={12} /> Accept
                </button>
                {showSecretSettings && (
                  <button
                    onClick={() => acceptCall(true)}
                    className="py-1.5 px-2.5 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                    title="Answer with Silent Mic — Voice AutoPilot will reply for you"
                  >
                    <Cpu size={12} /> AI Only
                  </button>
                )}
                <button
                  onClick={declineCall}
                  className="py-1.5 px-3 bg-[#ef4444] hover:bg-[#dc2626] text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <PhoneOff size={12} /> Decline
                </button>
              </div>
            )}

            {/* Actions for Calling / Connecting */}
            {(callStatus === 'calling' || callStatus === 'connecting') && (
              <button
                onClick={endCall}
                className="w-full py-1.5 bg-[#ef4444] hover:bg-[#dc2626] text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <PhoneOff size={12} /> Cancel Call
              </button>
            )}

            {/* Actions for Connected */}
            {callStatus === 'connected' && (
              <div className="flex gap-2 items-center justify-between">
                <div className="flex gap-1.5">
                  {/* Mute Button */}
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-2 rounded-lg transition-all cursor-pointer border ${
                      isMuted 
                        ? 'bg-[#fee2e2] border-[#fecaca] text-[#ef4444]' 
                        : 'bg-white border-[#e4e4e7] text-[#71717a] hover:bg-[#f4f4f5]'
                    }`}
                    title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                  >
                    {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                  </button>

                  {/* AI Autopilot Toggle */}
                  {showSecretSettings && (
                    <button
                      onClick={() => updateIsAutoPilotVoice(!isAutoPilotVoice)}
                      className={`p-2 rounded-lg transition-all cursor-pointer border ${
                        isAutoPilotVoice 
                          ? 'bg-[#f3e8ff] border-[#e9d5ff] text-[#8b5cf6] font-bold' 
                          : 'bg-white border-[#e4e4e7] text-[#71717a] hover:bg-[#f4f4f5]'
                      }`}
                      title={isAutoPilotVoice ? "Disable AI Voice Auto-Response" : "Enable AI Voice Auto-Response"}
                    >
                      <Brain size={14} className={isAutoPilotVoice ? "animate-pulse" : ""} />
                    </button>
                  )}
                </div>

                <button
                  onClick={endCall}
                  className="py-1.5 px-3.5 bg-[#ef4444] hover:bg-[#dc2626] text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <PhoneOff size={12} /> Hang Up
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tabs Header ─────────────────────────────────────────── */}
      {showSecretSettings && (
        <div className="flex border-b border-[#e4e4e7] bg-[#fafafc] shrink-0 p-1">
          <button
            onClick={() => setActiveTab('nodes')}
            className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'nodes'
                ? 'bg-white text-[#09090b] shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e4e4e7]'
                : 'text-[#71717a] hover:text-[#09090b]'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Users size={13} />
              Nodes
            </div>
          </button>
          <button
            onClick={() => setActiveTab('voice-settings')}
            className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'voice-settings'
                ? 'bg-white text-[#09090b] shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e4e4e7]'
                : 'text-[#71717a] hover:text-[#09090b]'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Sliders size={13} />
              Voice Settings
            </div>
          </button>
        </div>
      )}

      {/* ── Tab Content ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {activeTab === 'nodes' ? (
          <>
            {/* Room Identity Card */}
            <div className="bg-white border border-[#e4e4e7] rounded-2xl p-4 premium-shadow shrink-0">
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
                {allMembers.map(m => (
                  <MemberRow 
                    key={m.peerId} 
                    member={m} 
                    onStartCall={callStatus === 'idle' && !m.isSelf ? () => startCall(m.peerId, m.name) : null}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          /* ── Tab: Voice & Local Model Settings ────────────────── */
          <div className="flex flex-col gap-4">
            {/* AutoPilot Voice Override */}
            <div className="bg-white border border-[#e4e4e7] rounded-2xl p-4 premium-shadow flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain size={14} className="text-[#8b5cf6]" />
                  <span className="text-[12px] font-bold text-[#09090b] uppercase tracking-wider text-left">Voice AutoPilot</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAutoPilotVoice}
                    onChange={(e) => updateIsAutoPilotVoice(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#e4e4e7] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#8b5cf6]"></div>
                </label>
              </div>
              <p className="text-[11px] text-[#71717a] leading-normal text-left">
                When active, the AI automatically intercepts incoming voice calls and speaks in your place using the selected local clone voice.
              </p>
            </div>

            {/* TTS Settings Card */}
            <div className="bg-white border border-[#e4e4e7] rounded-2xl p-4 premium-shadow flex flex-col gap-3">
              <div className="flex items-center gap-2 pb-1 border-b border-[#f4f4f5]">
                <Sparkles size={14} className="text-[#2563eb]" />
                <span className="text-[12px] font-bold text-[#09090b] uppercase tracking-wider">Voice Cloner (TTS)</span>
              </div>

              {/* TTS Engine */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[11px] font-bold text-[#71717a] uppercase">TTS Engine</label>
                <select
                  value={ttsEngine}
                  onChange={(e) => updateTtsEngine(e.target.value)}
                  className="input-premium text-[12.5px] !py-2 cursor-pointer"
                >
                  <option value="alltalk">AllTalk TTS (Local XTTS v2)</option>
                  <option value="google">Google Translate TTS (Online/Free)</option>
                </select>
              </div>

              {ttsEngine === 'alltalk' && (
                <>
                  {/* AllTalk Server URL */}
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-[11px] font-bold text-[#71717a] uppercase">AllTalk Server URL</label>
                    <input
                      type="text"
                      value={allTalkUrl}
                      onChange={(e) => updateAllTalkUrl(e.target.value)}
                      placeholder="http://localhost:7851"
                      className="input-premium font-mono text-[12px] !py-2"
                      spellCheck={false}
                    />
                  </div>

                  {/* Character Voice WAV */}
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-[11px] font-bold text-[#71717a] uppercase">Voice Character File (.wav)</label>
                    <input
                      type="text"
                      value={allTalkVoice}
                      onChange={(e) => updateAllTalkVoice(e.target.value)}
                      placeholder="szabo.wav"
                      className="input-premium font-mono text-[12px] !py-2"
                      spellCheck={false}
                    />
                  </div>
                </>
              )}
            </div>

            {/* STT Settings Card */}
            <div className="bg-white border border-[#e4e4e7] rounded-2xl p-4 premium-shadow flex flex-col gap-3">
              <div className="flex items-center gap-2 pb-1 border-b border-[#f4f4f5]">
                <Database size={14} className="text-[#2563eb]" />
                <span className="text-[12px] font-bold text-[#09090b] uppercase tracking-wider">Whisper & VAD</span>
              </div>

              {/* Whisper Server URL */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[11px] font-bold text-[#71717a] uppercase">Local Whisper URL</label>
                <input
                  type="text"
                  value={whisperUrl}
                  onChange={(e) => updateWhisperUrl(e.target.value)}
                  placeholder="http://localhost:9000/v1/audio/transcriptions"
                  className="input-premium font-mono text-[12px] !py-2"
                  spellCheck={false}
                />
              </div>

              {/* Whisper Model */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[11px] font-bold text-[#71717a] uppercase">Whisper Model Name</label>
                <input
                  type="text"
                  value={whisperModel}
                  onChange={(e) => updateWhisperModel(e.target.value)}
                  placeholder="whisper-1"
                  className="input-premium font-mono text-[12px] !py-2"
                  spellCheck={false}
                />
              </div>

              {/* VAD Settings */}
              <div className="grid grid-cols-2 gap-3 mt-1 text-left">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#71717a] uppercase">VAD Threshold</label>
                  <input
                    type="number"
                    step="0.005"
                    min="0.001"
                    max="0.1"
                    value={vadThreshold}
                    onChange={(e) => updateVadThreshold(parseFloat(e.target.value) || 0.015)}
                    className="input-premium text-[12px] !py-1.5"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#71717a] uppercase">Silence Gap (ms)</label>
                  <input
                    type="number"
                    step="100"
                    min="500"
                    max="5000"
                    value={vadSilenceMs}
                    onChange={(e) => updateVadSilenceMs(parseInt(e.target.value) || 1500)}
                    className="input-premium text-[12px] !py-1.5"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
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

function MemberRow({ member, onStartCall }) {
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
        <p className="text-[13.5px] font-semibold text-[#09090b] truncate flex items-center gap-1.5 text-left">
          {member.name}
          {member.isSelf && <span className="text-[10px] text-[#a1a1aa] font-mono font-normal bg-[#f4f4f5] px-1.5 py-0.5 rounded-md border border-[#e4e4e7]">(you)</span>}
        </p>
      </div>
      {member.isHost && <Crown size={12} className="text-[#2563eb] shrink-0" />}
      
      {/* Voice Call Button */}
      {onStartCall && (
        <button
          onClick={onStartCall}
          className="p-1.5 text-[#10b981] hover:text-white hover:bg-[#10b981] border border-[#10b981]/20 hover:border-[#10b981] rounded-lg transition-all cursor-pointer shrink-0"
          title={`Start audio call with ${member.name}`}
        >
          <Phone size={13} />
        </button>
      )}
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
        className="btn-premium-secondary shrink-0 !p-2.5 hover:border-[#2563eb]/30 hover:text-[#2563eb] cursor-pointer" 
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
