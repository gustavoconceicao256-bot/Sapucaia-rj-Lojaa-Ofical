import crypto from 'node:crypto';

const CLIENT_ID = '1548925706522730566';

const REDIRECT_URI =
  'https://sapucaia-rj-lojaa-ofical.netlify.app/api/discord-callback';

function cookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function createSignedState(secret) {
  const issuedAt = Date.now();
  const nonce = crypto.randomBytes(32).toString('hex');

  const payload = `${issuedAt}.${nonce}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');

  const encodedPayload = Buffer
    .from(payload, 'utf8')
    .toString('base64url');

  return `${encodedPayload}.${signature}`;
}

export default async (req) => {
  try {
    if (req.method !== 'GET') {
      return new Response('Método não permitido.', {
        status: 405
      });
    }

    const sessionSecret = String(
      process.env.DISCORD_SESSION_SECRET || ''
    ).trim();

    if (!sessionSecret) {
      console.error(
        'DISCORD_SESSION_SECRET não configurado.'
      );

      return new Response(
        'Discord OAuth não configurado corretamente no servidor.',
        { status: 503 }
      );
    }

    const state = createSignedState(sessionSecret);

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

        'Cache-Control':
          'no-store, no-cache, must-revalidate',

        'Pragma':
          'no-cache',

        'Set-Cookie':
          cookie(
            'sapucaia_oauth_state',
            state,
            600
          )
      }
    });
  } catch (error) {
    console.error(
      'discord-start error:',
      error?.stack ||
        error?.message ||
        error
    );

    return new Response(
      'Erro ao iniciar o login com Discord.',
      { status: 500 }
    );
  }
};
