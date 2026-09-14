import { getJSON, putJSON, json, claimPayment, releasePaymentClaim, timingEqual } from './_payment-lib.mjs';
import { getJSON as dataGetJSON, putJSON as dataPutJSON } from './_lib.mjs';

async function deliver(order){
  const url=process.env.FIVEM_WEBHOOK_URL;
  if(!url) return {sent:false,reason:'FIVEM_WEBHOOK_URL não configurada'};
  const payload={event:'order.paid',deliveryId:order.id,orderId:order.id,recipientId:order.delivery.recipientId,recipientDiscord:order.delivery.recipientDiscord||'',buyer:{name:order.personal.name,email:order.personal.email,discord:order.buyerDiscord||null},items:order.items.map(x=>({id:x.id,name:x.name,quantity:x.qty})),total:order.total,couponCode:order.couponCode||'',discount:order.discount};
  const headers={'Content-Type':'application/json','X-Sapucaia-Delivery-Id':order.id};
  if(process.env.FIVEM_WEBHOOK_SECRET) headers['X-Sapucaia-Secret']=process.env.FIVEM_WEBHOOK_SECRET;
  const r=await fetch(url,{method:'POST',headers,body:JSON.stringify(payload)}); return {sent:r.ok,status:r.status};
}

async function email(order){
  if(!process.env.RESEND_API_KEY||!process.env.EMAIL_FROM) return {sent:false,reason:'RESEND_API_KEY/EMAIL_FROM não configurado'};
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const html=`<div style="font-family:Arial;background:#09090d;color:#fff;padding:30px"><h1 style="color:#ff087f">PARABÉNS PELA SUA COMPRA! 🎉</h1><p>Olá, <b>${esc(order.personal.name)}</b>!</p><p>Pagamento confirmado.</p><p><b>Pedido:</b> ${esc(order.id)}</p><p><b>Produto:</b> ${order.items.map(x=>`${esc(x.name)} × ${x.qty}`).join(', ')}</p><p><b>Valor:</b> R$ ${Number(order.total).toFixed(2).replace('.',',')}</p><p><b>Passaporte:</b> ${esc(order.delivery.recipientId)}</p></div>`;
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.EMAIL_FROM,to:[order.personal.email],subject:'🎉 PARABÉNS PELA SUA COMPRA!',html})}); return {sent:r.ok,status:r.status};
}

export default async req=>{
  if(req.method!=='POST') return json({ok:true});
  try{
    const secret=process.env.INFINITEPAY_WEBHOOK_SECRET;
    const supplied=req.headers.get('x-infinitepay-secret')||req.headers.get('x-webhook-secret');
    // Nunca aceita um body arbitrário da internet como prova de pagamento.
    if(!secret || !supplied || !timingEqual(supplied,secret)) return json({error:'Webhook não autenticado.'},401);
    const body=await req.json().catch(()=>({}));
    const orderId=String(body.order_nsu||body.orderNsu||'').trim();
    if(!orderId)return json({ok:true});
    const order=await dataGetJSON('sapucaia-data',`order-${orderId}`,null); if(!order)return json({ok:true});
    if(body.paid!==true && String(body.status||'').toLowerCase()!=='paid' && body.success!==true) return json({ok:true});
    if(order.status==='Pago'||order.status==='Entregue') return json({ok:true});
    const transactionId=String(body.transaction_nsu||body.transaction_id||body.id||order.id);
    const receivedAmount=Number(body.amount??body.total); if(!Number.isFinite(receivedAmount)||Math.abs(receivedAmount-Number(order.total))>0.01) return json({error:'Valor do pagamento incompatível.'},400);
    const claim=await claimPayment(transactionId);
    if(!claim)return json({ok:true});
    try{
      order.status='Pago'; order.paidAt=order.paidAt||new Date().toISOString(); order.gatewayStatus='paid'; order.gatewayTransactionNsu=transactionId;
      order.deliveryResult=await deliver(order); if(order.deliveryResult.sent) order.deliveryStatus='Enviado';
      order.emailResult=await email(order); order.security={verifiedServerSide:true,verifiedAt:new Date().toISOString()};
      await dataPutJSON('sapucaia-data',`order-${order.id}`,order); await releasePaymentClaim(transactionId,'done');
    }catch(e){await releasePaymentClaim(transactionId,'retry');throw e}
    return json({ok:true});
  }catch(e){console.error('infinitepay webhook error',e?.message||e);return json({ok:false},500)}
};
