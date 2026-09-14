import crypto from 'node:crypto';

function read(req){
  const raw=req.headers.get('cookie')||'';
  const m=raw.match(/(?:^|;\s*)sapucaia_discord_session=([^;]+)/);
  if(!m)return null;

  const token=decodeURIComponent(m[1]);
  const [body,sig]=token.split('.');
  if(!body||!sig)return null;

  const secret=String(process.env.DISCORD_SESSION_SECRET||'').trim();
  if(!secret)return null;

  const expected=crypto
    .createHmac('sha256',secret)
    .update(body)
    .digest('base64url');

  const aa=Buffer.from(sig);
  const bb=Buffer.from(expected);
  if(aa.length!==bb.length||!crypto.timingSafeEqual(aa,bb))return null;

  try{
    const data=JSON.parse(Buffer.from(body,'base64url').toString());
    if(!data.exp||Date.now()>Number(data.exp))return null;
    return data;
  }catch{
    return null;
  }
}

export default async req=>{
  const user=read(req);
  return new Response(JSON.stringify({connected:!!user,user:user||null}),{
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store'
    }
  });
};
