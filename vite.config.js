import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'tts-proxy',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/api/tts')) {
            const urlObj = new URL(req.url, 'http://localhost');
            const text = urlObj.searchParams.get('text') || '';
            const engine = urlObj.searchParams.get('engine') || 'google';
            const voiceId = urlObj.searchParams.get('voiceId') || 'szabo.wav';
            const allTalkUrl = urlObj.searchParams.get('allTalkUrl') || 'http://localhost:7851';

            if (engine === 'alltalk') {
              try {
                // AllTalk TTS streaming endpoint
                const targetUrl = `${allTalkUrl}/api/tts-generate-streaming?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voiceId)}&language=hu&output_file_name=p2p_chat_tts`;
                const response = await fetch(targetUrl);
                if (!response.ok) {
                  res.statusCode = response.status;
                  res.end(await response.text());
                  return;
                }
                const buffer = await response.arrayBuffer();
                res.setHeader('Content-Type', 'audio/wav');
                res.end(Buffer.from(buffer));
              } catch (e) {
                res.statusCode = 500;
                res.end(e.message);
              }
            } else {
              // Google TTS
              try {
                const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=hu&client=tw-ob&q=${encodeURIComponent(text)}`;
                const response = await fetch(googleTtsUrl, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                  }
                });
                if (!response.ok) {
                  res.statusCode = response.status;
                  res.end();
                  return;
                }
                const buffer = await response.arrayBuffer();
                res.setHeader('Content-Type', 'audio/mpeg');
                res.end(Buffer.from(buffer));
              } catch (e) {
                res.statusCode = 500;
                res.end(e.message);
              }
            }
          } else {
            next();
          }
        });
      }
    }
  ],
})
