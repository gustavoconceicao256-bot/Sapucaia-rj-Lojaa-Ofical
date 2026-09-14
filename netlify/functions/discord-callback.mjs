import crypto from 'node:crypto';

function cookie(name,value,maxAge){
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function readCookie(req,name){
  const raw=req.headers.get('cookie')||'';
  const m=raw.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : '';
}

function safeEqual(a,b){
  const aa=Buffer.from(String(a||''));
  const bb=Buffer.from(String(b||''));
  return aa.length===bb.length && crypto.timingSafeEqual(aa,bb);
}

export default async req=>{
  try{
    const u=new URL(req.url);
    const code=u.searchParams.get('code');
    const state=u.searchParams.get('state');
    const savedState=readCookie(req,'sapucaia_oauth_state');

    if(!code || !state || !savedState || !safeEqual(state,savedState)){
      return new Response('Autorização do Discord inválida ou expirada.',{status:400});
    }

    const client=String(process.env.DISCORD_CLIENT_ID||'').trim();
    const secret=String(process.env.DISCORD_CLIENT_SECRET||'').trim();
    const sessionSecret=String(process.env.DISCORD_SESSION_SECRET||'').trim();
    const redirect=String(process.env.DISCORD_REDIRECT_URI||`${u.origin}/api/discord-callback`).trim();

    if(!client || !secret || !sessionSecret){
      return new Response('Discord OAuth não configurado corretamente no servidor.',{status:503});
    }

    const tokenRes=await fetch('https://discord.com/api/oauth2/token',{
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({
        client_id:client,
        client_secret:secret,
        grant_type:'authorization_code',
        code,
        redirect_uri:redirect
      })
    });

    const tok=await tokenRes.json().catch(()=>({}));
    if(!tokenRes.ok){
      throw new Error(tok.error_description||'Falha no OAuth do Discord.');
    }

    const userRes=await fetch('https://discord.com/api/users/@me',{
      headers:{Authorization:`Bearer ${tok.access_token}`}
    });

    const user=await userRes.json().catch(()=>({}));
    if(!userRes.ok || !user.id){
      throw new Error('Não foi possível obter o usuário Discord.');
    }

    const payload=Buffer.from(JSON.stringify({
      id:String(user.id),
      username:String(user.username||''),
      global_name:String(user.global_name||user.username||''),
      email:user.email||null,
      iat:Date.now(),
      exp:Date.now()+60*60*1000
    })).toString('base64url');

    const sig=crypto
      .createHmac('sha256',sessionSecret)
      .update(payload)
      .digest('base64url');

    const html=`<!doctype html><meta charset="utf-8"><title>Discord conectado</title><script>location.replace('/?discord=connected')</script>`;
    const headers=new Headers({'content-type':'text/html; charset=utf-8'});
    headers.append('Set-Cookie',cookie('sapucaia_discord_session',`${payload}.${sig}`,3600));
    headers.append('Set-Cookie',cookie('sapucaia_oauth_state','',0));

    return new Response(html,{status:200,headers});
  }catch(e){
    console.error('discord callback error',e?.message||e);
    return new Response('Erro ao conectar o Discord.',{status:500});
  }
};
