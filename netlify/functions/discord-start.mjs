import crypto from 'node:crypto';

const CLIENT_ID = '1548925706522730566';

const REDIRECT_URI =
  'https://sapucaia-rj-lojaa-ofical.netlify.app/api/discord-callback';

function cookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Método não permitido.', {
      status: 405
    });
  }

  const state = crypto.randomBytes(32).toString('hex');

  const authUrl = new URL(
    'https://discord.com/oauth2/authorize'
  );

  authUrl.searchParams.set(
    'client_id',
    CLIENT_ID
  );

  authUrl.searchParams.set(
    'response_type',
    'code'
  );

  authUrl.searchParams.set(
    'redirect_uri',
    REDIRECT_URI
  );

  authUrl.searchParams.set(
    'scope',
    'identify email'
  );

  authUrl.searchParams.set(
    'state',
    state
  );

  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl.toString(),
      'Cache-Control': 'no-store',
      'Set-Cookie': cookie(
        'sapucaia_oauth_state',
        state,
        600
      )
    }
  });
};
