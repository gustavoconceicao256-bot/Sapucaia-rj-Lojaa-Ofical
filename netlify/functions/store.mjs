import crypto from 'node:crypto';
import { getJSON, putJSON, json, requireAdmin, getSettings } from './_lib.mjs';
async function products(){return getJSON('sapucaia-data','products',[])}
async function orderIds(){return getJSON('sapucaia-data','orders-index',[])}
async function customers(){return getJSON('sapucaia-data','customers',[])}
async function orders(){
  const ids=await orderIds();
  const out=[];
  for(const id of Array.isArray(ids)?ids:[]){const o=await getJSON('sapucaia-data',`order-${id}`,null);if(o)out.push(o)}
  return out;
}
function normalizeProduct(incoming){
  const p={...incoming,id:String(incoming.id||crypto.randomUUID()),name:String(incoming.name||'').trim(),cat:String(incoming.cat||'').trim(),price:Number(incoming.price||0),old:Number(incoming.old||0),tag:String(incoming.tag||'').trim(),desc:String(incoming.desc||'').trim(),validityType:['days','wipe','permanent'].includes(incoming.validityType)?incoming.validityType:'permanent',validityDays:Number.isFinite(Number(incoming.validityDays))?Math.max(1,Math.floor(Number(incoming.validityDays))):30,valid:String(incoming.valid||'Até o wipe'),published:true,updatedAt:new Date().toISOString()};
  p.images=Array.isArray(incoming.images)?[...new Set(incoming.images.map(x=>String(x||'').trim()).filter(Boolean))]:[];
  p.img=String(incoming.img||p.images[0]||'assets/banner-sapucaia.png');
  if(!p.images.includes(p.img))p.images.unshift(p.img);
  if(p.validityType==='days')p.valid=`${p.validityDays} dias`;else if(p.validityType==='wipe')p.valid='Até o wipe';else p.valid='Permanente';
  return p;
}
export default async req=>{
  try{
    const url=new URL(req.url),resource=url.searchParams.get('resource')||'public';
    if(req.method==='GET'){
      if(resource==='public')return json({products:(await products()).filter(p=>p&&p.published===true),settings:await getSettings()},200,{'cache-control':'no-store'});
      if(resource==='health')return json({ok:true,service:'store'});
      if(!requireAdmin(req))return json({error:'Não autorizado'},401);
      if(resource==='products')return json({products:await products()});
      if(resource==='orders')return json({orders:await orders()});
      if(resource==='customers')return json({customers:await customers()});
      if(resource==='settings-admin')return json({settings:await getSettings()});
      return json({error:'Recurso não encontrado'},404);
    }
    if(req.method!=='POST')return json({error:'Método não permitido'},405);
    if(!requireAdmin(req))return json({error:'Não autorizado'},401);
    const body=await req.json().catch(()=>({}));
    if(resource==='products'){
      const list=await products();
      if(body.action==='save'){
        const p=normalizeProduct(body.product||{});
        if(!p.name||!p.cat||!Number.isFinite(p.price)||p.price<=0)return json({error:'Nome, categoria e preço são obrigatórios.'},400);
        const i=list.findIndex(x=>String(x.id)===p.id);if(i>=0)list[i]=p;else list.unshift(p);
        await putJSON('sapucaia-data','products',list);
        const verified=await products();const saved=verified.find(x=>String(x.id)===p.id);
        if(!saved)return json({error:'Falha ao confirmar publicação.'},500);
        return json({ok:true,product:saved,products:verified});
      }
      if(body.action==='delete'){
        const id=String(body.id||'');const next=list.filter(x=>String(x.id)!==id);await putJSON('sapucaia-data','products',next);return json({ok:true,products:await products()});
      }
      return json({error:'Ação de produto inválida.'},400);
    }
    if(resource==='settings'){
      const current=await getSettings();const incoming=body.settings&&typeof body.settings==='object'?body.settings:{};const next={...current,...incoming};
      await putJSON('sapucaia-config','settings',next);return json({ok:true,settings:next});
    }
    if(resource==='orders'){
      const list=await orders();
      if(body.action==='status'){
        const o=list.find(x=>String(x.id)===String(body.id));if(!o)return json({error:'Pedido não encontrado'},404);
        o.status=String(body.status||o.status||'Aguardando pagamento');o.updatedAt=new Date().toISOString();await putJSON('sapucaia-data',`order-${o.id}`,o);return json({ok:true,order:o});
      }
    }
    return json({error:'Ação não encontrada'},400);
  }catch(e){console.error('store error',e);return json({error:e.message||'Erro interno.'},500)}
};
