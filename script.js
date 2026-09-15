const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

let products = [];
let storeSettings = {};
let cart = JSON.parse(localStorage.getItem('sapucaia_cart') || '[]');
let coupon = null;
let checkoutMethod = 'pix';
let checkoutOrderId = null;
let checkoutPoll = null;
let discordSession = null;
let previewMode = new URLSearchParams(location.search).get('preview') === '1';

const esc = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const money = (value) =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

const api = async (url, options = {}) => {
  const response = await fetch(url, options);
  const text = await response.text();

  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data?.error || `Erro ${response.status}`);
  }

  return data;
};

function normalizeFaq(value) {
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function saveCart() {
  localStorage.setItem('sapucaia_cart', JSON.stringify(cart));
}

function cartCount() {
  return cart.reduce((total, item) => total + Number(item.qty || 1), 0);
}

function cartSubtotal() {
  return cart.reduce(
    (total, item) => total + Number(item.price || 0) * Number(item.qty || 1),
    0
  );
}

function cartDiscount() {
  if (!coupon) return 0;

  const percent = Number(coupon.percent || 0);
  return cartSubtotal() * (percent / 100);
}

function cartTotal() {
  return Math.max(0, cartSubtotal() - cartDiscount());
}

function updateCartBadge() {
  const badge = $('#cartCount');

  if (badge) {
    badge.textContent = cartCount();
    badge.style.display = cartCount() > 0 ? 'flex' : 'none';
  }
}

function addToCart(product, qty = 1) {
  const existing = cart.find(
    (item) => String(item.id) === String(product.id)
  );

  if (existing) {
    existing.qty = Number(existing.qty || 1) + qty;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price || 0),
      img: product.img || '',
      qty
    });
  }

  saveCart();
  updateCartBadge();
}

function removeFromCart(id) {
  cart = cart.filter((item) => String(item.id) !== String(id));
  saveCart();
  updateCartBadge();
  renderCart();
}

function changeCartQty(id, delta) {
  const item = cart.find((x) => String(x.id) === String(id));

  if (!item) return;

  item.qty = Math.max(1, Number(item.qty || 1) + delta);

  saveCart();
  updateCartBadge();
  renderCart();
}

function getProductDescriptionImages(product) {
  const images = [];

  if (product?.descImage1) {
    images.push(product.descImage1);
  }

  if (product?.descImage2) {
    images.push(product.descImage2);
  }

  if (!images.length && Array.isArray(product?.images)) {
    product.images
      .filter((image) => image && image !== product.img)
      .slice(0, 2)
      .forEach((image) => images.push(image));
  }

  return [...new Set(images)].slice(0, 2);
}

function firstDiscordName(session) {
  if (!session) return '';

  const name =
    session.global_name ||
    session.globalName ||
    session.username ||
    session.name ||
    '';

  return String(name).trim().split(/\s+/)[0] || 'Discord';
}

function applySettings(settings = {}) {
  storeSettings = settings || {};

  const title = $('#storeTitle');
  if (title && storeSettings.storeName) {
    title.textContent = storeSettings.storeName;
  }

  const logo = $('#storeLogo');
  if (logo && storeSettings.logo) {
    logo.src = storeSettings.logo;
  }

  const marquee = $('#marqueeText');
  if (marquee) {
    const code = storeSettings.couponCode || '';
    const percent = Number(storeSettings.couponPercent || 0);

    marquee.textContent =
      code && percent
        ? `USE ${code} E GANHE ${percent}% DE DESCONTO`
        : storeSettings.marquee || '';
  }
}

async function loadDiscordSession() {
  try {
    const data = await api('/api/discord-session');

    discordSession = data?.authenticated ? data : null;
  } catch {
    discordSession = null;
  }

  updateDiscordUI();
}

function updateDiscordUI() {
  const name = firstDiscordName(discordSession);

  $$('.discord-user-name').forEach((element) => {
    element.textContent = name;
  });

  $$('.discord-user-avatar').forEach((element) => {
    if (discordSession?.avatar) {
      element.src = discordSession.avatar;
      element.style.display = 'block';
    } else {
      element.style.display = 'none';
    }
  });

  $$('.discord-login').forEach((element) => {
    element.style.display = discordSession ? 'none' : '';
  });

  $$('.discord-connected').forEach((element) => {
    element.style.display = discordSession ? '' : 'none';
  });

  const productDetail = $('#productDetail');

  if (productDetail && productDetail.innerHTML) {
    const activeProduct = productDetail.dataset.productId;

    if (activeProduct) {
      const product = products.find(
        (item) => String(item.id) === String(activeProduct)
      );

      if (product) {
        openProduct(product.id);
      }
    }
  }
}

function openDiscordLogin() {
  window.location.href = '/api/discord-start';
}

function closeProductModal() {
  const modal = $('#productModal');

  if (!modal) return;

  modal.classList.remove('open');
  document.body.classList.remove('modal-open');
}

function openProduct(id) {
  const product = products.find(
    (item) => String(item.id) === String(id)
  );

  if (!product) return;

  const modal = $('#productModal');
  const detail = $('#productDetail');

  if (!modal || !detail) return;

  const descImages = getProductDescriptionImages(product);
  const productFaq = normalizeFaq(product.faq);
  const faq = productFaq.length
    ? productFaq
    : normalizeFaq(storeSettings.faq);

  const recipientId =
    sessionStorage.getItem('sapucaia_recipient_id') || '';

  const description = product.desc || 'Nenhuma descrição informada.';

  detail.dataset.productId = product.id;

  detail.innerHTML = `
    <button
      class="product-detail-close"
      type="button"
      aria-label="Fechar"
      onclick="closeProductModal()"
    >×</button>

    <div class="product-detail-grid">

      <div class="product-detail-main">

        <div class="product-detail-head">
          <div>
            <div class="product-detail-category">
              ${esc(product.cat || 'Produto')}
            </div>

            <h2>${esc(product.name || 'Produto')}</h2>
          </div>

          <strong class="product-detail-price">
            ${money(product.price)}
          </strong>
        </div>

        <section class="product-detail-section">
          <h3>Detalhes:</h3>

          <ul class="product-detail-list">
            <li>Produto digital para o servidor</li>
            <li>Entrega vinculada ao Passaporte/ID informado</li>
            ${
              product.valid
                ? `<li>Validade: ${esc(product.valid)}</li>`
                : ''
            }
          </ul>
        </section>

        ${
          descImages.length
            ? `
              <div class="product-detail-images">
                ${descImages
                  .map(
                    (image) => `
                      <img
                        src="${esc(image)}"
                        alt="${esc(product.name || 'Produto')}"
                        loading="lazy"
                      >
                    `
                  )
                  .join('')}
              </div>
            `
            : ''
        }

        <div class="product-detail-divider"></div>

        <section class="product-detail-section">
          <h3>Descrição</h3>

          <div class="product-detail-description">
            ${esc(description).replaceAll('\n', '<br>')}
          </div>
        </section>

        ${
          faq.length
            ? `
              <section class="product-detail-section">
                <h3>Dúvidas frequentes</h3>

                <div class="product-detail-faq">
                  ${faq
                    .map((item) => {
                      const question =
                        item?.question ||
                        item?.pergunta ||
                        item?.q ||
                        '';

                      const answer =
                        item?.answer ||
                        item?.resposta ||
                        item?.a ||
                        '';

                      if (!question && !answer) return '';

                      return `
                        <div class="faq-item">
                          <strong>${esc(question)}</strong>
                          <p>${esc(answer)}</p>
                        </div>
                      `;
                    })
                    .join('')}
                </div>
              </section>
            `
            : ''
        }

      </div>

      <aside class="product-detail-side">

        <div class="product-discord-box">

          <div class="product-side-title">
            Discord
          </div>

          ${
            discordSession
              ? `
                <div class="discord-connected-card">
                  ${
                    discordSession.avatar
                      ? `<img
                          class="discord-user-avatar"
                          src="${esc(discordSession.avatar)}"
                          alt="Avatar"
                        >`
                      : ''
                  }

                  <div>
                    <small>Conectado como</small>
                    <strong class="discord-user-name">
                      ${esc(firstDiscordName(discordSession))}
                    </strong>
                  </div>
                </div>
              `
              : `
                <p>
                  Conecte seu Discord para identificar sua compra.
                </p>

                <button
                  class="discord-login"
                  type="button"
                  onclick="openDiscordLogin()"
                >
                  Conectar Discord
                </button>
              `
          }

        </div>

        <div class="product-recipient-box">

          <label for="productRecipientId">
            ID / Passaporte do destinatário
          </label>

          <input
            id="productRecipientId"
            type="text"
            inputmode="numeric"
            autocomplete="off"
            value="${esc(recipientId)}"
            placeholder="Digite o ID / Passaporte"
          >

          <small>
            Confira o ID antes de finalizar a compra.
          </small>

        </div>

        <button
          class="product-buy-button"
          type="button"
          onclick="addProductToCartFromModal('${esc(product.id)}')"
        >
          Adicionar ao carrinho
        </button>

        <button
          class="product-gift-button"
          type="button"
          onclick="giftProductFromModal('${esc(product.id)}')"
        >
          🎁 Presentear alguém
        </button>

      </aside>

    </div>
  `;

  modal.classList.add('open');
  document.body.classList.add('modal-open');

  const recipientInput = $('#productRecipientId');

  recipientInput?.addEventListener('input', () => {
    sessionStorage.setItem(
      'sapucaia_recipient_id',
      recipientInput.value.trim()
    );
  });
}

function addProductToCartFromModal(id) {
  const product = products.find(
    (item) => String(item.id) === String(id)
  );

  if (!product) return;

  const recipient = $('#productRecipientId')?.value.trim() || '';

  if (!recipient) {
    alert('Informe o ID / Passaporte do destinatário.');
    $('#productRecipientId')?.focus();
    return;
  }

  sessionStorage.setItem(
    'sapucaia_recipient_id',
    recipient
  );

  sessionStorage.removeItem('sapucaia_gift_mode');

  addToCart(product, 1);
  closeProductModal();

  openCart();
}

function giftProductFromModal(id) {
  const product = products.find(
    (item) => String(item.id) === String(id)
  );

  if (!product) return;

  const recipient = $('#productRecipientId')?.value.trim() || '';

  if (!recipient) {
    alert('Informe o ID / Passaporte do destinatário.');
    $('#productRecipientId')?.focus();
    return;
  }

  sessionStorage.setItem(
    'sapucaia_recipient_id',
    recipient
  );

  sessionStorage.setItem('sapucaia_gift_mode', '1');

  addToCart(product, 1);
  closeProductModal();

  openCart();
}

function openCart() {
  const backdrop = $('#cartBackdrop');

  if (!backdrop) return;

  backdrop.classList.add('open');
  document.body.classList.add('modal-open');

  renderCart();
}

function closeCart() {
  const backdrop = $('#cartBackdrop');

  if (!backdrop) return;

  backdrop.classList.remove('open');
  document.body.classList.remove('modal-open');
}

function renderCart() {
  const container = $('#cartItems');

  if (!container) return;

  if (!cart.length) {
    container.innerHTML = `
      <div class="empty-cart">
        Seu carrinho está vazio.
      </div>
    `;
  } else {
    container.innerHTML = cart
      .map(
        (item) => `
          <div class="cart-item">

            ${
              item.img
                ? `
                  <img
                    src="${esc(item.img)}"
                    alt="${esc(item.name)}"
                  >
                `
                : ''
            }

            <div class="cart-item-info">
              <strong>${esc(item.name)}</strong>
              <span>${money(item.price)}</span>
            </div>

            <div class="cart-item-actions">
              <button
                type="button"
                onclick="changeCartQty('${esc(item.id)}', -1)"
              >−</button>

              <span>${Number(item.qty || 1)}</span>

              <button
                type="button"
                onclick="changeCartQty('${esc(item.id)}', 1)"
              >+</button>

              <button
                type="button"
                onclick="removeFromCart('${esc(item.id)}')"
              >×</button>
            </div>

          </div>
        `
      )
      .join('');
  }

  const subtotal = $('#cartSubtotal');
  const discount = $('#cartDiscount');
  const total = $('#cartTotal');

  if (subtotal) subtotal.textContent = money(cartSubtotal());
  if (discount) discount.textContent = money(cartDiscount());
  if (total) total.textContent = money(cartTotal());

  updateCartBadge();
}

function openCheckout() {
  if (!cart.length) {
    alert('Seu carrinho está vazio.');
    return;
  }

  const recipient =
    sessionStorage.getItem('sapucaia_recipient_id') || '';

  const checkoutRecipient = $('#checkoutRecipient');

  if (checkoutRecipient && !checkoutRecipient.value) {
    checkoutRecipient.value = recipient;
  }

  $('#checkoutModal')?.classList.add('open');
  document.body.classList.add('modal-open');

  validatePersonal();
  validateDelivery();
  renderCheckoutSummary();
}

function closeCheckout() {
  $('#checkoutModal')?.classList.remove('open');
  document.body.classList.remove('modal-open');

  if (checkoutPoll) {
    clearInterval(checkoutPoll);
    checkoutPoll = null;
  }
}

function validatePersonal() {
  const cpf = $('#checkoutCpf')?.value.trim() || '';
  const phone = $('#checkoutPhone')?.value.trim() || '';

  const validCpf = cpf.replace(/\D/g, '').length >= 11;
  const validPhone = phone.replace(/\D/g, '').length >= 10;

  return validCpf && validPhone;
}

function validateDelivery() {
  const recipient =
    $('#checkoutRecipient')?.value.trim() || '';

  return recipient.length > 0;
}

function checkoutPayload() {
  const recipientId =
    $('#checkoutRecipient')?.value.trim() ||
    sessionStorage.getItem('sapucaia_recipient_id') ||
    '';

  const cpf =
    $('#checkoutCpf')?.value.replace(/\D/g, '') || '';

  const phone =
    $('#checkoutPhone')?.value.replace(/\D/g, '') || '';

  const giftMode =
    sessionStorage.getItem('sapucaia_gift_mode') === '1';

  return {
    items: cart.map((item) => ({
      id: item.id,
      qty: Number(item.qty || 1)
    })),

    coupon: coupon?.code || '',

    paymentMethod: checkoutMethod,

    customer: {
      cpf,
      phone
    },

    delivery: {
      recipientId,
      recipientDiscord: discordSession?.id || '',
      giftMode
    },

    giftMode
  };
}

function renderCheckoutSummary() {
  const container = $('#checkoutSummary');

  if (!container) return;

  if (!cart.length) {
    container.innerHTML = '<p>Seu carrinho está vazio.</p>';
    return;
  }

  container.innerHTML = cart
    .map(
      (item) => `
        <div class="checkout-summary-item">
          <span>
            ${esc(item.name)}
            ×${Number(item.qty || 1)}
          </span>

          <strong>
            ${money(Number(item.price || 0) * Number(item.qty || 1))}
          </strong>
        </div>
      `
    )
    .join('');

  const subtotal = $('#checkoutSubtotal');
  const discount = $('#checkoutDiscount');
  const total = $('#checkoutTotal');

  if (subtotal) subtotal.textContent = money(cartSubtotal());
  if (discount) discount.textContent = money(cartDiscount());
  if (total) total.textContent = money(cartTotal());
}

function applyCoupon() {
  const input = $('#couponInput');

  if (!input) return;

  const code = input.value.trim().toUpperCase();

  if (!code) {
    coupon = null;
    renderCart();
    renderCheckoutSummary();
    return;
  }

  const configuredCode = String(
    storeSettings.couponCode || ''
  ).trim().toUpperCase();

  const configuredPercent = Number(
    storeSettings.couponPercent || 0
  );

  if (
    configuredCode &&
    code === configuredCode &&
    configuredPercent > 0
  ) {
    coupon = {
      code,
      percent: configuredPercent
    };

    alert(`Cupom aplicado: ${configuredPercent}% de desconto.`);
  } else {
    coupon = null;
    alert('Cupom inválido.');
  }

  renderCart();
  renderCheckoutSummary();
}

function setCheckoutMethod(method) {
  const allowed = ['pix', 'mercadopago', 'infinitepay'];

  checkoutMethod = allowed.includes(method)
    ? method
    : 'pix';

  $$('.payment-option').forEach((button) => {
    button.classList.toggle(
      'active',
      button.dataset.method === checkoutMethod
    );
  });
}

function setCheckoutStep(step) {
  $$('.checkout-step').forEach((element) => {
    element.classList.toggle(
      'active',
      element.dataset.step === String(step)
    );
  });

  $$('.checkout-progress-item').forEach((element) => {
    element.classList.toggle(
      'active',
      Number(element.dataset.step) <= Number(step)
    );
  });
}

function nextCheckoutStep() {
  const active =
    $('.checkout-step.active') ||
    $('.checkout-step[data-step="1"]');

  const current = Number(active?.dataset.step || 1);

  if (current === 1 && !validatePersonal()) {
    alert('Preencha corretamente seus dados.');
    return;
  }

  if (current === 2 && !validateDelivery()) {
    alert('Informe o ID / Passaporte do destinatário.');
    return;
  }

  setCheckoutStep(Math.min(3, current + 1));
}

function previousCheckoutStep() {
  const active =
    $('.checkout-step.active') ||
    $('.checkout-step[data-step="1"]');

  const current = Number(active?.dataset.step || 1);

  setCheckoutStep(Math.max(1, current - 1));
}

async function createPayment() {
  if (!cart.length) {
    alert('Seu carrinho está vazio.');
    return;
  }

  if (!validatePersonal()) {
    alert('Preencha corretamente seus dados.');
    setCheckoutStep(1);
    return;
  }

  if (!validateDelivery()) {
    alert('Informe o ID / Passaporte do destinatário.');
    setCheckoutStep(2);
    return;
  }

  const button =
    $('#finishCheckout') ||
    $('#createPayment');

  if (button) {
    button.disabled = true;
    button.textContent = 'Processando...';
  }

  try {
    const payload = checkoutPayload();

    const data = await api('/api/checkout', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!data?.ok) {
      throw new Error(
        data?.error || 'Não foi possível criar o pagamento.'
      );
    }

    checkoutOrderId = data.orderId || null;

    sessionStorage.removeItem('sapucaia_gift_mode');
    sessionStorage.removeItem('sapucaia_recipient_id');

    if (data.redirectUrl) {
      window.location.href = data.redirectUrl;
      return;
    }

    if (data.pix) {
      renderPixPayment(data);
      return;
    }

    if (data.qrCode || data.qr_code) {
      renderPixPayment(data);
      return;
    }

    if (checkoutOrderId) {
      startPaymentPoll(checkoutOrderId);
    } else {
      showPaymentSuccess(data);
    }
  } catch (error) {
    console.error(error);
    alert(error.message || 'Erro ao processar pagamento.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Finalizar pagamento';
    }
  }
}

function renderPixPayment(data) {
  const modal = $('#paymentModal');
  const content = $('#paymentContent');

  if (!modal || !content) return;

  const pix =
    data.pix ||
    data.qrCode ||
    data.qr_code ||
    {};

  const qrImage =
    pix.qrCodeBase64 ||
    pix.qr_code_base64 ||
    pix.image ||
    data.qrCodeBase64 ||
    '';

  const copyCode =
    pix.copyPaste ||
    pix.copy_paste ||
    pix.qrCode ||
    pix.qr_code ||
    data.copyPaste ||
    '';

  content.innerHTML = `
    <div class="payment-screen">

      <h2>Pagamento via Pix</h2>

      ${
        qrImage
          ? `
            <img
              class="payment-qr"
              src="${esc(
                qrImage.startsWith('data:')
                  ? qrImage
                  : `data:image/png;base64,${qrImage}`
              )}"
              alt="QR Code Pix"
            >
          `
          : ''
      }

      ${
        copyCode
          ? `
            <div class="pix-copy-box">
              <input
                id="pixCopyInput"
                readonly
                value="${esc(copyCode)}"
              >

              <button
                type="button"
                id="copyPixButton"
              >
                Copiar Pix
              </button>
            </div>
          `
          : ''
      }

      <p>
        Após realizar o pagamento, aguarde a confirmação automática.
      </p>

      <div id="paymentStatus">
        Aguardando pagamento...
      </div>

    </div>
  `;

  modal.classList.add('open');
  document.body.classList.add('modal-open');

  $('#copyPixButton')?.addEventListener('click', async () => {
    const input = $('#pixCopyInput');

    if (!input?.value) return;

    try {
      await navigator.clipboard.writeText(input.value);

      $('#copyPixButton').textContent = 'Copiado!';
    } catch {
      input.select();
      document.execCommand('copy');

      $('#copyPixButton').textContent = 'Copiado!';
    }
  });

  if (checkoutOrderId) {
    startPaymentPoll(checkoutOrderId);
  }
}

async function pollPayment(orderId) {
  if (!orderId) return false;

  try {
    const data = await api(
      `/api/payment-status?orderId=${encodeURIComponent(orderId)}`
    );

    const status = String(
      data?.status || data?.order?.status || ''
    ).toLowerCase();

    const statusElement = $('#paymentStatus');

    if (
      statusElement &&
      ['pending', 'aguardando', 'waiting'].includes(status)
    ) {
      statusElement.textContent =
        'Aguardando confirmação do pagamento...';
    }

    if (
      ['paid', 'pago', 'approved', 'aprovado'].includes(status)
    ) {
      showPaymentSuccess(data);
      return true;
    }

    if (
      ['cancelled', 'canceled', 'cancelado', 'rejected', 'rejeitado'].includes(status)
    ) {
      if (statusElement) {
        statusElement.textContent =
          'Pagamento não aprovado.';
      }

      return true;
    }
  } catch (error) {
    console.error('Erro ao consultar pagamento:', error);
  }

  return false;
}

function startPaymentPoll(orderId) {
  if (!orderId) return;

  if (checkoutPoll) {
    clearInterval(checkoutPoll);
  }

  pollPayment(orderId);

  checkoutPoll = setInterval(async () => {
    const finished = await pollPayment(orderId);

    if (finished) {
      clearInterval(checkoutPoll);
      checkoutPoll = null;
    }
  }, 5000);
}

function showPaymentSuccess(data = {}) {
  if (checkoutPoll) {
    clearInterval(checkoutPoll);
    checkoutPoll = null;
  }

  const modal = $('#paymentModal');
  const content = $('#paymentContent');

  if (!modal || !content) return;

  content.innerHTML = `
    <div class="payment-screen payment-success">

      <div class="payment-success-icon">
        ✓
      </div>

      <h2>Pagamento confirmado!</h2>

      <p>
        Seu pedido foi confirmado com sucesso.
      </p>

      ${
        checkoutOrderId
          ? `
            <p>
              Pedido:
              <strong>${esc(checkoutOrderId)}</strong>
            </p>
          `
          : ''
      }

      <button
        type="button"
        onclick="closePaymentModal()"
      >
        Fechar
      </button>

    </div>
  `;

  modal.classList.add('open');
}

function closePaymentModal() {
  if (checkoutPoll) {
    clearInterval(checkoutPoll);
    checkoutPoll = null;
  }

  $('#paymentModal')?.classList.remove('open');
  document.body.classList.remove('modal-open');
}

function bindEvents() {
  $('#cartButton')?.addEventListener('click', openCart);
  $('#cartClose')?.addEventListener('click', closeCart);

  $('#cartBackdrop')?.addEventListener('click', (event) => {
    if (event.target === $('#cartBackdrop')) {
      closeCart();
    }
  });

  $('#checkout')?.addEventListener('click', openCheckout);

  $('#checkoutClose')?.addEventListener(
    'click',
    closeCheckout
  );

  $('#checkoutModal')?.addEventListener('click', (event) => {
    if (event.target === $('#checkoutModal')) {
      closeCheckout();
    }
  });

  $('#productModal')?.addEventListener('click', (event) => {
    if (event.target === $('#productModal')) {
      closeProductModal();
    }
  });

  $('#couponButton')?.addEventListener(
    'click',
    applyCoupon
  );

  $('#couponInput')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyCoupon();
    }
  });

  $('#checkoutNext')?.addEventListener(
    'click',
    nextCheckoutStep
  );

  $('#checkoutBack')?.addEventListener(
    'click',
    previousCheckoutStep
  );

  $('#finishCheckout')?.addEventListener(
    'click',
    createPayment
  );

  $('#createPayment')?.addEventListener(
    'click',
    createPayment
  );

  $('#checkoutCpf')?.addEventListener(
    'input',
    validatePersonal
  );

  $('#checkoutPhone')?.addEventListener(
    'input',
    validatePersonal
  );

  $('#checkoutRecipient')?.addEventListener(
    'input',
    (event) => {
      sessionStorage.setItem(
        'sapucaia_recipient_id',
        event.target.value.trim()
      );

      validateDelivery();
    }
  );

  $$('.payment-option').forEach((button) => {
    button.addEventListener('click', () => {
      setCheckoutMethod(button.dataset.method);
    });
  });

  $$('.discord-login').forEach((button) => {
    button.addEventListener(
      'click',
      openDiscordLogin
    );
  });

  $('#paymentClose')?.addEventListener(
    'click',
    closePaymentModal
  );

  $('#paymentModal')?.addEventListener('click', (event) => {
    if (event.target === $('#paymentModal')) {
      closePaymentModal();
    }
  });
}

async function loadStoreCatalog() {
  try {
    const data = await api(
      '/api/store?resource=public'
    );

    products = Array.isArray(data.products)
      ? data.products
      : [];

    storeSettings = data.settings || {};

    applySettings(storeSettings);

    renderProducts();
    updateCartBadge();

    if ($('#cartBackdrop')?.classList.contains('open')) {
      renderCart();
    }

    if ($('#checkoutModal')?.classList.contains('open')) {
      renderCheckoutSummary();
    }
  } catch (error) {
    console.error(
      'Erro ao carregar catálogo:',
      error
    );
  }
}

function renderProducts() {
  const containers = $$('[data-products]');

  containers.forEach((container) => {
    const category =
      container.dataset.products || '';

    const filtered = category
      ? products.filter(
          (product) =>
            String(product.cat || '').toLowerCase() ===
            category.toLowerCase()
        )
      : products;

    container.innerHTML = filtered
      .map(
        (product) => `
          <article
            class="product-card"
            data-product-id="${esc(product.id)}"
          >

            <div class="product-card-image">
              <img
                src="${esc(
                  product.img ||
                    'assets/banner-sapucaia.png'
                )}"
                alt="${esc(product.name)}"
                loading="lazy"
              >
            </div>

            <div class="product-card-content">

              ${
                product.tag
                  ? `
                    <span class="product-tag">
                      ${esc(product.tag)}
                    </span>
                  `
                  : ''
              }

              <h3>${esc(product.name)}</h3>

              <p>
                ${esc(
                  product.desc ||
                    'Confira os detalhes deste produto.'
                )}
              </p>

              <div class="product-card-footer">

                <strong>
                  ${money(product.price)}
                </strong>

                <button
                  type="button"
                  onclick="openProduct('${esc(product.id)}')"
                >
                  Ver detalhes
                </button>

              </div>

            </div>

          </article>
        `
      )
      .join('');
  });
}

document.addEventListener(
  'DOMContentLoaded',
  async () => {
    bindEvents();

    updateCartBadge();

    setCheckoutMethod('pix');
    setCheckoutStep(1);

    await loadStoreCatalog();
    await loadDiscordSession();

    setInterval(
      loadStoreCatalog,
      10000
    );
  }
);

window.openProduct = openProduct;
window.closeProductModal = closeProductModal;
window.addProductToCartFromModal =
  addProductToCartFromModal;
window.giftProductFromModal =
  giftProductFromModal;

window.openCart = openCart;
window.closeCart = closeCart;
window.removeFromCart = removeFromCart;
window.changeCartQty = changeCartQty;

window.openCheckout = openCheckout;
window.closeCheckout = closeCheckout;

window.applyCoupon = applyCoupon;
window.createPayment = createPayment;

window.closePaymentModal =
  closePaymentModal;

window.openDiscordLogin =
  openDiscordLogin;
