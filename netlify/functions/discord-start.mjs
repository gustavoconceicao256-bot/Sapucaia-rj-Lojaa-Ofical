import crypto from 'node:crypto';

const CLIENT_ID = '1548925706522730566';
const REDIRECT_URI = 'https://lojasapucaiarjofc.netlify.app/api/discord-callback';

function cookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Método não permitido.', { status: 405 });
  }

  // Client ID and callback are fixed to the production SAPUCAIA store.
  // This prevents Netlify preview URLs from being used as the OAuth redirect.
  const client = CLIENT_ID;
  const redirect = REDIRECT_URI;

  const state = crypto.randomBytes(32).toString('hex');
  const authUrl = new URL('https://discord.com/oauth2/authorize');
  authUrl.searchParams.set('client_id', client);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', redirect);
  authUrl.searchParams.set('scope', 'identify email');
  authUrl.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl.toString(),
      'Cache-Control': 'no-store',
      'Set-Cookie': cookie('sapucaia_oauth_state', state, 600)
    }
  });
};
