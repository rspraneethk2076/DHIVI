import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react(), {
    name: 'local-news-function',
    configureServer(server) {
      server.middlewares.use('/.netlify/functions/news', async (req, res) => {
        try {
          const { default: handler } = await import('./netlify/functions/news.mjs');
          const response = await handler(new Request('http://localhost/.netlify/functions/news'));
          res.writeHead(response.status, Object.fromEntries(response.headers));
          res.end(await response.text());
        } catch (error) {
          console.error('Local news feed:', error.message);
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'News sources are temporarily unavailable. Please try again shortly.' }));
        }
      });
    }
  }]
});
