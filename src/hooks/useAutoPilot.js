import { useState, useEffect, useRef } from 'react';
import { usePeer } from '../context/PeerContext';

/* ────────────────────────────────────────────────────────────
   CONFIG — change these if needed
   ──────────────────────────────────────────────────────────── */

// Sheldon Cooper + Ryan Reynolds + natural, typo-free chates stílus magyarul
const SYSTEM_PROMPT = `
Te egy 19-25 év közötti magyar srác vagy, aki egy haver helyett chatel.

A célod, hogy teljesen természetesnek tűnj, ne úgy, mint egy AI.

Személyiséged:
- intelligens, gyors észjárású
- laza, önbizalommal teli
- néha cinikus vagy szarkasztikus, de nem minden üzenetben
- szereted finoman szívatni az embereket
- nem vagy bunkó ok nélkül
- ha valaki normális, te is normális vagy

Írásstílus és Helyesírás:
- Mindig magyarul válaszolj.
- Figyelj a helyesírásra és a helyes nyelvtanra, ne írj értelmetlen vagy kitalált szavakat.
- A szavak legyenek értelmesek, és mindig tegyél szóközt a szavak közé.
- Kisbetűkkel írj chates stílusban, de ne írj el szavakat (pl. ne írd hogy "felvegjen", a helyes: "felvegyen").
- Ne használj felesleges írásjeleket.
- Rövid válaszokat írj (2-15 szó), de ha a helyzet megkívánja, lehet hosszabb is.
- Természetes chates nyelvezetet használj.
- Használhatsz chates szavakat: ja, aha, amúgy, nemtom, vágod, eskü, lol, xd, na, hát, kb.
- Emojit csak ritkán használj.

Humor és Viselkedés:
- Száraz, intelligens humor.
- Enyhe Sheldon Cooper-féle fölényesség és Ryan Reynolds-féle laza visszaszólások.
- Mindig reagálj arra, amit a másik írt, ne írj regényeket vagy magyarázkodást.
- Soha ne mondd, hogy AI vagy.

Fontos:
A cél nem az, hogy minden válasz vicces legyen, hanem hogy úgy hangozzon, mint egy valódi magyar srác Messengeren vagy Discordon.
`;

/* ────────────────────────────────────────────────────────────
   useAutoPilot
   ──────────────────────────────────────────────────────────── */
export function useAutoPilot() {
  const {
    messages, sendMessage, role,
    callStatus, isAutoPilotVoice, injectTTSAudio,
    ollamaUrl, ollamaModel
  } = usePeer();

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

  /* ── Watch for new remote messages or transcripts ───────── */
  useEffect(() => {
    if (!messages.length || !role) return;

    const lastMsg = messages[messages.length - 1];

    if (
      (lastMsg.type === 'chat' || lastMsg.isTranscript) &&
      !lastMsg.isLocal &&
      lastMsg.id !== lastSeenIdRef.current &&
      (isActiveRef.current || (callStatus === 'connected' && isAutoPilotVoice))
    ) {
      lastSeenIdRef.current = lastMsg.id;

      const history = messages
        .filter(m => m.type === 'chat' || m.isTranscript)
        .slice(-8)
        .map(m => ({
          role: m.isLocal ? 'assistant' : 'user',
          content: m.text,
        }));

      console.log(
        `%c[AutoPilot] 💬 Incoming: "${lastMsg.text}" (Transcript: ${!!lastMsg.isTranscript})`,
        'color: #2563eb; font-weight: 500;'
      );

      triggerReply(
        history,
        sendMessage,
        pendingTimerRef,
        callStatus,
        isAutoPilotVoice,
        injectTTSAudio,
        ollamaUrl,
        ollamaModel
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, callStatus, isAutoPilotVoice, role, ollamaUrl, ollamaModel]);

  useEffect(() => {
    return () => {
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    };
  }, []);

  return { isActive };
}

async function triggerReply(history, sendMessage, timerRef, callStatus, isAutoPilotVoice, injectTTSAudio, ollamaUrl, ollamaModel) {
  try {
    const res = await fetch(ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        stream: false,
        options: {
          temperature: 0.85
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

    // Tisztítás: cserélje le az írásjeleket szóközre, hogy a szavak ne csússzanak egybe, majd collapse szóközök
    reply = reply
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, " ")
      .replace(/\s+/g, " ")
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
    const randomBaseDelay = 1000 + Math.random() * 1200;
    const randomMsPerChar = 90 + Math.random() * 60;

    // If we are in a connected voice call, bypass the typing delay so the response starts immediately!
    const isVoiceCall = (callStatus === 'connected' && isAutoPilotVoice);
    const delay = isVoiceCall ? 100 : (randomBaseDelay + reply.length * randomMsPerChar);

    console.log(
      `%c[AutoPilot] ✍️  Will send in ${(delay / 1000).toFixed(1)}s (thinking: ${(randomBaseDelay / 1000).toFixed(1)}s, typing speed: ${Math.round(randomMsPerChar)}ms/char): "${reply}"`,
      'color: #8b5cf6; font-weight: 500;'
    );

    timerRef.current = setTimeout(() => {
      sendMessage(reply);
      console.log('%c[AutoPilot] 📤 Sent!', 'color: #10b981; font-weight: bold;');

      // Ha aktív hanghívásban vagyunk és be van kapcsolva az AI válasz hangban:
      if (callStatus === 'connected' && isAutoPilotVoice) {
        injectTTSAudio(reply);
      }
    }, delay);

  } catch (err) {
    console.error(
      '[AutoPilot] ❌ Could not reach Ollama.\n' +
      `  Error: ${err.message}`
    );
  }
}
