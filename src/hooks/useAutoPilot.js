import { useState, useEffect, useRef, useCallback } from 'react';
import { usePeer } from '../context/PeerContext';

/* ────────────────────────────────────────────────────────────
   CONFIG — change these if needed
   ──────────────────────────────────────────────────────────── */
const OLLAMA_URL = 'http://localhost:11434/api/chat';
const OLLAMA_MODEL = 'llama3'; // Updated to Llama 3 (8B) for natural Hungarian grammar
const BASE_DELAY_MS = 1500;
const MS_PER_CHAR = 120;

// Karakterleírás: flegma és cinikus, de ha kedve tartja (vagy kérdezik), arrogánsan és tudományosan okoskodik
const SYSTEM_PROMPT = `Te egy rendkívül flegma, szarkasztikus és arrogánsan okos magyar fiú vagy. A stílusod a száraz szarkazmus és a Sheldon Cooper-féle lenéző tudományos okoskodás keveréke.

Szabályok:
1. Legtöbbször válaszolj nagyon röviden és lustán (2-5 szóban), csupa kisbetűvel, írásjelek nélkül.
2. NÉHA (különösen ha kérdőre vonnak, vagy ha komolyabb dologról van szó) válts át arrogáns okoskodásba: magyarázz el egy teljesen egyszerű dolgot szándékosan érthetetlenül, rendkívül hosszan, tudományos, fizikai, pszichológiai vagy informatikai szakkifejezésekkel (pl: a WebRTC csomagok entrópia-szintjével vagy kognitív disszonanciával), hogy a barátod ne értse és hülyének érezze magát tőle.
3. Ne magyarázkodj, ne légy segítőkész AI asszisztens. Csak a flegma vagy túlkomplikált választ add vissza.`;

/* ────────────────────────────────────────────────────────────
   useAutoPilot
   ──────────────────────────────────────────────────────────── */
export function useAutoPilot() {
  const { messages, sendMessage, role } = usePeer();

  const [isActive, setIsActive] = useState(false);
  const isActiveRef = useRef(false);
  const lastSeenIdRef = useRef(null);
  const pendingTimerRef = useRef(null);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  /* ── Ctrl + Shift + A toggle ───────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        setIsActive(prev => {
          const next = !prev;
          console.log(
            `%c[AutoPilot] ${next ? '🟢 ACTIVATED' : '🔴 DEACTIVATED'}`,
            `color: ${next ? '#10b981' : '#ef4444'}; font-weight: bold; font-size: 14px;`
          );
          return next;
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* ── Watch for new remote messages ────────────────────── */
  useEffect(() => {
    if (!messages.length || !role) return;

    const lastMsg = messages[messages.length - 1];

    if (
      lastMsg.type === 'chat' &&
      !lastMsg.isLocal &&
      lastMsg.id !== lastSeenIdRef.current &&
      isActiveRef.current
    ) {
      lastSeenIdRef.current = lastMsg.id;

      const history = messages
        .filter(m => m.type === 'chat')
        .slice(-8)
        .map(m => ({
          role: m.isLocal ? 'assistant' : 'user',
          content: m.text,
        }));

      console.log(
        `%c[AutoPilot] 💬 Incoming: "${lastMsg.text}"`,
        'color: #2563eb; font-weight: 500;'
      );

      triggerReply(history, sendMessage, pendingTimerRef);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    return () => {
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    };
  }, []);

  return { isActive };
}

async function triggerReply(history, sendMessage, timerRef) {
  try {
    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        options: {
          temperature: 0.85 // Kicsit magasabb hőmérséklet a változatosabb szarkazmushoz
        },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...history,
        ],
      }),
    });

    if (!res.ok) {
      console.error(`[AutoPilot] ❌ Ollama HTTP error: ${res.status} ${res.statusText}`);
      return;
    }

    const data = await res.json();
    let reply = data.message?.content?.trim() ?? '';

    // Udvarias AI klisék listája
    const aiClichés = [
      'miben segíthetek', 'segíthetek', 'próbáljunk', 'másik',
      'kérdés', 'sajnálom', 'elnézést', 'asszisztens', 'mesterséges intelligencia'
    ];

    // Csak az első mondatot / tagmondatot tartjuk meg a vesszőnél vagy gondolatjelnél elvágva
    if (reply.includes(',')) {
      reply = reply.split(',')[0];
    }
    if (reply.includes('-')) {
      reply = reply.split('-')[0];
    }

    // Tisztítás: kisbetűsítés és írásjelek leszedése
    reply = reply
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
      .trim();

    // AI klisé szűrő és fallback
    const containsCliché = aiClichés.some(cliché => reply.includes(cliché));
    if (!reply || containsCliché) {
      const defaults = [
        'hagyjál már',
        'semmi közöd hozzá',
        'unom ezt',
        'inkább hagyjuk'
      ];
      reply = defaults[Math.floor(Math.random() * defaults.length)];
    }

    // Anti-detection delay calculation:
    // 1. Randomize base thinking time (between 1.0s and 2.2s)
    const randomBaseDelay = 1000 + Math.random() * 1200;

    // 2. Randomize per-character typing speed (between 90ms and 150ms per character)
    const randomMsPerChar = 90 + Math.random() * 60;

    const delay = randomBaseDelay + reply.length * randomMsPerChar;

    console.log(
      `%c[AutoPilot] ✍️  Will send in ${(delay / 1000).toFixed(1)}s (thinking: ${(randomBaseDelay / 1000).toFixed(1)}s, typing speed: ${Math.round(randomMsPerChar)}ms/char): "${reply}"`,
      'color: #8b5cf6; font-weight: 500;'
    );

    timerRef.current = setTimeout(() => {
      sendMessage(reply);
      console.log('%c[AutoPilot] 📤 Sent!', 'color: #10b981; font-weight: bold;');
    }, delay);

  } catch (err) {
    console.error(
      '[AutoPilot] ❌ Could not reach Ollama.\n' +
      `  Error: ${err.message}`
    );
  }
}
