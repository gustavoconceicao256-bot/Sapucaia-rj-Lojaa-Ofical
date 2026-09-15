let products=[];
let activeCategory='Destaques';
let cart=[];
let coupon=false;
let couponCode='SAPUCAIA50';
let couponPercent=50;
let storeSettings={};
let checkoutStep=1;
let checkoutMethod='pix';
let checkoutOrderId=null;
let checkoutPoll=null;
let buyerDiscord=null;
let previewMode=new URLSearchParams(location.search).get('preview')==='1';

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const defaultCategories=['Destaques','Edição Limitada','Planos VIP','Carros VIPS/LUXOS','Especiais','Caminhões','Aeronaves','Extras','Dinheiro','Orgs','Casas','Punições'];

function marqueePhrase(){
  return String(storeSettings.marqueeText||`${storeSettings.couponCode||'SAPUCAIA50'} ${storeSettings.couponPercent??50}% EM TODOS OS PRODUTOS`).trim();
}

function buildInfiniteMarquee(){
  const track=$('.marquee-track');
  if(!track)return;
  const groups=[...track.querySelectorAll('.marquee-group')];
  if(groups.length<2)return;
  const phrase=marqueePhrase();
  for(const group of groups){
    group.innerHTML='';
    for(let i=0;i<8;i++){
      const copy=document.createElement('span');
      copy.className='marquee-copy';
      copy.textContent=phrase;
      group.appendChild(copy);
    }
  }
  const first=groups[0];
  requestAnimationFrame(()=>{
    const w=first.getBoundingClientRect().width;
    track.style.setProperty('--marquee-distance',`${w}px`);
    track.style.width=`${w*2}px`;
  });
}

function toast(msg){
  const t=$('#toast');
  if(!t)return;
  t.textContent=msg;
  t.classList.add('show');
  clearTimeout(window.toastT);
  window.toastT=setTimeout(()=>t.classList.remove('show'),2400);
}

function saveCart(){
  localStorage.setItem('sapucaia_cart',JSON.stringify(cart));
  updateCount();
  renderCart();
}

function loadCart(){
  try{
    const raw=JSON.parse(localStorage.getItem('sapucaia_cart')||'[]');
    cart=Array.isArray(raw)?raw.filter(x=>x&&x.id&&Number.isInteger(Number(x.qty))&&Number(x.qty)>0).map(x=>({id:String(x.id),qty:Math.min(99,Number(x.qty))})):[];
  }catch{cart=[];}
}

function updateCount(){
  const n=cart.reduce((a,x)=>a+x.qty,0);
  if($('#cartCount'))$('#cartCount').textContent=n;
  if($('#cartCountBig'))$('#cartCountBig').textContent=`${n} ${n===1?'item':'itens'}`;
}

function publishedProducts(){
  return products.filter(p=>p&&p.published===true);
}

function filtered(){
  const p=publishedProducts();
  if(activeCategory==='Destaques')return p.slice(0,12);
  if(activeCategory==='Ofertas')return p.filter(x=>Number(x.old)>Number(x.price));
  if(activeCategory==='Novidades')return p.filter(x=>String(x.tag||'').toUpperCase()==='NOVO');

  const aliases={
    'Carros VIPS/LUXOS':['Carros VIPS/LUXOS','Carros','Motos'],
    'Especiais':['Especiais','Extras'],
    'Orgs':['Orgs','Organizações'],
    'Punições':['Punições']
  };
  const names=aliases[activeCategory]||[activeCategory];
  return p.filter(x=>names.includes(String(x.cat||'')));
}

function renderCategories(){
  const cats=Array.isArray(storeSettings.categories)&&storeSettings.categories.length
    ?storeSettings.categories.map(x=>Array.isArray(x)?x[1]:x).filter(Boolean)
    :defaultCategories;
  const el=$('.categories');
  if(!el)return;
  el.innerHTML=cats.map(c=>`<button class="cat ${activeCategory===c?'active':''}" data-category="${esc(c)}"><span class="cat-icon">${iconFor(c)}</span><span>${esc(c)}</span></button>`).join('');
  $$('.cat').forEach(b=>b.onclick=()=>setCategory(b.dataset.category));
}

function iconFor(c){
  const s=String(c).toLowerCase();
  if(s.includes('carro'))return'🚗';
  if(s.includes('moto'))return'🏍';
  if(s.includes('caminh'))return'🚚';
  if(s.includes('aeron'))return'✈';
  if(s.includes('dinhe'))return'💵';
  if(s.includes('casa'))return'🏠';
  if(s.includes('extra'))return'🎁';
  if(s.includes('puni'))return'⛔';
  if(s.includes('org'))return'♟';
  if(s.includes('edição'))return'♛';
  if(s.includes('vip'))return'♕';
  return'🔥';
}

function setCategory(cat){
  activeCategory=cat;
  $$('.cat,.side-filter,.wide-promo').forEach(b=>b.classList.toggle('active',b.dataset.category===cat));
  renderProducts();
}

function renderProducts(){
  const arr=filtered();
  if($('#sectionTitle'))$('#sectionTitle').textContent=activeCategory==='Destaques'?'PRODUTOS EM DESTAQUE':String(activeCategory).toUpperCase();
  if($('#sectionSub'))$('#sectionSub').textContent=arr.length?`${arr.length} produto(s) encontrado(s) na loja.`:'Nenhum produto disponível nesta categoria.';
  const grid=$('#productsGrid');
  if(!grid)return;

  if(!arr.length){
    grid.innerHTML=`<div class="empty-store"><span>♛</span><h3>Nenhum produto publicado</h3><p>Quando o ADM publicar um produto, ele aparecerá aqui.</p></div>`;
    return;
  }

  grid.innerHTML=arr.map(p=>{
    const old=Number(p.old||0);
    const valid=p.valid||(p.validityType==='days'?`${p.validityDays||30} dias`:p.validityType==='wipe'?'Até o wipe':'Permanente');
    return `<article class="product-card" data-id="${esc(p.id)}">
      <div class="product-image">
        <img src="${esc(p.img||'assets/banner-sapucaia.png')}" alt="${esc(p.name)}">
        ${p.tag?`<span class="tag">${esc(p.tag)}</span>`:''}
      </div>
      <div class="product-body">
        <h3>${esc(p.name)}</h3>
        <div class="price-row">${old>p.price?`<span class="old">${money(old)}</span>`:''}<span class="price">${money(p.price)}</span></div>
        <div class="product-actions">
          <button class="info-btn" data-info="${esc(p.id)}" aria-label="Informações"><b>!</b></button>
          <button class="add-btn" data-add="${esc(p.id)}">🛒 Adicionar ao carrinho</button>
        </div>
        <small class="validity-chip">${esc(valid)}</small>
      </div>
    </article>`;
  }).join('');

  $$('[data-add]').forEach(b=>b.onclick=e=>{e.stopPropagation();addToCart(b.dataset.add);});
  $$('[data-info]').forEach(b=>b.onclick=e=>{e.stopPropagation();openProduct(b.dataset.info);});
  $$('.product-card').forEach(c=>c.onclick=e=>{if(!e.target.closest('button'))openProduct(c.dataset.id);});
}

function addToCart(id){
  const p=publishedProducts().find(x=>String(x.id)===String(id));
  if(!p)return;
  const item=cart.find(x=>String(x.id)===String(id));
  if(item)item.qty++;else cart.push({id:String(id),qty:1});
  saveCart();
  toast(`${p.name} foi adicionado ao carrinho.`);
}

function removeItem(id){
  cart=cart.filter(x=>String(x.id)!==String(id));
  saveCart();
}

function changeQty(id,d){
  const x=cart.find(i=>String(i.id)===String(id));
  if(!x)return;
  x.qty+=d;
  if(x.qty<=0)return removeItem(id);
  saveCart();
}

function cartTotal(){
  let sub=0;
  for(const i of cart){
    const p=publishedProducts().find(p=>String(p.id)===String(i.id));
    if(p)sub+=Number(p.price||0)*Number(i.qty||0);
  }
  const disc=coupon?Number((sub*couponPercent/100).toFixed(2)):0;
  return{sub,disc,total:Number(Math.max(0,sub-disc).toFixed(2))};
}

function renderCart(){
  const wrap=$('#cartItems');
  if(!wrap)return;
  const items=cart.map(i=>({...i,p:publishedProducts().find(p=>String(p.id)===String(i.id))})).filter(x=>x.p);
  cart=items.map(x=>({id:x.id,qty:x.qty}));

  if(!items.length){
    wrap.innerHTML=`<div style="padding:45px 5px;text-align:center;color:#777;font-size:12px">Seu carrinho está vazio.<br><br>Escolha um produto para começar.</div>`;
  }else{
    wrap.innerHTML=items.map(x=>`<div class="cart-item">
      <img src="${esc(x.p.img||'assets/banner-sapucaia.png')}" alt="">
      <div><h4>${esc(x.p.name)}</h4><small>${money(x.p.price)}</small>
        <div class="qty"><button data-q="${esc(x.id)}" data-d="-1">−</button><b>${x.qty}</b><button data-q="${esc(x.id)}" data-d="1">+</button></div>
      </div>
      <button class="remove" data-r="${esc(x.id)}">×</button>
    </div>`).join('');
  }

  const t=cartTotal();
  if($('#subtotal'))$('#subtotal').textContent=money(t.sub);
  if($('#discount'))$('#discount').textContent=money(t.disc);
  if($('#total'))$('#total').textContent=money(t.total);

  $$('[data-r]').forEach(b=>b.onclick=()=>removeItem(b.dataset.r));
  $$('[data-q]').forEach(b=>b.onclick=()=>changeQty(b.dataset.q,Number(b.dataset.d)));
  updateCount();
}

function getProductDescriptionImages(p){
  const out=[];
  if(String(p?.descImage1||'').trim())out.push(String(p.descImage1).trim());
  if(String(p?.descImage2||'').trim())out.push(String(p.descImage2).trim());

  if(!out.length&&Array.isArray(p?.images)){
    for(const im of p.images){
      const s=String(im||'').trim();
      if(!s||s===String(p.img||'').trim())continue;
      if(!out.includes(s))out.push(s);
      if(out.length>=2)break;
    }
  }
  return out;
}

function openProduct(id){
  const p=publishedProducts().find(x=>String(x.id)===String(id));
  if(!p)return;

  const valid=p.valid||(p.validityType==='days'?`${p.validityDays||30} dias`:p.validityType==='wipe'?'Até o wipe':'Permanente');
  const desc=String(p.desc||'Nenhuma descrição adicional cadastrada.').trim();
  const descriptionImages=getProductDescriptionImages(p);

  const imageHtml=descriptionImages.length?`<div class="product-description-images">${descriptionImages.map((im,i)=>`<div class="description-image"><img src="${esc(im)}" alt="Imagem da descrição ${i+1}" loading="lazy"></div>`).join('')}</div>`:'';

  const faq=Array.isArray(p.faq)?p.faq:(Array.isArray(storeSettings.faq)?storeSettings.faq:[]);
  const faqHtml=faq.length?`<div class="product-faq"><h4>Dúvidas frequentes</h4>${faq.map(item=>`<details><summary>${esc(item.question||item.q||'Dúvida')}</summary><p>${esc(item.answer||item.a||'')}</p></details>`).join('')}</div>`:'';

  const discordConnected=buyerDiscord?`<div class="product-discord connected"><div class="product-discord-user">
    <img src="${discordAvatarUrl(buyerDiscord)}" alt="">
    <div><small>DISCORD CONECTADO</small><strong>${esc(firstDiscordName())}</strong></div>
  </div></div>`:`<button class="product-discord" id="productDiscordLogin" type="button">
    <span class="product-discord-icon">◉</span><span><small>VINCULE SUA CONTA</small><strong>Entrar com Discord</strong></span><b>→</b>
  </button>`;

  const recipientStored=(()=>{try{return sessionStorage.getItem('sapucaia_recipient_id')||'';}catch{return'';}})();

  $('#productDetail').innerHTML=`<div class="product-detail-shell">
    <button class="product-detail-close" id="productDetailClose" type="button" aria-label="Fechar">×</button>
    <div class="product-detail-content">
      <div class="product-detail-main">
        <div class="product-detail-heading">
          <div><p class="eyebrow">${esc(p.cat||'PRODUTO')}</p><h2>${esc(p.name)}</h2></div>
          <div class="product-detail-price">${Number(p.old)>Number(p.price)?`<span class="old">${money(p.old)}</span>`:''}<strong>${money(p.price)}</strong></div>
        </div>

        <section class="product-detail-section">
          <h4>Detalhes:</h4>
          <ul class="product-detail-list">
            <li>Validade: <b>${esc(valid)}</b></li>
            <li>Entrega: <b>Passaporte informado no checkout</b></li>
            <li>Pagamento: <b>Confirmado antes da entrega</b></li>
          </ul>
        </section>

        ${imageHtml}

        <section class="product-detail-section product-description">
          <h4>Descrição</h4>
          <p>${esc(desc).replace(/\n/g,'<br>')}</p>
        </section>

        ${faqHtml}
      </div>

      <aside class="product-detail-side">
        ${discordConnected}

        <div class="product-recipient">
          <label for="productRecipientId">ID / Passaporte</label>
          <input id="productRecipientId" inputmode="numeric" maxlength="12" placeholder="Digite o Passaporte" value="${esc(recipientStored)}">
          <small>O produto será enviado para este destinatário.</small>
        </div>

        <button class="primary-btn product-detail-buy" id="detailBuy" type="button">🛒 Adicionar ao carrinho</button>
        <button class="product-gift-btn" id="detailGift" type="button">🎁 Presentear alguém</button>
      </aside>
    </div>
  </div>`;

  $('#productModal')?.classList.add('open');

  $('#productDetailClose')?.addEventListener('click',closeProductModal);
  $('#productDiscordLogin')?.addEventListener('click',()=>{location.href='/api/discord-start';});

  $('#detailBuy')?.addEventListener('click',()=>{
    const recipient=$('#productRecipientId')?.value.trim()||'';
    if(!/^\d{1,12}$/.test(recipient)){
      toast('Informe o ID/Passaporte do destinatário.');
      $('#productRecipientId')?.focus();
      return;
    }
    saveRecipient(recipient);
    addToCart(id);
    closeProductModal();
    openCart();
  });

  $('#detailGift')?.addEventListener('click',()=>{
    const recipient=$('#productRecipientId')?.value.trim()||'';
    if(!/^\d{1,12}$/.test(recipient)){
      toast('Informe o ID/Passaporte para presentear.');
      $('#productRecipientId')?.focus();
      return;
    }
    saveRecipient(recipient);
    try{sessionStorage.setItem('sapucaia_gift_mode','1');}catch{}
    addToCart(id);
    closeProductModal();
    openCart();
  });

  $('#productRecipientId')?.addEventListener('input',e=>{
    e.target.value=digits(e.target.value).slice(0,12);
  });
}

function closeProductModal(){
  $('#productModal')?.classList.remove('open');
}

function saveRecipient(recipient){
  try{sessionStorage.setItem('sapucaia_recipient_id',recipient);}catch{}
}

function openCart(){
  $('#cartBackdrop')?.classList.add('open');
  renderCart();
}

function scrollToEl(sel){
  $(sel)?.scrollIntoView({behavior:'smooth'});
}

function firstDiscordName(){
  return String(buyerDiscord?.global_name||buyerDiscord?.username||'Usuário').trim().split(/\s+/)[0]||'Usuário';
}

function discordAvatarUrl(user){
  if(user?.avatar)return `https://cdn.discordapp.com/avatars/${encodeURIComponent(user.id)}/${encodeURIComponent(user.avatar)}.png?size=128`;
  return `https://cdn.discordapp.com/embed/avatars/${Number(user?.id||0)%5}.png`;
}

$$('[data-scroll]').forEach(b=>b.onclick=()=>scrollToEl(b.dataset.scroll));
$$('.side-filter,.wide-promo').forEach(b=>b.onclick=()=>setCategory(b.dataset.category));

$('#viewAll')?.addEventListener('click',()=>{setCategory('Destaques');scrollToEl('#productsGrid');});
$('#cartOpen')?.addEventListener('click',openCart);
$('#cartClose')?.addEventListener('click',()=>$('#cartBackdrop')?.classList.remove('open'));

$('#cartBackdrop')?.addEventListener('click',e=>{
  if(e.target.id==='cartBackdrop')e.currentTarget.classList.remove('open');
});

$('#productModal')?.addEventListener('click',e=>{
  if(e.target.id==='productModal')closeProductModal();
});

$('#applyCoupon')?.addEventListener('click',()=>{
  const val=$('#couponInput')?.value.trim().toUpperCase()||'';
  if(val===couponCode){coupon=true;toast(`Cupom ${couponCode} aplicado.`);}
  else{coupon=false;toast('Cupom inválido.');}
  renderCart();
});

$('#copyCoupon')?.addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(couponCode);toast(`Cupom ${couponCode} copiado!`);}
  catch{toast(`Use o cupom ${couponCode}`);}
});

function saveCheckoutState(){
  try{
    const state={step:Number(checkoutStep)||1,method:checkoutMethod,fields:{
      country:$('#checkoutCountry')?.value||'',
      name:$('#checkoutName')?.value||'',
      email:$('#checkoutEmail')?.value||'',
      cpf:$('#checkoutCpf')?.value||'',
      phone:$('#checkoutPhone')?.value||'',
      recipientId:$('#checkoutRecipientId')?.value||'',
      recipientDiscord:$('#checkoutRecipientDiscord')?.value||'',
      termsAccepted:$('#checkoutTerms')?.checked||false
    }};
    sessionStorage.setItem('sapucaia_checkout_state',JSON.stringify(state));
  }catch{}
}

function getCheckoutState(){
  try{
    const raw=sessionStorage.getItem('sapucaia_checkout_state');
    return raw?JSON.parse(raw):null;
  }catch{return null;}
}

function restoreCheckoutState(){
  const state=getCheckoutState();
  if(!state)return false;
  const fields=state.fields||{};
  if($('#checkoutCountry'))$('#checkoutCountry').value=fields.country||$('#checkoutCountry').value;
  if($('#checkoutName'))$('#checkoutName').value=fields.name||'';
  if($('#checkoutEmail'))$('#checkoutEmail').value=fields.email||'';
  if($('#checkoutCpf'))$('#checkoutCpf').value=fields.cpf||'';
  if($('#checkoutPhone'))$('#checkoutPhone').value=fields.phone||'';
  if($('#checkoutRecipientId'))$('#checkoutRecipientId').value=fields.recipientId||'';
  if($('#checkoutRecipientDiscord'))$('#checkoutRecipientDiscord').value=fields.recipientDiscord||'';
  if($('#checkoutTerms'))$('#checkoutTerms').checked=fields.termsAccepted===true;
  if(state.method){
    checkoutMethod=state.method;
    $$('.payment-option').forEach(x=>x.classList.toggle('active',x.dataset.method===checkoutMethod));
  }
  checkoutStep=Number(state.step)||1;
  return true;
}

function clearCheckoutState(){
  try{sessionStorage.removeItem('sapucaia_checkout_state');}catch{}
}

function setCheckoutStep(step){
  checkoutStep=Number(step)||1;
  $$('.checkout-step').forEach(x=>x.classList.toggle('active',Number(x.dataset.step)===checkoutStep));
  $$('.checkout-steps [data-step-label]').forEach(x=>x.classList.toggle('current',Number(x.dataset.stepLabel)===checkoutStep));
  saveCheckoutState();
}

function openCheckout(){
  if(!cart.length){toast('Seu carrinho está vazio.');return;}
  $('#cartBackdrop')?.classList.remove('open');
  $('#checkoutModal')?.classList.add('open');
  $('#checkoutModal')?.setAttribute('aria-hidden','false');
  setCheckoutStep(1);
  if($('#checkoutOrderLabel'))$('#checkoutOrderLabel').textContent=`${cart.reduce((a,x)=>a+x.qty,0)} item(ns) no pedido`;
  const saved=(()=>{try{return sessionStorage.getItem('sapucaia_recipient_id')||'';}catch{return'';}})();
  if(saved&&$('#checkoutRecipientId')&&!$('#checkoutRecipientId').value)$('#checkoutRecipientId').value=saved;
  loadDiscordSession();
}

function closeCheckout(){
  if(!$('#checkoutModal'))return;
  $('#checkoutModal').classList.remove('open');
  $('#checkoutModal').setAttribute('aria-hidden','true');
  if(checkoutPoll){clearInterval(checkoutPoll);checkoutPoll=null;}
}

function digits(v){return String(v||'').replace(/\D/g,'');}

function maskCpf(v){
  const d=digits(v).slice(0,11);
  return d.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');
}

function maskPhone(v){
  const d=digits(v).slice(0,11);
  if(d.length<=2)return d?`(${d}`:'';
  if(d.length<=7)return `(${d.slice(0,2)}) ${d.slice(2)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

async function loadDiscordSession(){
  try{
    const r=await fetch('/api/discord-session',{cache:'no-store'});
    const d=await r.json();
    buyerDiscord=d.connected?d.user:null;
  }catch{buyerDiscord=null;}

  const loginButtons=[$('#discordLogin'),$('#checkoutDiscordLogin')].filter(Boolean);

  loginButtons.forEach(btn=>{
    if(!buyerDiscord){
      btn.innerHTML='Entrar com Discord';
      btn.removeAttribute('title');
      btn.dataset.discordConnected='false';
      return;
    }

    btn.innerHTML=`<span style="display:flex;align-items:center;justify-content:center;gap:10px;width:100%;">
      <img src="${discordAvatarUrl(buyerDiscord)}" alt="Foto do Discord" style="width:34px;height:34px;min-width:34px;border-radius:50%;object-fit:cover;display:block;">
      <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Conectado: ${esc(firstDiscordName())}</span>
    </span>`;
    btn.title=buyerDiscord.global_name||buyerDiscord.username||'Discord conectado';
    btn.dataset.discordConnected='true';
  });

  if($('#discordLoginState'))$('#discordLoginState').textContent=buyerDiscord?`Conectado: ${esc(firstDiscordName())}`:'Não conectado';

  const productButton=$('#productDiscordLogin');
  if(productButton&&buyerDiscord)openProductRefreshDiscordState();
}

function openProductRefreshDiscordState(){
  const pModal=$('#productModal');
  if(!pModal?.classList.contains('open'))return;
  const userBox=$('.product-discord');
  if(!userBox||userBox.id!=='productDiscordLogin')return;
  userBox.outerHTML=`<div class="product-discord connected"><div class="product-discord-user"><img src="${discordAvatarUrl(buyerDiscord)}" alt=""><div><small>DISCORD CONECTADO</small><strong>${esc(firstDiscordName())}</strong></div></div></div>`;
}

function validatePersonal(){
  const name=$('#checkoutName')?.value.trim()||'';
  const email=$('#checkoutEmail')?.value.trim()||'';
  const cpf=digits($('#checkoutCpf')?.value||'');
  const phone=digits($('#checkoutPhone')?.value||'');

  if(name.length<3||name.split(/\s+/).length<2){toast('Informe nome e sobrenome.');return false;}
  if(!/^\S+@\S+\.\S+$/.test(email)){toast('Informe um e-mail válido.');return false;}
  if(cpf.length!==11){toast('Informe um CPF válido.');return false;}
  if(phone.length<10){toast('Informe um celular válido.');return false;}
  return true;
}

function validateDelivery(){
  const id=$('#checkoutRecipientId')?.value.trim()||'';
  if(!/^\d{1,12}$/.test(id)){toast('Informe um ID/Passaporte do destinatário válido.');return false;}
  saveRecipient(id);
  return true;
}

function checkoutPayload(){
  let recipientId=$('#checkoutRecipientId')?.value.trim()||'';
  try{
    const modalRecipient=sessionStorage.getItem('sapucaia_recipient_id');
    if(modalRecipient&&/^\d{1,12}$/.test(modalRecipient))recipientId=modalRecipient;
  }catch{}

  return{
    items:cart,
    couponCode:coupon?couponCode:'',
    termsAccepted:$('#checkoutTerms')?.checked||false,
    paymentMethod:checkoutMethod,
    buyerDiscord,
    buyer:{
      country:$('#checkoutCountry')?.value||'',
      name:$('#checkoutName')?.value.trim()||'',
      email:$('#checkoutEmail')?.value.trim()||'',
      cpf:$('#checkoutCpf')?.value||'',
      phone:$('#checkoutPhone')?.value||''
    },
    personal:{
      country:$('#checkoutCountry')?.value||'',
      name:$('#checkoutName')?.value.trim()||'',
      email:$('#checkoutEmail')?.value.trim()||'',
      cpf:$('#checkoutCpf')?.value||'',
      phone:$('#checkoutPhone')?.value||''
    },
    delivery:{
      recipientId,
      recipientDiscord:$('#checkoutRecipientDiscord')?.value.trim()||''
    }
  };
}

async function createPayment(){
  if(!validatePersonal()||!validateDelivery())return;
  if(!$('#checkoutTerms')?.checked){toast('Aceite os termos de serviço para continuar.');return;}

  const btn=$('#createPaymentBtn');
  if(!btn)return;
  btn.disabled=true;

  try{
    const r=await fetch('/api/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(checkoutPayload())});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error||'Não foi possível criar a cobrança.');

    checkoutOrderId=d.orderId;

    if(d.method==='infinitepay'&&d.payment?.checkoutUrl){
      location.href=d.payment.checkoutUrl;
      return;
    }

    setCheckoutStep(4);
    renderPixPayment(d);
    startPaymentPoll();
  }catch(e){toast(e.message);}finally{btn.disabled=false;}
}

function renderPixPayment(d){
  const qr=d.payment?.qrCodeBase64?`<img src="data:image/png;base64,${esc(d.payment.qrCodeBase64)}" alt="QR Code Pix">`:`<div class="qr-empty">QR Code indisponível</div>`;
  const code=d.payment?.qrCode||'';

  $('#paymentResult').innerHTML=`<div class="pay-grid">
    <div class="qr-box">${qr}</div>
    <div>
      <p class="eyebrow">PAGAMENTO PIX</p>
      <h3 class="pay-title">Escaneie ou copie o Pix</h3>
      <span id="paymentLiveStatus" class="pay-status">● Aguardando pagamento</span>
      <div class="pix-copy"><label>Pix Copia e Cola</label><div class="pix-copy-row"><input id="pixCopyValue" value="${esc(code)}" readonly><button id="copyPix">Copiar código</button></div></div>
      <div class="pay-summary"><div><span>Pedido</span><span>#${esc(d.orderId)}</span></div><div><span>Total</span><strong>${money(d.amount)}</strong></div></div>
    </div>
  </div>`;

  $('#copyPix').onclick=async()=>{
    try{await navigator.clipboard.writeText(code);toast('Pix copiado.');}
    catch{toast('Selecione o código e copie.');}
  };
}

async function pollPayment(){
  if(!checkoutOrderId)return;
  try{
    const r=await fetch(`/api/payment-status?order=${encodeURIComponent(checkoutOrderId)}`,{cache:'no-store'});
    const d=await r.json().catch(()=>({}));
    const status=d.order?.status;
    if(status==='Pago'||status==='Entregue'){
      const el=$('#paymentLiveStatus');
      if(el){el.textContent='● Pagamento aprovado';el.classList.add('ok');}
      showPaymentSuccess(d.order);
      if(checkoutPoll){clearInterval(checkoutPoll);checkoutPoll=null;}
    }
  }catch{}
}

function startPaymentPoll(){
  if(checkoutPoll)clearInterval(checkoutPoll);
  checkoutPoll=setInterval(pollPayment,5000);
  pollPayment();
}

function showPaymentSuccess(order){
  if($('#paymentResult')?.querySelector('.success-box'))return;
  const names=(order.items||[]).map(x=>`${esc(x.name||x.id)} × ${x.quantity||x.qty}`).join(', ');
  $('#paymentResult').insertAdjacentHTML('beforeend',`<div class="success-box">
    <h3>Pagamento aprovado! 🎉</h3>
    <p>Pedido <b>#${esc(order.id)}</b> confirmado.</p>
    <p>Entrega destinada ao Passaporte <b>${esc(order.delivery?.recipientId||'—')}</b>.</p>
    <p>${names}</p>
  </div>`);
}

$('#checkout')?.addEventListener('click',openCheckout);
$('#checkoutClose')?.addEventListener('click',closeCheckout);
$('#checkoutModal')?.addEventListener('click',e=>{if(e.target.id==='checkoutModal')closeCheckout();});

$('#checkoutCpf')?.addEventListener('input',e=>e.target.value=maskCpf(e.target.value));
$('#checkoutPhone')?.addEventListener('input',e=>e.target.value=maskPhone(e.target.value));

$$('.checkout-next').forEach(b=>b.onclick=()=>{
  const n=Number(b.dataset.next);
  if(n===2&&!validatePersonal())return;
  if(n===3&&!validateDelivery())return;
  setCheckoutStep(n);
});

$$('.checkout-back').forEach(b=>b.onclick=()=>setCheckoutStep(Number(b.dataset.back)));

$$('.payment-option').forEach(b=>b.onclick=()=>{
  $$('.payment-option').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  checkoutMethod=b.dataset.method;
  saveCheckoutState();
});

$('#checkoutTermsLink')?.addEventListener('click',e=>{
  e.preventDefault();
  saveCheckoutState();
  const target=$('#checkoutTermsLink')?.getAttribute('href')||'terms.html';
  location.href=target;
});

['checkoutCountry','checkoutName','checkoutEmail','checkoutCpf','checkoutPhone','checkoutRecipientId','checkoutRecipientDiscord','checkoutTerms'].forEach(id=>{
  const el=$('#'+id);
  el?.addEventListener('input',saveCheckoutState);
  el?.addEventListener('change',saveCheckoutState);
});

$('#checkoutDiscordLogin')?.addEventListener('click',()=>{
  if(!buyerDiscord)location.href='/api/discord-start';
});

$('#discordLogin')?.addEventListener('click',()=>{
  if(!buyerDiscord)location.href='/api/discord-start';
});

$('#discordSupport')?.addEventListener('click',()=>{
  const u=storeSettings.discordUrl;
  if(u)location.href=u;else toast('Discord ainda não configurado.');
});

$('#discordBtn')?.addEventListener('click',()=>$('#discordSupport')?.click());

$('#contactBtn')?.addEventListener('click',()=>{
  storeSettings.supportUrl?location.href=storeSettings.supportUrl:toast('Suporte ainda não configurado.');
});

$('#faqBtn')?.addEventListener('click',()=>{
  const f=$('#faq');
  if(f)f.classList.toggle('open');
});

$('#buyInfoBtn')?.addEventListener('click',()=>scrollToEl('#faq'));
$('#ordersBtn')?.addEventListener('click',()=>scrollToEl('#pedidos'));

function applySettings(s){
  storeSettings={...storeSettings,...(s||{})};
  const root=document.documentElement;
  const num=(key,fallback)=>Number(storeSettings[key]??fallback);

  root.style.setProperty('--pink',storeSettings.primaryColor||'#ff087f');
  root.style.setProperty('--pink2',storeSettings.secondaryColor||'#ff4fa3');
  root.style.setProperty('--bg',storeSettings.backgroundColor||'#06060a');
  root.style.setProperty('--surface',storeSettings.surfaceColor||'#101016');
  root.style.setProperty('--text',storeSettings.textColor||'#fff');
  root.style.setProperty('--muted',storeSettings.mutedColor||'#a6a0aa');
  root.style.setProperty('--button-color',storeSettings.buttonColor||storeSettings.primaryColor||'#ff087f');
  root.style.setProperty('--button-hover',storeSettings.buttonHoverColor||storeSettings.secondaryColor||'#ff4fa3');
  root.style.setProperty('--border-color',storeSettings.borderColor||storeSettings.primaryColor||'#ff087f');
  root.style.setProperty('--price-color',storeSettings.priceColor||storeSettings.primaryColor||'#ff087f');
  root.style.setProperty('--button-radius',`${num('buttonRadius',14)}px`);
  root.style.setProperty('--button-height',`${num('buttonHeight',46)}px`);
  root.style.setProperty('--button-hover-scale',`${Math.max(100,num('buttonHoverScale',103))/100}`);
  root.style.setProperty('--card-radius',`${num('cardRadius',18)}px`);
  root.style.setProperty('--card-lift',`${num('cardLift',8)}px`);
  root.style.setProperty('--card-padding',`${num('cardPadding',16)}px`);
  root.style.setProperty('--card-image-height',`${num('cardImageHeight',220)}px`);
  root.style.setProperty('--heading-size',`${num('headingSize',42)}px`);
  root.style.setProperty('--body-size',`${num('bodySize',14)}px`);
  root.style.setProperty('--button-font-size',`${num('buttonFontSize',13)}px`);
  root.style.setProperty('--heading-weight',`${num('headingWeight',800)}`);
  root.style.setProperty('--letter-spacing',`${num('letterSpacing',1)}px`);
  root.style.setProperty('--banner-intensity',`${num('bannerIntensity',70)/100}`);
  root.style.setProperty('--banner-height',`${num('bannerHeight',455)}px`);
  root.style.setProperty('--banner-radius',`${num('bannerRadius',2)}px`);
  root.style.setProperty('--bg-opacity',`${num('backgroundOpacity',45)/100}`);
  root.style.setProperty('--bg-blur',`${num('backgroundBlur',0)}px`);
  root.style.setProperty('--bg-darkness',`${num('backgroundDarkness',35)/100}`);
  root.style.setProperty('--marquee-speed',`${num('marqueeSpeed',26)}s`);
  root.style.setProperty('--marquee-size',`${num('marqueeSize',13)}px`);
  root.style.setProperty('--marquee-gap',`${num('marqueeGap',45)}px`);
  root.style.setProperty('--content-max-width',`${num('contentMaxWidth',1560)}px`);
  root.style.setProperty('--section-gap',`${num('sectionGap',24)}px`);
  root.style.setProperty('--global-radius',`${num('globalRadius',18)}px`);
  root.style.setProperty('--product-columns',String(num('productColumns',3)));
  root.style.setProperty('--effects-intensity',`${num('effectsIntensity',75)/100}`);
  root.style.setProperty('--vignette',`${num('vignette',35)/100}`);
  root.style.setProperty('--heading-font',`"${storeSettings.headingFont||'Arial'}",sans-serif`);
  root.style.setProperty('--body-font',`"${storeSettings.bodyFont||'Arial'}",sans-serif`);
  root.style.setProperty('--button-font',`"${storeSettings.buttonFont||'Arial'}",sans-serif`);
  root.style.setProperty('--bg-image',`url("${String(storeSettings.backgroundImage||'').replace(/"/g,'\\"')}")`);

  document.body.dataset.bannerEffect=storeSettings.bannerEffect||'glow-scan';
  document.body.dataset.bannerFit=storeSettings.bannerFit||'fill';
  document.body.dataset.buttonStyle=storeSettings.buttonStyle||'rounded';
  document.body.dataset.buttonGlow=storeSettings.buttonGlow===false?'off':'on';
  document.body.dataset.buttonShadow=storeSettings.buttonShadow===false?'off':'on';
  document.body.dataset.buttonBorder=storeSettings.buttonBorder===false?'off':'on';
  document.body.dataset.buttonAnimation=storeSettings.buttonAnimation||'shine';
  document.body.dataset.cardGlow=storeSettings.cardGlow===false?'off':'on';
  document.body.dataset.cardBorder=storeSettings.cardBorder===false?'off':'on';
  document.body.dataset.marqueeGlow=storeSettings.marqueeGlow===false?'off':'on';

  for(const key of ['fxParticles','fxStars','fxGrid','fxNoise']){
    document.body.dataset[key]=storeSettings[key]===false?'off':'on';
  }

  document.body.dataset.reducedMotion=storeSettings.reducedMotion===true?'on':'off';

  const banner=$('.hero-banner img');
  if(banner)banner.src=storeSettings.banner||'assets/banner-sapucaia.png';

  const heroTitle=$('#heroTitle');
  if(heroTitle)heroTitle.textContent=storeSettings.heroTitle||storeSettings.shopName||'SAPUCAIA';

  const heroSubtitle=$('#heroSubtitle');
  if(heroSubtitle)heroSubtitle.textContent=storeSettings.heroSubtitle||storeSettings.city||'RIO DE JANEIRO';

  const heroButton=$('#heroButton');
  if(heroButton){
    heroButton.textContent=storeSettings.heroButtonText||'Ver produtos';
    heroButton.setAttribute('href',storeSettings.heroButtonUrl||'#categorias');
  }

  $$('[data-theme-shop-name]').forEach(x=>x.textContent=storeSettings.shopName||'SAPUCAIA');
  $$('[data-theme-city]').forEach(x=>x.textContent=storeSettings.city||'RIO DE JANEIRO');

  if($('#promoHeadline'))$('#promoHeadline').textContent=storeSettings.promoText||`${storeSettings.couponPercent??50}% EM TODOS OS PRODUTOS`;

  const termsLink=$('#checkoutTermsLink');
  if(termsLink)termsLink.href=storeSettings.termsUrl||'terms.html';

  buildInfiniteMarquee();

  if($('#copyCoupon'))$('#copyCoupon').innerHTML=`${esc(storeSettings.couponCode||'SAPUCAIA50')} <span>⧉</span>`;

  renderCategories();
  renderProducts();
  renderCart();
}

window.addEventListener('message',e=>{
  if(!e.data||e.origin!==location.origin)return;
  if(e.data.type==='sapucaia-preview')applySettings(e.data.settings);
  if(e.data.type==='sapucaia-preview-focus')focusPreviewElement(e.data.target);
  if(e.data.type==='sapucaia-preview-clear-focus')clearPreviewFocus();
});

function focusPreviewElement(target){
  clearPreviewFocus();
  const map={banner:'.hero-banner',background:'body',button:'.add-btn',title:'#sectionTitle',card:'.product-card',marquee:'.infinite-marquee',brand:'.brand'};
  const el=$(map[target]||map.card);
  if(!el)return;
  document.body.classList.add('preview-focus-mode');
  el.classList.add('preview-focus-item');
  if(target==='background')document.body.classList.add('preview-focus-background');
}

function clearPreviewFocus(){
  document.body.classList.remove('preview-focus-mode','preview-focus-background');
  $$('.preview-focus-item').forEach(x=>x.classList.remove('preview-focus-item'));
}

for(let i=0;i<24;i++){
  const p=document.createElement('i');
  p.className='particle';
  p.style.left=Math.random()*100+'%';
  p.style.animationDelay=(-Math.random()*8)+'s';
  p.style.animationDuration=(6+Math.random()*7)+'s';
  p.style.opacity=.2+Math.random()*.7;
  $('#particles')?.appendChild(p);
}

async function loadStoreCatalog(){
  try{
    const r=await fetch('/api/store?resource=public',{cache:'no-store'});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error||'Não foi possível carregar a loja.');

    products=Array.isArray(d.products)?d.products.filter(p=>p&&p.published===true):[];
    storeSettings=d.settings||{};

    couponCode=String(storeSettings.couponCode||'SAPUCAIA50').toUpperCase();
    couponPercent=Number(storeSettings.couponPercent??50);

    applySettings(storeSettings);
    updateCount();
  }catch(e){
    products=[];
    applySettings(storeSettings);
    toast('Não foi possível carregar os produtos publicados.');
    console.error(e);
  }
}

loadCart();
updateCount();
buildInfiniteMarquee();
loadStoreCatalog();
setInterval(loadStoreCatalog,10000);

window.addEventListener('resize',()=>{
  clearTimeout(window.__marqueeResize);
  window.__marqueeResize=setTimeout(buildInfiniteMarquee,120);
});

if(previewMode&&window.parent!==window){
  window.parent.postMessage({type:'preview-ready'},'*');
}

const params=new URLSearchParams(location.search);

if(params.get('payment')==='return'&&params.get('order')){
  checkoutOrderId=params.get('order');
  $('#checkoutModal')?.classList.add('open');
  setCheckoutStep(4);
  pollPayment();
  startPaymentPoll();
}

const termsReturn=params.get('termsReturn');

if(termsReturn==='1'){
  const state=getCheckoutState();
  if(state){
    requestAnimationFrame(()=>{
      const modal=$('#checkoutModal');
      if(modal){
        modal.classList.add('open');
        modal.setAttribute('aria-hidden','false');
      }
      restoreCheckoutState();
      setCheckoutStep(checkoutStep);
      loadDiscordSession();
      history.replaceState({},document.title,`${location.pathname}${location.hash||''}`);
    });
  }
}

if(previewMode){
  document.addEventListener('click',event=>{
    const map=[
      ['.hero-banner','banner'],
      ['.add-btn','button'],
      ['.primary-btn','button'],
      ['.product-card','card'],
      ['.infinite-marquee','marquee'],
      ['.brand','brand'],
      ['#sectionTitle','title']
    ];

    for(const [selector,target] of map){
      if(event.target.closest(selector)){
        event.preventDefault();
        event.stopPropagation();
        if(window.parent!==window)window.parent.postMessage({type:'preview-focus-request',target},location.origin);
        break;
      }
    }
  },true);
}

loadDiscordSession();
