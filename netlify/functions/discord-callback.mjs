import crypto from 'node:crypto';

const CLIENT_ID = '1548925706522730566';
const REDIRECT_URI = 'https://lojasapucaiarjofc.netlify.app/api/discord-callback';

function cookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function readCookie(req, name) {
  const raw = req.headers.get('cookie') || '';
  const m = raw.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : '';
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function base64urlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export default async (req) => {
  try {
    if (req.method !== 'GET') {
      return new Response('Método não permitido.', { status: 405 });
    }

    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const savedState = readCookie(req, 'sapucaia_oauth_state');

    if (!code || !state || !savedState || !safeEqual(state, savedState)) {
      return new Response('Autorização do Discord inválida ou expirada.', {
        status: 400,
        headers: { 'content-type': 'text/plain; charset=utf-8' }
      });
    }

    const secret = String(process.env.DISCORD_CLIENT_SECRET || '').trim();
    const sessionSecret = String(process.env.DISCORD_SESSION_SECRET || '').trim();

    if (!secret || !sessionSecret) {
      console.error('Discord OAuth incompleto: falta DISCORD_CLIENT_SECRET ou DISCORD_SESSION_SECRET.');
      return new Response('Discord OAuth não configurado corretamente no servidor.', { status: 503 });
    }

    const tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: secret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI
      }).toString()
    });

    const tokenBody = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokenBody.access_token) {
      console.error('Discord token exchange failed:', tokenBody);
      return new Response('Não foi possível concluir a autorização do Discord.', { status: 502 });
    }

    const userRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${tokenBody.access_token}` }
    });

    const user = await userRes.json().catch(() => ({}));
    if (!userRes.ok || !user.id) {
      console.error('Discord user lookup failed:', user);
      return new Response('Não foi possível obter o usuário do Discord.', { status: 502 });
    }

    const now = Date.now();
    const payload = base64urlJson({
      id: String(user.id),
      username: String(user.username || ''),
      global_name: String(user.global_name || user.username || ''),
      email: user.email || null,
      iat: now,
      exp: now + 60 * 60 * 1000
    });

    const signature = crypto
      .createHmac('sha256', sessionSecret)
      .update(payload)
      .digest('base64url');

    const headers = new Headers({
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store'
    });
    headers.append(
      'Set-Cookie',
      cookie('sapucaia_discord_session', `${payload}.${signature}`, 3600)
    );
    headers.append('Set-Cookie', cookie('sapucaia_oauth_state', '', 0));

    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Discord conectado</title></head><body style="background:#06060a;color:#fff;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh"><div>Discord conectado. Redirecionando…</div><script>location.replace('/?discord=connected')</script></body></html>`;

    return new Response(html, { status: 200, headers });
  } catch (error) {
    console.error('discord-callback error:', error?.stack || error?.message || error);
    return new Response('Erro ao conectar o Discord.', { status: 500 });
  }
};
