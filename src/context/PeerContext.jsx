import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import Peer from 'peerjs';

/**
 * Group chat — star topology.
 * Peer is initialized LAZILY (only after the user sets up their identity).
 *
 * Message protocol (JSON over DataConnection):
 *  { type: 'join',         name }
 *  { type: 'member-list',  members: [{peerId, name}] }
 *  { type: 'member-join',  peerId, name }
 *  { type: 'member-leave', peerId, name }
 *  { type: 'chat',         text, senderId, senderName, timestamp }
 */

const PeerContext = createContext(null);

export function PeerProvider({ children }) {
  /* ── Identity / peer status ──────────────────────────── */
  const [localId, setLocalId] = useState(null);   // actual peer ID confirmed by relay
  const [myName, setMyName] = useState('');
  const [peerReady, setPeerReady] = useState(false);
  const [initError, setInitError] = useState(null);   // ID taken / relay error at setup

  /* ── ICE / TURN server configuration ────────────────── */
  const [iceConfig, setIceConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('p2p_iceConfig');
      return saved ? JSON.parse(saved) : {
        useCustom: false,
        stunUrls: 'stun:stun.l.google.com:19302\nstun:stun1.l.google.com:19302\nstun:stun2.l.google.com:19302\nstun:stun.services.mozilla.com',
        turnUrl: '',
        turnUsername: '',
        turnCredential: '',
      };
    } catch {
      return {
        useCustom: false,
        stunUrls: 'stun:stun.l.google.com:19302\nstun:stun1.l.google.com:19302\nstun:stun2.l.google.com:19302\nstun:stun.services.mozilla.com',
        turnUrl: '',
        turnUsername: '',
        turnCredential: '',
      };
    }
  });

  const updateIceConfig = useCallback((newConfig) => {
    setIceConfig(newConfig);
    localStorage.setItem('p2p_iceConfig', JSON.stringify(newConfig));
  }, []);

  /* ── Room state ──────────────────────────────────────── */
  const [role, setRole] = useState(null);     // 'host' | 'client' | null
  const [roomId, setRoomId] = useState(null);
  const [members, setMembers] = useState([]);       // remote peers
  const [messages, setMessages] = useState([]);
  const [roomError, setRoomError] = useState(null);

  /* ── Call State ──────────────────────────────────────── */
  const [callStatus, setCallStatus] = useState('idle'); // 'idle' | 'calling' | 'ringing' | 'connected' | 'connecting'
  const [callType, setCallType] = useState(null); // 'incoming' | 'outgoing' | null
  const [callPartner, setCallPartner] = useState(null); // { peerId, name }
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  
  const [isAutoPilotVoice, setIsAutoPilotVoice] = useState(() => {
    return localStorage.getItem('p2p_isAutoPilotVoice') === 'true';
  });

  const [ttsEngine, setTtsEngine] = useState(() => {
    return localStorage.getItem('p2p_ttsEngine') || 'alltalk';
  });
  const [allTalkUrl, setAllTalkUrl] = useState(() => {
    return localStorage.getItem('p2p_allTalkUrl') || 'http://localhost:7851';
  });
  const [allTalkVoice, setAllTalkVoice] = useState(() => {
    return localStorage.getItem('p2p_allTalkVoice') || 'szabo.wav';
  });
  const [whisperUrl, setWhisperUrl] = useState(() => {
    return localStorage.getItem('p2p_whisperUrl') || 'http://localhost:9000/v1/audio/transcriptions';
  });
  const [whisperModel, setWhisperModel] = useState(() => {
    return localStorage.getItem('p2p_whisperModel') || 'whisper-1';
  });
  const [vadThreshold, setVadThreshold] = useState(() => {
    const val = localStorage.getItem('p2p_vadThreshold');
    return val !== null ? parseFloat(val) : 0.015;
  });
  const [vadSilenceMs, setVadSilenceMs] = useState(() => {
    const val = localStorage.getItem('p2p_vadSilenceMs');
    return val !== null ? parseInt(val) : 1500;
  });

  /* ── Refs ────────────────────────────────────────────── */
  const peerRef = useRef(null);
  const clientConnsRef = useRef({});   // host: { peerId → conn }
  const hostConnRef = useRef(null); // client: conn to host
  const localIdRef = useRef(null);
  const myNameRef = useRef('');
  const membersRef = useRef([]);
  const roleRef = useRef(null);

  const callRef = useRef(null);
  const audioContextRef = useRef(null);
  const destNodeRef = useRef(null);
  const localMicStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const remoteVoiceProcessorRef = useRef(null);

  /* ── Helpers ─────────────────────────────────────────── */
  const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const pushMsg = useCallback((msg) => {
    setMessages(prev => [...prev, { ...msg, id: uid() }]);
  }, []);

  const pushSystem = useCallback((text) => {
    pushMsg({ type: 'system', text, timestamp: Date.now() });
  }, [pushMsg]);

  const syncMembers = (updater) => {
    setMembers(prev => {
      const next = updater(prev);
      membersRef.current = next;
      return next;
    });
  };

  // A helper to monitor ice connection state on a connection
  const monitorIceState = useCallback((conn, targetName) => {
    let checkCount = 0;
    const interval = setInterval(() => {
      checkCount++;
      const pc = conn.peerConnection;
      if (pc) {
        clearInterval(interval);
        pc.addEventListener('iceconnectionstatechange', () => {
          if (pc.iceConnectionState === 'failed') {
            console.warn(`ICE connection failed for ${targetName}`);
            pushSystem(`ICE connection failed for ${targetName}. Your network may require a TURN server.`);
            setRoomError('ICE connection failed. A TURN server may be required (see Network Settings).');
          }
        });
      }
      if (checkCount > 40) {
        clearInterval(interval);
      }
    }, 250);
  }, [pushSystem]);

  /* ── HOST: broadcast ─────────────────────────────────── */
  const broadcastToClients = useCallback((data, excludeId = null) => {
    const raw = typeof data === 'string' ? data : JSON.stringify(data);
    Object.entries(clientConnsRef.current).forEach(([pid, conn]) => {
      if (pid !== excludeId && conn.open) conn.send(raw);
    });
  }, []);

  /* ── HOST: wire incoming client connection ───────────── */
  const wireClientConn = useCallback((conn) => {
    const peerId = conn.peer;
    let handshakeDone = false;

    conn.on('open', () => {
      clientConnsRef.current[peerId] = conn;
      // Send current member list (including host)
      conn.send(JSON.stringify({
        type: 'member-list',
        members: [
          { peerId: localIdRef.current, name: myNameRef.current },
          ...membersRef.current,
        ],
      }));
    });

    conn.on('data', (raw) => {
      let msg; try { msg = JSON.parse(raw); } catch { return; }

      if (!handshakeDone) {
        if (msg.type !== 'join') return;
        handshakeDone = true;
        const newMember = { peerId, name: msg.name };
        syncMembers(prev => [...prev, newMember]);
        broadcastToClients({ type: 'member-join', peerId, name: msg.name }, peerId);
        pushSystem(`${msg.name} joined`);
        return;
      }

      if (msg.type === 'chat') {
        pushMsg({ ...msg, isLocal: false });
        broadcastToClients(raw, peerId);
      }
    });

    conn.on('close', () => {
      const m = membersRef.current.find(x => x.peerId === peerId);
      const name = m?.name ?? peerId.slice(0, 8);
      delete clientConnsRef.current[peerId];
      syncMembers(prev => prev.filter(x => x.peerId !== peerId));
      broadcastToClients({ type: 'member-leave', peerId, name });
      pushSystem(`${name} left`);
    });

    conn.on('error', () => { delete clientConnsRef.current[peerId]; });
  }, [broadcastToClients, pushMsg, pushSystem]);

  /* ── CLIENT: handle data from host ──────────────────── */
  const handleHostData = useCallback((raw) => {
    let msg; try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'member-list':
        syncMembers(() => msg.members.filter(m => m.peerId !== localIdRef.current));
        break;
      case 'member-join':
        if (msg.peerId === localIdRef.current) break;
        syncMembers(prev =>
          prev.find(m => m.peerId === msg.peerId) ? prev : [...prev, { peerId: msg.peerId, name: msg.name }]
        );
        pushSystem(`${msg.name} joined`);
        break;
      case 'member-leave':
        syncMembers(prev => prev.filter(m => m.peerId !== msg.peerId));
        pushSystem(`${msg.name} left`);
        break;
      case 'chat':
        pushMsg({ ...msg, isLocal: false });
        break;
    }
  }, [pushMsg, pushSystem]);

  /* ── PUBLIC: Initialize peer (called from setup screen) ── */
  const initPeer = useCallback((desiredId, name) => {
    if (peerRef.current) return;
    setInitError(null);

    const iceServers = [];
    if (iceConfig.useCustom) {
      if (iceConfig.stunUrls) {
        const urls = iceConfig.stunUrls
          .split('\n')
          .map(u => u.trim())
          .filter(Boolean);
        if (urls.length > 0) {
          iceServers.push({ urls });
        }
      }
      if (iceConfig.turnUrl) {
        const turnServer = {
          urls: iceConfig.turnUrl.trim(),
        };
        if (iceConfig.turnUsername) {
          turnServer.username = iceConfig.turnUsername.trim();
        }
        if (iceConfig.turnCredential) {
          turnServer.credential = iceConfig.turnCredential.trim();
        }
        iceServers.push(turnServer);
      }
    } else {
      iceServers.push({
        urls: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
          'stun:stun.services.mozilla.com'
        ]
      });
    }

    const peer = new Peer(desiredId?.trim() || undefined, {
      debug: 0,
      config: {
        iceServers,
        sdpSemantics: 'unified-plan',
      }
    });
    peerRef.current = peer;

    peer.on('open', (id) => {
      setLocalId(id);
      localIdRef.current = id;
      setMyName(name.trim());
      myNameRef.current = name.trim();
      setPeerReady(true);

      // Save identity to localStorage
      localStorage.setItem('p2p_myName', name.trim());
      localStorage.setItem('p2p_localId', id);
    });

    peer.on('connection', (conn) => {
      if (roleRef.current === 'host') {
        monitorIceState(conn, conn.peer?.slice(0, 8) || 'incoming peer');
        wireClientConn(conn);
      } else {
        conn.on('open', () => conn.close());
      }
    });

    peer.on('call', (incomingCall) => {
      if (callRef.current) {
        console.warn('[Peer] Already in a call. Declining incoming call from:', incomingCall.peer);
        incomingCall.close();
        return;
      }
      console.log('[Peer] Incoming media call from:', incomingCall.peer);
      callRef.current = incomingCall;
      const caller = membersRef.current.find(m => m.peerId === incomingCall.peer) || { peerId: incomingCall.peer, name: 'Remote Peer' };
      setCallPartner({ peerId: incomingCall.peer, name: caller.name });
      setCallType('incoming');
      setCallStatus('ringing');
    });

    peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        setInitError('That ID is already taken. Try a different one.');
        peer.destroy();
        peerRef.current = null;
        // Clean localStorage if login failed due to taken ID
        localStorage.removeItem('p2p_localId');
      } else if (!peerReady) {
        setInitError(err.message ?? 'Connection error');
        peer.destroy();
        peerRef.current = null;
      } else {
        setRoomError(err.type === 'peer-unavailable'
          ? 'Room not found. Check the Room ID.'
          : err.message ?? 'Error');
      }
    });

    peer.on('disconnected', () => { if (!peer.destroyed) peer.reconnect(); });
  }, [wireClientConn, peerReady, iceConfig, monitorIceState]);

  /* ── PUBLIC: Create room ─────────────────────────────── */
  const createRoom = useCallback(() => {
    if (!localIdRef.current) return;
    setRole('host'); roleRef.current = 'host';
    setRoomId(localIdRef.current);
    setMembers([]); membersRef.current = [];
    setMessages([]);
    setRoomError(null);
    pushSystem('Room created. Share the Room ID with others.');

    // Save active room status to localStorage
    localStorage.setItem('p2p_activeRole', 'host');
    localStorage.setItem('p2p_activeRoomId', localIdRef.current);
  }, [pushSystem]);

  /* ── PUBLIC: Join room ───────────────────────────────── */
  const joinRoom = useCallback((targetId) => {
    if (!peerRef.current || !targetId?.trim()) return;
    setRoomError(null);

    const conn = peerRef.current.connect(targetId.trim(), { reliable: true });
    hostConnRef.current = conn;
    monitorIceState(conn, `host (${targetId.trim().slice(0, 8)})`);

    conn.on('open', () => {
      setRole('client'); roleRef.current = 'client';
      setRoomId(targetId.trim());
      setMessages([]);
      conn.send(JSON.stringify({ type: 'join', name: myNameRef.current }));

      // Save active room status to localStorage
      localStorage.setItem('p2p_activeRole', 'client');
      localStorage.setItem('p2p_activeRoomId', targetId.trim());
    });

    conn.on('data', handleHostData);

    conn.on('close', () => {
      pushSystem('Disconnected from host');
      setRole(null); roleRef.current = null;
      setRoomId(null); setMembers([]); membersRef.current = [];
      hostConnRef.current = null;

      // Clear active room status
      localStorage.removeItem('p2p_activeRole');
      localStorage.removeItem('p2p_activeRoomId');
    });

    conn.on('error', () => {
      setRoomError('Could not connect. Check the Room ID.');
      setRole(null); roleRef.current = null;
      setRoomId(null);
      hostConnRef.current = null;

      localStorage.removeItem('p2p_activeRole');
      localStorage.removeItem('p2p_activeRoomId');
    });
  }, [handleHostData, pushSystem, monitorIceState]);

  /* ── PUBLIC: Send message ────────────────────────────── */
  const sendMessage = useCallback((text) => {
    if (!text.trim()) return false;
    const msg = {
      type: 'chat', text: text.trim(),
      senderId: localIdRef.current, senderName: myNameRef.current,
      timestamp: Date.now(), isLocal: true,
    };
    if (roleRef.current === 'host') {
      pushMsg(msg); broadcastToClients(msg); return true;
    }
    if (roleRef.current === 'client' && hostConnRef.current?.open) {
      pushMsg(msg);
      hostConnRef.current.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }, [pushMsg, broadcastToClients]);

  const updateIsAutoPilotVoice = useCallback((val) => {
    setIsAutoPilotVoice(val);
    localStorage.setItem('p2p_isAutoPilotVoice', val ? 'true' : 'false');
  }, []);

  const updateTtsEngine = useCallback((val) => {
    setTtsEngine(val);
    localStorage.setItem('p2p_ttsEngine', val);
  }, []);

  const updateAllTalkUrl = useCallback((val) => {
    setAllTalkUrl(val);
    localStorage.setItem('p2p_allTalkUrl', val);
  }, []);

  const updateAllTalkVoice = useCallback((val) => {
    setAllTalkVoice(val);
    localStorage.setItem('p2p_allTalkVoice', val);
  }, []);

  const updateWhisperUrl = useCallback((val) => {
    setWhisperUrl(val);
    localStorage.setItem('p2p_whisperUrl', val);
  }, []);

  const updateWhisperModel = useCallback((val) => {
    setWhisperModel(val);
    localStorage.setItem('p2p_whisperModel', val);
  }, []);

  const updateVadThreshold = useCallback((val) => {
    setVadThreshold(val);
    localStorage.setItem('p2p_vadThreshold', val.toString());
  }, []);

  const updateVadSilenceMs = useCallback((val) => {
    setVadSilenceMs(val);
    localStorage.setItem('p2p_vadSilenceMs', val.toString());
  }, []);

  /* ── Call Control Logic ──────────────────────────────── */
  const handleCallTermination = useCallback(() => {
    if (remoteVoiceProcessorRef.current) {
      remoteVoiceProcessorRef.current.destroy();
      remoteVoiceProcessorRef.current = null;
    }
    if (localMicStreamRef.current) {
      localMicStreamRef.current.getTracks().forEach(t => t.stop());
      localMicStreamRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    destNodeRef.current = null;
    callRef.current = null;
    setCallStatus('idle');
    setCallType(null);
    setCallPartner(null);
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  const handleRemoteSpeech = useCallback((text) => {
    if (!text.trim()) return;
    const msg = {
      type: 'voice-transcript',
      text: text.trim(),
      senderId: callPartner?.peerId || 'remote-peer',
      senderName: callPartner?.name || 'Remote Peer',
      timestamp: Date.now(),
      isLocal: false,
      isTranscript: true
    };
    pushMsg(msg);
  }, [callPartner, pushMsg]);

  const playRemoteStream = useCallback((rStream) => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
    }
    const audio = new Audio();
    audio.srcObject = rStream;
    audio.play().catch(e => console.error('[Call] Error playing remote audio:', e));
    remoteAudioRef.current = audio;
  }, []);

  const startRemoteVoiceProcessor = useCallback((rStream) => {
    if (remoteVoiceProcessorRef.current) {
      remoteVoiceProcessorRef.current.destroy();
    }
    const settings = {
      whisperUrl: localStorage.getItem('p2p_whisperUrl') || 'http://localhost:9000/v1/audio/transcriptions',
      whisperModel: localStorage.getItem('p2p_whisperModel') || 'whisper-1',
      vadThreshold: parseFloat(localStorage.getItem('p2p_vadThreshold') || '0.015'),
      vadSilenceMs: parseInt(localStorage.getItem('p2p_vadSilenceMs') || '1500')
    };
    remoteVoiceProcessorRef.current = new RemoteVoiceProcessor(rStream, handleRemoteSpeech, settings);
  }, [handleRemoteSpeech]);

  const injectTTSAudio = useCallback(async (text) => {
    if (!audioContextRef.current || !destNodeRef.current) {
      console.warn('[TTS Injection] Call inactive or AudioContext not ready.');
      return;
    }
    try {
      const engine = localStorage.getItem('p2p_ttsEngine') || 'alltalk';
      const voiceId = localStorage.getItem('p2p_allTalkVoice') || 'szabo.wav';
      const allTalkBaseUrl = localStorage.getItem('p2p_allTalkUrl') || 'http://localhost:7851';

      const url = `/api/tts?engine=${engine}&voiceId=${encodeURIComponent(voiceId)}&allTalkUrl=${encodeURIComponent(allTalkBaseUrl)}&text=${encodeURIComponent(text)}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error(`TTS HTTP error: ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      const sourceNode = audioContextRef.current.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(destNodeRef.current);
      sourceNode.connect(audioContextRef.current.destination);
      sourceNode.start(0);
      console.log('[TTS] Audio successfully injected into the stream.');
    } catch (e) {
      console.error('[TTS] Failed to inject audio:', e);
    }
  }, []);

  const startCall = useCallback(async (targetPeerId, partnerName, aiOnly = false) => {
    if (!peerRef.current) return;
    setCallStatus('connecting');
    setCallType('outgoing');
    setCallPartner({ peerId: targetPeerId, name: partnerName });

    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioCtx;
      
      const destNode = audioCtx.createMediaStreamDestination();
      destNodeRef.current = destNode;

      if (!aiOnly) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localMicStreamRef.current = micStream;
          const micSource = audioCtx.createMediaStreamSource(micStream);
          micSource.connect(destNode);
          micStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
        } catch (e) {
          console.warn('Mic access denied, starting call with empty audio stream.');
          pushSystem('Microphone permission denied. Starting call in AI-only mode.');
        }
      }

      setLocalStream(destNode.stream);

      const call = peerRef.current.call(targetPeerId, destNode.stream);
      callRef.current = call;

      call.on('stream', (rStream) => {
        setRemoteStream(rStream);
        setCallStatus('connected');
        playRemoteStream(rStream);
        startRemoteVoiceProcessor(rStream);
      });

      call.on('close', () => handleCallTermination());
      call.on('error', (err) => {
        console.error('[Call] PeerJS call error:', err);
        handleCallTermination();
      });
    } catch (err) {
      console.error('[Call] Failed to initialize call:', err);
      handleCallTermination();
    }
  }, [isMuted, playRemoteStream, startRemoteVoiceProcessor, handleCallTermination, pushSystem]);

  const acceptCall = useCallback(async (aiOnly = false) => {
    const call = callRef.current;
    if (!call) return;
    setCallStatus('connecting');

    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioCtx;
      
      const destNode = audioCtx.createMediaStreamDestination();
      destNodeRef.current = destNode;

      if (!aiOnly) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localMicStreamRef.current = micStream;
          const micSource = audioCtx.createMediaStreamSource(micStream);
          micSource.connect(destNode);
          micStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
        } catch (e) {
          console.warn('Mic access denied, answering call with empty audio stream.');
          pushSystem('Microphone permission denied. Answering call in AI-only mode.');
        }
      }

      setLocalStream(destNode.stream);
      call.answer(destNode.stream);
      setCallStatus('connected');

      call.on('stream', (rStream) => {
        setRemoteStream(rStream);
        playRemoteStream(rStream);
        startRemoteVoiceProcessor(rStream);
      });

      call.on('close', () => handleCallTermination());
      call.on('error', (err) => {
        console.error('[Call] Call error on incoming call:', err);
        handleCallTermination();
      });
    } catch (err) {
      console.error('[Call] Failed to answer call:', err);
      handleCallTermination();
    }
  }, [isMuted, playRemoteStream, startRemoteVoiceProcessor, handleCallTermination, pushSystem]);

  const declineCall = useCallback(() => {
    if (callRef.current) {
      callRef.current.close();
    }
    handleCallTermination();
  }, [handleCallTermination]);

  const endCall = useCallback(() => {
    if (callRef.current) {
      callRef.current.close();
    }
    handleCallTermination();
  }, [handleCallTermination]);

  useEffect(() => {
    if (localMicStreamRef.current) {
      localMicStreamRef.current.getAudioTracks().forEach(t => t.enabled = !isMuted);
    }
  }, [isMuted]);



  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        setIsAutoPilotVoice(prev => {
          const next = !prev;
          localStorage.setItem('p2p_isAutoPilotVoice', next ? 'true' : 'false');
          console.log(`%c[Voice AutoPilot] ${next ? '🟢 ACTIVATED' : '🔴 DEACTIVATED'}`, 'color: #8b5cf6; font-weight: bold;');
          return next;
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* ── PUBLIC: Leave room ──────────────────────────────── */
  const leaveRoom = useCallback(() => {
    handleCallTermination();
    if (roleRef.current === 'host') {
      Object.values(clientConnsRef.current).forEach(c => c.close());
      clientConnsRef.current = {};
    } else if (hostConnRef.current) {
      hostConnRef.current.close();
      hostConnRef.current = null;
    }
    setRole(null); roleRef.current = null;
    setRoomId(null); setMembers([]); membersRef.current = [];
    setMessages([]); setRoomError(null);

    // Clear active room status on leave
    localStorage.removeItem('p2p_activeRole');
    localStorage.removeItem('p2p_activeRoomId');
  }, [handleCallTermination]);

  /* ── PUBLIC: Disconnect Node ─────────────────────────── */
  const disconnectNode = useCallback(() => {
    leaveRoom();
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    setLocalId(null);
    localIdRef.current = null;
    setMyName('');
    myNameRef.current = '';
    setPeerReady(false);

    localStorage.removeItem('p2p_myName');
    localStorage.removeItem('p2p_localId');
  }, [leaveRoom]);

  const clearRoomError = useCallback(() => setRoomError(null), []);
  const clearInitError = useCallback(() => setInitError(null), []);

  /* ── AUTO RECOVERY ON PAGE REFRESH (F5) ──────────────── */
  useEffect(() => {
    const savedName = localStorage.getItem('p2p_myName');
    const savedId = localStorage.getItem('p2p_localId');

    if (savedName && savedId) {
      // Re-initialize Peer using the saved custom ID & Name
      initPeer(savedId, savedName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconnect to active room after Peer is ready
  useEffect(() => {
    if (!peerReady) return;

    const savedRole = localStorage.getItem('p2p_activeRole');
    const savedRoomId = localStorage.getItem('p2p_activeRoomId');

    if (savedRole && savedRoomId) {
      if (savedRole === 'host') {
        createRoom();
      } else if (savedRole === 'client') {
        joinRoom(savedRoomId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerReady]);

  return (
    <PeerContext.Provider value={{
      localId, myName, peerReady, initError, initPeer, clearInitError,
      role, roomId, members, messages, roomError,
      createRoom, joinRoom, sendMessage, leaveRoom, clearRoomError,
      disconnectNode, iceConfig, updateIceConfig,

      // Call State & Operations
      callStatus, callType, callPartner, localStream, remoteStream,
      isMuted, setIsMuted, isAutoPilotVoice, updateIsAutoPilotVoice,

      // TTS & STT Settings
      ttsEngine, updateTtsEngine,
      allTalkUrl, updateAllTalkUrl,
      allTalkVoice, updateAllTalkVoice,
      whisperUrl, updateWhisperUrl,
      whisperModel, updateWhisperModel,
      vadThreshold, updateVadThreshold,
      vadSilenceMs, updateVadSilenceMs,

      startCall, acceptCall, declineCall, endCall, injectTTSAudio
    }}>
      {children}
    </PeerContext.Provider>
  );
}

export function usePeer() {
  const ctx = useContext(PeerContext);
  if (!ctx) throw new Error('usePeer must be used inside <PeerProvider>');
  return ctx;
}

/* ────────────────────────────────────────────────────────────
   RemoteVoiceProcessor — Local VAD + Whisper Transcription
   ──────────────────────────────────────────────────────────── */
class RemoteVoiceProcessor {
  constructor(remoteStream, onSpeechEnd, settings) {
    this.stream = remoteStream;
    this.onSpeechEnd = onSpeechEnd;
    this.settings = settings;
    
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;
    this.source.connect(this.analyser);
    
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Float32Array(this.bufferLength);
    
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.lastSpeechTime = 0;
    this.isSpeaking = false;
    this.checkInterval = null;
    
    this.startLoop();
  }
  
  startLoop() {
    const threshold = this.settings.vadThreshold || 0.015;
    const silenceMs = this.settings.vadSilenceMs || 1500;
    
    this.checkInterval = setInterval(() => {
      if (this.audioContext.state === 'suspended') return;
      
      this.analyser.getFloatTimeDomainData(this.dataArray);
      
      let sum = 0;
      for (let i = 0; i < this.bufferLength; i++) {
        sum += this.dataArray[i] * this.dataArray[i];
      }
      const rms = Math.sqrt(sum / this.bufferLength);
      const now = Date.now();
      
      if (rms > threshold) {
        this.lastSpeechTime = now;
        if (!this.isSpeaking) {
          console.log('[VAD] Speech started (RMS:', rms.toFixed(4), ')');
          this.isSpeaking = true;
          this.startRecording();
        }
      } else {
        if (this.isSpeaking && (now - this.lastSpeechTime > silenceMs)) {
          console.log('[VAD] Silence timeout reached. Speech ended.');
          this.isSpeaking = false;
          this.stopRecording();
        }
      }
    }, 100);
  }
  
  startRecording() {
    try {
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: 'audio/webm' });
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };
      
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.transcribeAudio(audioBlob);
      };
      
      this.mediaRecorder.start();
      this.isRecording = true;
    } catch (e) {
      console.error('[VAD] Failed to start MediaRecorder:', e);
    }
  }
  
  stopRecording() {
    if (this.isRecording && this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        console.error('[VAD] Error stopping MediaRecorder:', e);
      }
      this.isRecording = false;
    }
  }
  
  async transcribeAudio(audioBlob) {
    console.log('[Whisper] Sending audio chunk to local Whisper API...');
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'speech.webm');
      formData.append('model', this.settings.whisperModel || 'whisper-1');
      formData.append('language', 'hu');

      const res = await fetch(this.settings.whisperUrl, {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) throw new Error(`Whisper server returned ${res.status}`);
      const data = await res.json();
      const text = data.text?.trim() || '';
      console.log('[Whisper] Transcribed text:', text);
      if (text) {
        this.onSpeechEnd(text);
      }
    } catch (e) {
      console.error('[Whisper] Transcription failed:', e);
    }
  }
  
  destroy() {
    clearInterval(this.checkInterval);
    this.stopRecording();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
    }
  }
}
