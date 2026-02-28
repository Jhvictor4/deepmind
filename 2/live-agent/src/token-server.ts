/**
 * Simple HTTP token server for LiveKit room access.
 * The Chrome extension calls POST /token to get an access token
 * so it can join the same LiveKit room as the agent.
 *
 * Run alongside the agent: node dist/token-server.js
 */

import { AccessToken } from 'livekit-server-sdk';
import { createServer } from 'node:http';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!;
const PORT = parseInt(process.env.TOKEN_PORT ?? '8081', 10);

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.error('Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET in .env.local');
  process.exit(1);
}

const server = createServer(async (req, res) => {
  // CORS headers for extension requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/token') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }

    try {
      const { identity, name, room } = JSON.parse(body);
      const roomName = room || 'safenav';

      const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: identity || 'safenav-extension',
        name: name || 'SafeNav Browser',
      });

      // Grant permissions: join specific room, publish tracks, subscribe to data
      token.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: true,   // extension needs to publish screen share
        canSubscribe: true, // extension needs to receive data channel messages
        canPublishData: true,
      });

      const jwt = await token.toJwt();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ token: jwt }));

      console.log(`🎫 Token issued for identity="${identity || 'safenav-extension'}" room="${roomName}"`);
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(err) }));
    }
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`🎫 LiveKit Token Server running on http://localhost:${PORT}`);
  console.log(`   POST /token  — issue access token`);
  console.log(`   GET  /health — health check`);
});
