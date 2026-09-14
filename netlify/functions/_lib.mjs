import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

export function store(name='sapucaia'){ return getStore(name); }
export async function getJSON(storeName,key,fallback=null){ const v=await store(storeName).get(key,{type:'json',consistency:'strong'}); return v ?? fallback; }
export async function putJSON(storeName,key,value){ await store(storeName).setJSON(key,value); return value; }
export function json(data,status=200,extra={}){ return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8',...extra}}); }
const SECRET=()=>process.env.ADMIN_SESSION_SECRET||'CHANGE-ME-IN-NETLIFY';
export function signSession(payload){const body=Buffer.from(JSON.stringify(payload)).toString('base64url');const sig=crypto.createHmac('sha256',SECRET()).update(body).digest('base64url');return `${body}.${sig}`;}
export function readSession(req){const raw=req.headers.get('cookie')||'';const m=raw.match(/(?:^|;\s*)sapucaia_session=([^;]+)/);if(!m)return null;const token=decodeURIComponent(m[1]);const [body,sig]=token.split('.');if(!body||!sig)return null;const expected=crypto.createHmac('sha256',SECRET()).update(body).digest('base64url');if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;try{const data=JSON.parse(Buffer.from(body,'base64url').toString());if(!data.exp||Date.now()>data.exp)return null;return data;}catch{return null;}}
export function cookie(name,value,opts={}){const p=[`${name}=${value}`,'Path=/','HttpOnly','SameSite=Lax'];if(opts.maxAge!==undefined)p.push(`Max-Age=${opts.maxAge}`);if(opts.secure!==false)p.push('Secure');return p.join('; ');}
const ADMIN_KEY='admin-auth-v1';
export async function getAdminCredentials(){return getJSON('sapucaia-config',ADMIN_KEY,null)}
export async function setAdminCredentials(v){return putJSON('sapucaia-config',ADMIN_KEY,v)}
export function hashPassword(password,salt=crypto.randomBytes(16).toString('hex')){return {salt,hash:crypto.scryptSync(String(password),salt,64).toString('hex')}}
export function verifyPassword(password,stored){if(!stored?.salt||!stored?.hash)return false;try{const a=Buffer.from(crypto.scryptSync(String(password),stored.salt,64).toString('hex'),'hex');const b=Buffer.from(stored.hash,'hex');return a.length===b.length&&crypto.timingSafeEqual(a,b)}catch{return false}}
export function requireAdmin(req){const s=readSession(req);return s?.role==='admin'?s:null}

const DEFAULT_CATEGORIES=['Destaques','Edição Limitada','Planos VIP','Carros VIPS/LUXOS','Especiais','Caminhões','Aeronaves','Extras','Dinheiro','Orgs','Casas','Punições'];
const DEFAULT_SETTINGS={
  shopName:'SAPUCAIA', city:'RIO DE JANEIRO',
  primaryColor:'#ff087f', secondaryColor:'#ff4fa3', backgroundColor:'#06060a', surfaceColor:'#0d0d13', textColor:'#ffffff', mutedColor:'#a6a0aa', buttonColor:'#ff087f', buttonHoverColor:'#ff4fa3', borderColor:'#ff087f', priceColor:'#ff087f',
  banner:'https://cdn.discordapp.com/attachments/1419475351989391503/1548871829349998692/sapucaia_banner_gif.gif?ex=6aa8a2cc&is=6aa7514c&hm=21bc79c2cf4aa75140e113fc6a2a4b5a9d856040a416976297354f1f61021f60&',
  backgroundImage:'https://cdn.discordapp.com/attachments/1419475351989391503/1548871162723967026/sapucaia_rio_wallpaper-1.gif?ex=6aa8a22d&is=6aa750ad&hm=b9bcc332a0cc3bb714bf13debfe339f5d068aed3e105a9386306a96d2598f38d&', backgroundSize:'cover', backgroundOpacity:45, backgroundBlur:0, backgroundDarkness:35,
  bannerEffect:'glow-scan', bannerIntensity:70, bannerSpeed:1, bannerFit:'fill', bannerRadius:2, bannerHeight:455,
  buttonStyle:'rounded', buttonRadius:14, buttonHeight:46, buttonHoverScale:103, buttonGlow:true, buttonShadow:true, buttonBorder:true, buttonAnimation:'shine',
  headingFont:'Arial', bodyFont:'Arial', buttonFont:'Arial', headingWeight:800, headingSize:42, bodySize:14, buttonFontSize:13, letterSpacing:1,
  cardRadius:18, cardGlow:true, cardBorder:true, cardLift:8, cardPadding:16, cardImageHeight:220,
  marqueeText:'SAPUCAIA50 50% EM TODOS OS PRODUTOS', marqueeSpeed:26, marqueeGlow:true, marqueeSize:13, marqueeGap:45,
  promoEnabled:true, promoText:'50% EM TODOS OS PRODUTOS', couponCode:'SAPUCAIA50', couponPercent:50,
  categories:DEFAULT_CATEGORIES, paymentProvider:'mercadopago', fivemServerName:'SAPUCAIA', fivemWebhookUrl:'', pixEnabled:true, infinitePayEnabled:false, infinitePayHandle:'',
  contentMaxWidth:1560, sectionGap:24, productColumns:3, globalRadius:18, effectsIntensity:75, vignette:35, fxParticles:true, fxStars:true, fxGrid:true, fxNoise:true, fxCursorGlow:true, reducedMotion:false,
  heroTitle:'SAPUCAIA', heroSubtitle:'RIO DE JANEIRO', heroButtonText:'Ver produtos', heroButtonUrl:'#categorias',
  termsUrl:'terms.html', privacyUrl:'#privacidade', discordUrl:'', supportUrl:'', supportEmail:'', faq:[]
};
export async function getSettings(){const saved=await getJSON('sapucaia-config','settings',null);if(!saved)return DEFAULT_SETTINGS;return {...DEFAULT_SETTINGS,...saved,categories:Array.isArray(saved.categories)&&saved.categories.length?saved.categories:DEFAULT_CATEGORIES};}
