import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react(), {
    name: 'local-news-function',
    configureServer(server) {
      for (const endpoint of ['newsletter', 'newsletter-digest']) {
        server.middlewares.use(`/.netlify/functions/${endpoint}`, async (req, res) => {
          try {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            const { default: handler } = endpoint === 'newsletter'
              ? await import('./netlify/functions/newsletter.mjs')
              : await import('./netlify/functions/newsletter-digest.mjs');
            const response = await handler(new Request(`http://127.0.0.1/.netlify/functions/${endpoint}`, {
              method: req.method, headers: req.headers,
              ...(!['GET', 'HEAD'].includes(req.method) ? {body: Buffer.concat(chunks)} : {}),
            }));
            res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(await response.text());
          } catch (error) { console.error('Local newsletter:',error.name,error.message);res.writeHead(503, {'Content-Type':'application/json'});res.end(JSON.stringify({enabled:false,message:'Email delivery is temporarily unavailable.'})); }
        });
      }
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
