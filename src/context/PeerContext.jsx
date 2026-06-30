import { createContext, useContext, useRef, useState, useCallback } from 'react';
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
  const [localId,    setLocalId]    = useState(null);   // actual peer ID confirmed by relay
  const [myName,     setMyName]     = useState('');
  const [peerReady,  setPeerReady]  = useState(false);
  const [initError,  setInitError]  = useState(null);   // ID taken / relay error at setup

  /* ── Room state ──────────────────────────────────────── */
  const [role,      setRole]      = useState(null);     // 'host' | 'client' | null
  const [roomId,    setRoomId]    = useState(null);
  const [members,   setMembers]   = useState([]);       // remote peers
  const [messages,  setMessages]  = useState([]);
  const [roomError, setRoomError] = useState(null);

  /* ── Refs ────────────────────────────────────────────── */
  const peerRef        = useRef(null);
  const clientConnsRef = useRef({});   // host: { peerId → conn }
  const hostConnRef    = useRef(null); // client: conn to host
  const localIdRef     = useRef(null);
  const myNameRef      = useRef('');
  const membersRef     = useRef([]);
  const roleRef        = useRef(null);

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

    // PeerJS accepts a custom ID as first arg (undefined = random)
    const peer = new Peer(desiredId?.trim() || undefined, { debug: 0 });
    peerRef.current = peer;

    peer.on('open', (id) => {
      setLocalId(id);
      localIdRef.current = id;
      setMyName(name.trim());
      myNameRef.current = name.trim();
      setPeerReady(true);
    });

    peer.on('connection', (conn) => {
      if (roleRef.current === 'host') {
        wireClientConn(conn);
      } else {
        conn.on('open', () => conn.close());
      }
    });

    peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        setInitError('That ID is already taken. Try a different one.');
        peer.destroy();
        peerRef.current = null;
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
  }, [wireClientConn, peerReady]);

  /* ── PUBLIC: Create room ─────────────────────────────── */
  const createRoom = useCallback(() => {
    if (!localIdRef.current) return;
    setRole('host'); roleRef.current = 'host';
    setRoomId(localIdRef.current);
    setMembers([]); membersRef.current = [];
    setMessages([]);
    setRoomError(null);
    pushSystem('Room created. Share the Room ID with others.');
  }, [pushSystem]);

  /* ── PUBLIC: Join room ───────────────────────────────── */
  const joinRoom = useCallback((targetId) => {
    if (!peerRef.current || !targetId?.trim()) return;
    setRoomError(null);

    const conn = peerRef.current.connect(targetId.trim(), { reliable: true });
    hostConnRef.current = conn;

    conn.on('open', () => {
      setRole('client'); roleRef.current = 'client';
      setRoomId(targetId.trim());
      setMessages([]);
      conn.send(JSON.stringify({ type: 'join', name: myNameRef.current }));
    });

    conn.on('data', handleHostData);

    conn.on('close', () => {
      pushSystem('Disconnected from host');
      setRole(null); roleRef.current = null;
      setRoomId(null); setMembers([]); membersRef.current = [];
      hostConnRef.current = null;
    });

    conn.on('error', () => {
      setRoomError('Could not connect. Check the Room ID.');
      setRole(null); roleRef.current = null;
      setRoomId(null);
      hostConnRef.current = null;
    });
  }, [handleHostData, pushSystem]);

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

  /* ── PUBLIC: Leave room ──────────────────────────────── */
  const leaveRoom = useCallback(() => {
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
  }, []);

  const clearRoomError = useCallback(() => setRoomError(null), []);
  const clearInitError = useCallback(() => setInitError(null), []);

  return (
    <PeerContext.Provider value={{
      localId, myName, peerReady, initError, initPeer, clearInitError,
      role, roomId, members, messages, roomError,
      createRoom, joinRoom, sendMessage, leaveRoom, clearRoomError,
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
