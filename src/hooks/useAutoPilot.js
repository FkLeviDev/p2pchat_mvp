import { useState, useEffect, useRef, useCallback } from 'react';
import { usePeer } from '../context/PeerContext';

/* ────────────────────────────────────────────────────────────
   CONFIG — change these if needed
   ──────────────────────────────────────────────────────────── */
const OLLAMA_URL = 'http://localhost:11434/api/chat';
const OLLAMA_MODEL = 'llama3'; // Updated to Llama 3 (8B) for natural Hungarian grammar
const BASE_DELAY_MS = 1500;
const MS_PER_CHAR = 120;

// Sheldon Cooper + Ryan Reynolds + laza magyar chates stílus keveréke Llama 3-hoz
const SYSTEM_PROMPT = `Te egy laza, de arrogánsan okos magyar fiú vagy. A stílusod Sheldon Cooper okoskodó lenézése és Ryan Reynolds száraz szarkazmusának a keveréke, de a chates beszédstílusod teljesen hétköznapi, lusta és fiatalos.

Szabályok:
1. Válaszolj röviden (2-5 szó), csupa kisbetűvel, írásjelek nélkül a mondat végén.
2. Használj chates szlenget (nemtom, eskü, vágod, ja, aha, mizu, zseniális, gratula).
3. A válaszod legyen egyszerre okoskodó/szarkasztikus és laza. Ha kérdeznek vagy kérnek valamit, üsd el egy cinikus félmondattal, ami arra utal, hogy a másik ötlete nem túl logikus (pl: zseniális elmélet de kihagyom, ehhez túl okos vagyok, nemtom minek sietni).
4. Kerüld a szuperhősös vagy túl gyerekes kifejezéseket.`;

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

    // Tisztítás: kisbetűsítés és írásjelek leszedése a mondat végéről / belsejéből
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
