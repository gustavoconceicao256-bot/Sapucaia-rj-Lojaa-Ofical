import crypto from 'node:crypto';

function cookie(name,value,maxAge){
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export default async req=>{
  const client=String(process.env.DISCORD_CLIENT_ID||'').trim();
  const redirect=String(process.env.DISCORD_REDIRECT_URI||`${new URL(req.url).origin}/api/discord-callback`).trim();

  if(!client){
    return new Response('DISCORD_CLIENT_ID não configurado.',{status:503});
  }

  const nonce=crypto.randomBytes(32).toString('hex');
  const u=new URL('https://discord.com/oauth2/authorize');
  u.searchParams.set('client_id',client);
  u.searchParams.set('response_type','code');
  u.searchParams.set('redirect_uri',redirect);
  u.searchParams.set('scope','identify email');
  u.searchParams.set('state',nonce);

  return new Response(null,{
    status:302,
    headers:{
      Location:u.toString(),
      'Set-Cookie':cookie('sapucaia_oauth_state',nonce,600)
    }
  });
};
