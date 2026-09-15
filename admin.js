```javascript
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

/* =========================================================
   CONFIGURAÇÃO PADRÃO
   ========================================================= */

const DEFAULT_APPEARANCE = {
  shopName: 'SAPUCAIA',
  city: 'RIO DE JANEIRO',
  heroTitle: 'SAPUCAIA',
  heroSubtitle: 'RIO DE JANEIRO',
  heroButtonText: 'Ver produtos',
  heroButtonUrl: '#categorias',

  primaryColor: '#ff087f',
  secondaryColor: '#ff4fa3',
  backgroundColor: '#06060a',
  surfaceColor: '#0d0d13',
  textColor: '#ffffff',
  mutedColor: '#a6a0aa',
  buttonColor: '#ff087f',
  buttonHoverColor: '#ff4fa3',
  borderColor: '#ff087f',
  priceColor: '#ffffff',

  banner: 'assets/banner-sapucaia.png',
  bannerFit: 'fill',
  bannerEffect: 'glow-scan',
  bannerIntensity: 70,
  bannerSpeed: 1,
  bannerRadius: 2,
  bannerHeight: 455,

  backgroundImage: '',
  backgroundSize: 'cover',
  backgroundOpacity: 45,
  backgroundBlur: 0,
  backgroundDarkness: 35,

  buttonStyle: 'rounded',
  buttonRadius: 14,
  buttonHeight: 46,
  buttonHoverScale: 103,
  buttonGlow: true,
  buttonShadow: true,
  buttonBorder: true,
  buttonAnimation: 'shine',

  headingFont: 'Arial',
  bodyFont: 'Arial',
  buttonFont: 'Arial',
  headingWeight: 800,
  headingSize: 42,
  bodySize: 14,
  buttonFontSize: 13,
  letterSpacing: 1,

  cardRadius: 18,
  cardGlow: true,
  cardBorder: true,
  cardLift: 8,
  cardPadding: 16,
  cardImageHeight: 220,

  marqueeText: 'SAPUCAIA50 50% EM TODOS OS PRODUTOS',
  marqueeSpeed: 26,
  marqueeGlow: true,
  marqueeSize: 13,
  marqueeGap: 45,

  contentMaxWidth: 1560,
  sectionGap: 24,
  productColumns: 3,
  globalRadius: 18,

  fxParticles: true,
  fxStars: true,
  fxGrid: true,
  fxNoise: true,
  fxCursorGlow: true,
  reducedMotion: false,

  effectsIntensity: 75,
  vignette: 35
};

/* =========================================================
   ESTADO
   ========================================================= */

const state = {
  products: [],
  orders: [],
  customers: [],
  settings: {},
  draft: structuredClone(DEFAULT_APPEARANCE),

  history: [],
  historyIndex: -1,

  editing: null
};

/* =========================================================
   UTILIDADES
   ========================================================= */

const money = (n) =>
  Number(n || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

const esc = (v) =>
  String(v ?? '').replace(
    /[&<>'"]/g,
    (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    })[c]
  );

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function toast(message) {
  const el = $('#toast');

  if (!el) return;

  el.textContent = message;
  el.classList.add('show');

  clearTimeout(window.__toastTimer);

  window.__toastTimer = setTimeout(() => {
    el.classList.remove('show');
  }, 2600);
}

/* =========================================================
   API
   ========================================================= */

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...options
  });

  const text = await response.text();

  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `Resposta inválida do servidor (${response.status}).`
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      `Erro ${response.status}`
    );
  }

  return data;
}

/* =========================================================
   TELAS
   ========================================================= */

function showSetup() {
  $('#setupScreen')?.classList.remove('hidden');
  $('#loginScreen')?.classList.add('hidden');
  $('#app')?.classList.add('hidden');
}

function showLogin() {
  $('#setupScreen')?.classList.add('hidden');
  $('#loginScreen')?.classList.remove('hidden');
  $('#app')?.classList.add('hidden');
}

function showApp() {
  $('#setupScreen')?.classList.add('hidden');
  $('#loginScreen')?.classList.add('hidden');
  $('#app')?.classList.remove('hidden');
}

/* =========================================================
   LOGIN
   ========================================================= */

async function boot() {
  try {
    const session = await api('/api/auth');

    if (session.authenticated) {
      showApp();

      if ($('#securityUser')) {
        $('#securityUser').value =
          session.username || '';
      }

      await loadAll();

      return;
    }

    session.setupRequired
      ? showSetup()
      : showLogin();

  } catch (error) {
    console.error(error);

    showLogin();

    toast('Backend indisponível.');
  }
}

async function setupAdmin() {
  const username =
    $('#setupUser')?.value.trim() || '';

  const password =
    $('#setupPass')?.value || '';

  const confirmation =
    $('#setupConfirm')?.value || '';

  if (
    username.length < 3 ||
    password.length < 8 ||
    password !== confirmation
  ) {
    toast(
      'Usuário mínimo de 3 e senha mínima de 8 caracteres.'
    );

    return;
  }

  const button = $('#setupBtn');

  if (button) button.disabled = true;

  try {
    await api('/api/auth', {
      method: 'POST',

      headers: {
        'content-type': 'application/json'
      },

      body: JSON.stringify({
        action: 'setup',
        username,
        password,
        confirmation
      })
    });

    if ($('#securityUser')) {
      $('#securityUser').value = username;
    }

    showApp();

    await loadAll();

    toast('ADM criado com sucesso.');

  } catch (error) {
    toast(error.message);

  } finally {
    if (button) button.disabled = false;
  }
}

async function login() {
  const username =
    $('#loginUser')?.value.trim() || '';

  const password =
    $('#loginPass')?.value || '';

  if (!username || !password) {
    toast('Informe usuário e senha.');
    return;
  }

  const button = $('#loginBtn');

  if (button) button.disabled = true;

  try {
    await api('/api/auth', {
      method: 'POST',

      headers: {
        'content-type': 'application/json'
      },

      body: JSON.stringify({
        username,
        password
      })
    });

    if ($('#securityUser')) {
      $('#securityUser').value = username;
    }

    showApp();

    await loadAll();

    toast('Login realizado.');

  } catch (error) {
    toast(error.message);

  } finally {
    if (button) button.disabled = false;
  }
}

$('#loginBtn')?.addEventListener(
  'click',
  login
);

$('#loginPass')?.addEventListener(
  'keydown',
  (e) => {
    if (e.key === 'Enter') login();
  }
);

$('#setupBtn')?.addEventListener(
  'click',
  setupAdmin
);

$('#setupConfirm')?.addEventListener(
  'keydown',
  (e) => {
    if (e.key === 'Enter') setupAdmin();
  }
);

$('#logoutBtn')?.addEventListener(
  'click',
  async () => {

    await api('/api/auth', {
      method: 'POST',

      headers: {
        'content-type': 'application/json'
      },

      body: JSON.stringify({
        action: 'logout'
      })
    }).catch(() => {});

    location.reload();
  }
);

/* =========================================================
   NAVEGAÇÃO
   ========================================================= */

const titles = {
  dashboard: 'Dashboard',
  products: 'Produtos',
  appearance: 'Editor visual',
  orders: 'Pedidos',
  customers: 'Clientes',
  coupons: 'Cupons',
  payments: 'Pagamentos',
  delivery: 'Entrega FiveM',
  discord: 'Discord',
  support: 'Suporte & FAQ',
  security: 'Segurança'
};

function go(page) {
  if (!page) return;

  $$('.page').forEach((el) => {
    el.classList.remove('active-page');
  });

  $('#' + page)?.classList.add(
    'active-page'
  );

  $$('.side-link').forEach((el) => {
    el.classList.toggle(
      'active',
      el.dataset.page === page
    );
  });

  if ($('#pageTitle')) {
    $('#pageTitle').textContent =
      titles[page] || 'Painel';
  }

  history.replaceState(
    null,
    '',
    `#${page}`
  );

  renderPage(page);
}

$$('.side-link').forEach((button) => {
  button.addEventListener(
    'click',
    () => go(button.dataset.page)
  );
});

$$('[data-goto]').forEach((button) => {
  button.addEventListener(
    'click',
    () => go(button.dataset.goto)
  );
});

$('#mobileMenu')?.addEventListener(
  'click',
  () =>
    $('.sidebar')?.classList.toggle(
      'open'
    )
);

/* =========================================================
   CARREGAR DADOS
   ========================================================= */

async function loadAll() {
  try {
    const [
      products,
      orders,
      customers,
      settings
    ] = await Promise.all([
      api('/api/store?resource=products'),
      api('/api/store?resource=orders'),
      api('/api/store?resource=customers'),
      api('/api/store?resource=settings-admin')
    ]);

    state.products =
      products.products || [];

    state.orders =
      orders.orders || [];

    state.customers =
      customers.customers || [];

    state.settings = {
      ...DEFAULT_APPEARANCE,
      ...(settings.settings || {})
    };

    state.draft =
      clone(state.settings);

    resetHistory();

    fillAllSettings();

    renderAll();

    const page =
      location.hash.slice(1);

    if (
      page &&
      $('#' + page)
    ) {
      go(page);
    }

  } catch (error) {
    console.error(error);

    if (
      error.message.includes(
        'Não autorizado'
      )
    ) {
      return showLogin();
    }

    toast(error.message);
  }
}

/* =========================================================
   RENDER GERAL
   ========================================================= */

function renderAll() {
  renderDashboard();
  renderProducts();
  renderOrders();
  renderCustomers();
  renderCoupon();
}

function renderPage(page) {
  if (page === 'dashboard')
    renderDashboard();

  if (page === 'products')
    renderProducts();

  if (page === 'appearance')
    renderEditor();

  if (page === 'orders')
    renderOrders();

  if (page === 'customers')
    renderCustomers();

  if (page === 'coupons')
    renderCoupon();

  if (
    [
      'payments',
      'delivery',
      'discord',
      'support'
    ].includes(page)
  ) {
    fillAllSettings();
  }
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {
  const revenue =
    state.orders
      .filter(
        (o) =>
          o.status !== 'Cancelado'
      )
      .reduce(
        (sum, o) =>
          sum + Number(o.total || 0),
        0
      );

  if ($('#statProducts'))
    $('#statProducts').textContent =
      state.products.length;

  if ($('#statOrders'))
    $('#statOrders').textContent =
      state.orders.length;

  if ($('#statRevenue'))
    $('#statRevenue').textContent =
      money(revenue);

  if ($('#statCustomers'))
    $('#statCustomers').textContent =
      state.customers.length;

  if ($('#recentOrders')) {
    $('#recentOrders').innerHTML =
      state.orders.length
        ? `
          <table class="data-table">
            <thead>
              <tr>
                <th>PEDIDO</th>
                <th>STATUS</th>
                <th>TOTAL</th>
              </tr>
            </thead>

            <tbody>

              ${state.orders
                .slice(0, 6)
                .map(
                  (o) => `
                    <tr>
                      <td>
                        ${esc(o.id)}
                      </td>

                      <td>
                        ${esc(
                          o.status ||
                          'Aguardando pagamento'
                        )}
                      </td>

                      <td>
                        ${money(o.total)}
                      </td>
                    </tr>
                  `
                )
                .join('')}

            </tbody>
          </table>
        `
        : `
          <p class="muted">
            Nenhum pedido.
          </p>
        `;
  }

  const cats = {};

  state.products.forEach(
    (p) => {
      const category =
        p.cat ||
        'Sem categoria';

      cats[category] =
        (cats[category] || 0) + 1;
    }
  );

  const max = Math.max(
    1,
    ...Object.values(cats)
  );

  if ($('#categorySummary')) {
    $('#categorySummary').innerHTML =
      Object.entries(cats)
        .map(
          ([k, v]) => `
            <div class="cat-row">

              <span>
                ${esc(k)}
              </span>

              <div class="bar">
                <i
                  style="
                    width:${(v / max) * 100}%
                  "
                ></i>
              </div>

              <b>
                ${v}
              </b>

            </div>
          `
        )
        .join('') ||
      `
        <p class="muted">
          Nenhum produto.
        </p>
      `;
  }
}

/* =========================================================
   PRODUTOS
   ========================================================= */

function renderProducts() {
  const q =
    ($('#productSearch')?.value || '')
      .toLowerCase()
      .trim();

  const c =
    $('#productCat')?.value || '';

  const arr =
    state.products.filter(
      (p) =>
        (
          !q ||
          String(p.name || '')
            .toLowerCase()
            .includes(q)
        ) &&
        (
          !c ||
          p.cat === c
        )
    );

  if (!$('#productTable'))
    return;

  $('#productTable').innerHTML =
    arr.length
      ? `
        <table class="data-table">

          <thead>
            <tr>
              <th>PRODUTO</th>
              <th>CATEGORIA</th>
              <th>PREÇO</th>
              <th>STATUS</th>
              <th>DESTAQUE</th>
              <th>AÇÕES</th>
            </tr>
          </thead>

          <tbody>

            ${arr
              .map((p) => {

                const active =
                  p.active !== false;

                const featured =
                  p.featured === true ||
                  p.featured === 'true';

                return `
                  <tr>

                    <td>

                      <div class="product-mini">

                        <img
                          src="${esc(
                            p.img ||
                            'assets/banner-sapucaia.png'
                          )}"
                          alt=""
                        >

                        <span>
                          ${esc(p.name)}
                        </span>

                      </div>

                    </td>

                    <td>
                      ${esc(
                        p.cat ||
                        'Destaques'
                      )}
                    </td>

                    <td>
                      ${money(p.price)}
                    </td>

                    <td>

                      <span
                        class="
                          product-state
                          ${active ? 'active' : ''}
                        "
                      >
                        ${active ? 'Ativo' : 'Inativo'}
                      </span>

                    </td>

                    <td>

                      <span
                        class="
                          product-state
                          ${featured ? 'featured' : ''}
                        "
                      >
                        ${
                          featured
                            ? 'Destaque'
                            : 'Normal'
                        }
                      </span>

                    </td>

                    <td>

                      <button
                        class="action"
                        data-edit="${esc(p.id)}"
                      >
                        Editar
                      </button>

                      <button
                        class="action danger"
                        data-del="${esc(p.id)}"
                      >
                        Remover
                      </button>

                    </td>

                  </tr>
                `;
              })
              .join('')}

          </tbody>

        </table>
      `
      : `
        <div class="empty">
          Nenhum produto publicado pelo ADM.
        </div>
      `;

  $$('[data-edit]').forEach(
    (button) => {
      button.onclick = () =>
        openProduct(
          button.dataset.edit
        );
    }
  );

  $$('[data-del]').forEach(
    (button) => {
      button.onclick = () =>
        deleteProduct(
          button.dataset.del
        );
    }
  );
}

/* =========================================================
   EXCLUIR PRODUTO
   ========================================================= */

async function deleteProduct(id) {
  if (
    !confirm(
      'Remover este produto da loja?'
    )
  ) {
    return;
  }

  try {
    const d = await api(
      '/api/store?resource=products',
      {
        method: 'POST',

        headers: {
          'content-type':
            'application/json'
        },

        body: JSON.stringify({
          action: 'delete',
          id
        })
      }
    );

    state.products =
      d.products || [];

    renderAll();

    toast(
      'Produto removido.'
    );

  } catch (error) {
    toast(error.message);
  }
}

/* =========================================================
   ABRIR PRODUTO
   ========================================================= */

function openProduct(id = null) {
  state.editing = id;

  const p = id
    ? state.products.find(
        (x) =>
          String(x.id) ===
          String(id)
      )
    : null;

  if ($('#modalTitle')) {
    $('#modalTitle').textContent =
      p
        ? 'Editar produto'
        : 'Novo produto';
  }

  if ($('#fName'))
    $('#fName').value =
      p?.name || '';

  if ($('#fCat'))
    $('#fCat').value =
      p?.cat || 'Destaques';

  if ($('#fPrice'))
    $('#fPrice').value =
      p?.price ?? '';

  if ($('#fOld'))
    $('#fOld').value =
      p?.old ?? '';

  /*
   * NOVOS CAMPOS
   */

  if ($('#fFeatured'))
    $('#fFeatured').value =
      p?.featured
        ? 'true'
        : 'false';

  if ($('#fActive'))
    $('#fActive').value =
      p?.active === false
        ? 'false'
        : 'true';

  if ($('#fMainUrl'))
    $('#fMainUrl').value =
      p?.img || '';

  if ($('#fDesc'))
    $('#fDesc').value =
      p?.desc || '';

  if ($('#fDescImage1Url'))
    $('#fDescImage1Url').value =
      p?.descImage1 || '';

  if ($('#fDescImage2Url'))
    $('#fDescImage2Url').value =
      p?.descImage2 || '';

  if ($('#fFaq'))
    $('#fFaq').value =
      p?.faq || '';

  /*
   * LIMPAR UPLOADS
   */

  if ($('#fMainFile'))
    $('#fMainFile').value = '';

  if ($('#fDescImage1File'))
    $('#fDescImage1File').value = '';

  if ($('#fDescImage2File'))
    $('#fDescImage2File').value = '';

  if ($('#mainUploadStatus'))
    $('#mainUploadStatus').textContent =
      'Nenhuma nova imagem escolhida.';

  if ($('#descImage1Status'))
    $('#descImage1Status').textContent =
      'Nenhuma nova imagem escolhida.';

  if ($('#descImage2Status'))
    $('#descImage2Status').textContent =
      'Nenhuma nova imagem escolhida.';

  $('#productModal')?.classList.add(
    'open'
  );

  document.body.style.overflow =
    'hidden';

  updateProductPreview();
}

/* =========================================================
   FECHAR PRODUTO
   ========================================================= */

function closeProductModal() {
  $('#productModal')?.classList.remove(
    'open'
  );

  document.body.style.overflow =
    '';
}

$('#addProductBtn')?.addEventListener(
  'click',
  () => openProduct()
);

$('#closeProduct')?.addEventListener(
  'click',
  closeProductModal
);

$('#productModal')?.addEventListener(
  'click',
  (e) => {
    if (
      e.target.id ===
      'productModal'
    ) {
      closeProductModal();
    }
  }
);

/* =========================================================
   UPLOAD
   ========================================================= */

async function uploadFile(file) {
  const form =
    new FormData();

  form.append(
    'file',
    file
  );

  const response =
    await fetch(
      '/api/media',
      {
        method: 'POST',
        body: form,
        credentials: 'same-origin'
      }
    );

  const data =
    await response
      .json()
      .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
      'Falha no upload.'
    );
  }

  return data.url || '';
}

function validateImageFile(
  input,
  status
) {
  const file =
    input?.files?.[0];

  if (!file)
    return null;

  if (
    file.size >
    12 * 1024 * 1024
  ) {
    toast(
      'Imagem máxima: 12 MB.'
    );

    input.value = '';

    if (status) {
      status.textContent =
        'Nenhuma nova imagem escolhida.';
    }

    return null;
  }

  if (status) {
    status.textContent =
      `Arquivo selecionado: ${file.name}`;
  }

  return file;
}

$('#fMainFile')?.addEventListener(
  'change',
  () => {
    validateImageFile(
      $('#fMainFile'),
      $('#mainUploadStatus')
    );

    updateProductPreview();
  }
);

$('#fDescImage1File')?.addEventListener(
  'change',
  () => {
    validateImageFile(
      $('#fDescImage1File'),
      $('#descImage1Status')
    );

    updateProductPreview();
  }
);

$('#fDescImage2File')?.addEventListener(
  'change',
  () => {
    validateImageFile(
      $('#fDescImage2File'),
      $('#descImage2Status')
    );

    updateProductPreview();
  }
);

/* =========================================================
   SALVAR PRODUTO
   ========================================================= */

async function saveProduct(
  publish = true
) {
  const name =
    $('#fName')?.value.trim() || '';

  const cat =
    $('#fCat')?.value || '';

  const price =
    Number(
      $('#fPrice')?.value
    );

  if (
    !name ||
    !cat ||
    !Number.isFinite(price) ||
    price <= 0
  ) {
    toast(
      'Preencha nome, categoria e preço.'
    );

    return;
  }

  const button =
    $('#saveProduct');

  const draftButton =
    $('#saveProductDraft');

  if (button)
    button.disabled = true;

  if (draftButton)
    draftButton.disabled = true;

  if (button) {
    button.textContent =
      publish
        ? 'Publicando...'
        : 'Salvando...';
  }

  try {

    const old =
      state.editing
        ? state.products.find(
            (p) =>
              String(p.id) ===
              String(state.editing)
          )
        : null;

    /*
     * CAPA
     */

    let img =
      $('#fMainUrl')?.value.trim() ||
      old?.img ||
      '';

    const mainFile =
      $('#fMainFile')
        ?.files?.[0];

    if (mainFile) {
      img =
        await uploadFile(
          mainFile
        );
    }

    /*
     * IMAGEM DESCRIÇÃO 1
     */

    let descImage1 =
      $('#fDescImage1Url')
        ?.value.trim() ||
      old?.descImage1 ||
      '';

    const descFile1 =
      $('#fDescImage1File')
        ?.files?.[0];

    if (descFile1) {
      descImage1 =
        await uploadFile(
          descFile1
        );
    }

    /*
     * IMAGEM DESCRIÇÃO 2
     */

    let descImage2 =
      $('#fDescImage2Url')
        ?.value.trim() ||
      old?.descImage2 ||
      '';

    const descFile2 =
      $('#fDescImage2File')
        ?.files?.[0];

    if (descFile2) {
      descImage2 =
        await uploadFile(
          descFile2
        );
    }

    /*
     * IMAGENS DO PRODUTO
     */

    const images = [
      img,
      descImage1,
      descImage2
    ].filter(Boolean);

    /*
     * DADOS DO PRODUTO
     */

    const product = {

      id:
        state.editing ||
        crypto.randomUUID(),

      name,

      cat,

      price,

      old:
        Number(
          $('#fOld')?.value || 0
        ),

      featured:
        $('#fFeatured')?.value ===
        'true',

      active:
        $('#fActive')?.value !==
        'false',

      img,

      descImage1,

      descImage2,

      desc:
        $('#fDesc')
          ?.value.trim() || '',

      faq:
        $('#fFaq')
          ?.value.trim() || '',

      images,

      /*
       * RASCUNHO OU PUBLICADO
       */

      published:
        publish
    };

    const d =
      await api(
        '/api/store?resource=products',
        {
          method: 'POST',

          headers: {
            'content-type':
              'application/json'
          },

          body: JSON.stringify({
            action: 'save',
            product
          })
        }
      );

    if (
      !d.ok ||
      !d.product
    ) {
      throw new Error(
        'O backend não confirmou o salvamento.'
      );
    }

    state.products =
      d.products || [];

    closeProductModal();

    renderAll();

    toast(
      publish
        ? 'Produto publicado na loja.'
        : 'Rascunho salvo.'
    );

    state.editing = null;

  } catch (error) {

    console.error(error);

    toast(
      error.message
    );

  } finally {

    if (button)
      button.disabled = false;

    if (draftButton)
      draftButton.disabled = false;

    if (button)
      button.textContent =
        'Publicar produto';
  }
}

/* =========================================================
   BOTÕES DE PRODUTO
   ========================================================= */

$('#saveProduct')?.addEventListener(
  'click',
  () => saveProduct(true)
);

$('#saveProductDraft')?.addEventListener(
  'click',
  () => saveProduct(false)
);

/* =========================================================
   PREVIEW DO PRODUTO
   ========================================================= */

function updateProductPreview() {

  const preview =
    $('#productLivePreview') ||
    $('#productPreview');

  if (!preview)
    return;

  const name =
    $('#fName')?.value ||
    'Nome do produto';

  const cat =
    $('#fCat')?.value ||
    'Destaques';

  const price =
    Number(
      $('#fPrice')?.value || 0
    );

  const old =
    Number(
      $('#fOld')?.value || 0
    );

  const img =
    $('#fMainUrl')?.value ||
    'assets/banner-sapucaia.png';

  const desc =
    $('#fDesc')?.value ||
    'Descrição do produto.';

  const featured =
    $('#fFeatured')?.value ===
    'true';

  const active =
    $('#fActive')?.value !==
    'false';

  preview.innerHTML = `
    <div
      style="
        width:100%;
        max-width:460px;
        margin:auto;
        background:#0d0d13;
        border:1px solid rgba(255,255,255,.08);
        border-radius:20px;
        overflow:hidden;
        box-shadow:0 20px 60px rgba(0,0,0,.4);
      "
    >

      <div
        style="
          position:relative;
          height:220px;
          background:#08080c;
        "
      >

        <img
          src="${esc(img)}"
          style="
            width:100%;
            height:100%;
            object-fit:cover;
            display:block;
          "
          onerror="
            this.src='assets/banner-sapucaia.png'
          "
        >

        ${
          featured
            ? `
              <span
                style="
                  position:absolute;
                  top:12px;
                  left:12px;
                  padding:7px 10px;
                  border-radius:9px;
                  background:#ff087f;
                  color:#fff;
                  font-size:10px;
                  font-weight:800;
                "
              >
                DESTAQUE
              </span>
            `
            : ''
        }

        ${
          !active
            ? `
              <span
                style="
                  position:absolute;
                  top:12px;
                  right:12px;
                  padding:7px 10px;
                  border-radius:9px;
                  background:#22222b;
                  color:#aaa;
                  font-size:10px;
                  font-weight:800;
                "
              >
                INATIVO
              </span>
            `
            : ''
        }

      </div>

      <div
        style="
          padding:18px;
        "
      >

        <div
          style="
            color:#ff087f;
            font-size:10px;
            font-weight:800;
            text-transform:uppercase;
            letter-spacing:1.5px;
          "
        >
          ${esc(cat)}
        </div>

        <div
          style="
            color:#fff;
            font-size:21px;
            font-weight:800;
            margin-top:7px;
          "
        >
          ${esc(name)}
        </div>

        <div
          style="
            margin-top:9px;
          "
        >

          <strong
            style="
              color:#fff;
              font-size:20px;
            "
          >
            ${money(price)}
          </strong>

          ${
            old > 0
              ? `
                <span
                  style="
                    color:#777;
                    text-decoration:line-through;
                    font-size:11px;
                    margin-left:7px;
                  "
                >
                  ${money(old)}
                </span>
              `
              : ''
          }

        </div>

        <div
          style="
            margin-top:15px;
            color:#999;
            font-size:11px;
            line-height:1.6;
          "
        >
          ${esc(desc)}
        </div>

        <button
          style="
            width:100%;
            margin-top:16px;
            border:0;
            padding:12px;
            border-radius:12px;
            background:linear-gradient(
              135deg,
              #ff087f,
              #ff4fa3
            );
            color:#fff;
            font-weight:800;
          "
        >
          Adicionar ao carrinho
        </button>

      </div>

    </div>
  `;
}

[
  '#fName',
  '#fCat',
  '#fPrice',
  '#fOld',
  '#fFeatured',
  '#fActive',
  '#fMainUrl',
  '#fDescImage1Url',
  '#fDescImage2Url',
  '#fDesc',
  '#fFaq'
].forEach((selector) => {

  $(selector)?.addEventListener(
    'input',
    updateProductPreview
  );

  $(selector)?.addEventListener(
    'change',
    updateProductPreview
  );

});

/* =========================================================
   PESQUISA
   ========================================================= */

$('#productSearch')?.addEventListener(
  'input',
  renderProducts
);

$('#productCat')?.addEventListener(
  'change',
  renderProducts
);

/* =========================================================
   PEDIDOS
   ========================================================= */

function renderOrders() {
  const filter =
    $('#orderStatusFilter')
      ?.value || '';

  const arr =
    state.orders.filter(
      (o) =>
        !filter ||
        o.status === filter
    );

  if (!$('#orderTable'))
    return;

  $('#orderTable').innerHTML =
    arr.length
      ? `
        <table class="data-table">

          <thead>
            <tr>
              <th>PEDIDO</th>
              <th>DATA</th>
              <th>TOTAL</th>
              <th>STATUS</th>
              <th>AÇÃO</th>
            </tr>
          </thead>

          <tbody>

            ${arr
              .map(
                (o) => `
                  <tr>

                    <td>
                      ${esc(o.id)}
                    </td>

                    <td>
                      ${esc(
                        o.createdAt ||
                        '—'
                      )}
                    </td>

                    <td>
                      ${money(o.total)}
                    </td>

                    <td>
                      ${esc(
                        o.status ||
                        'Aguardando pagamento'
                      )}
                    </td>

                    <td>

                      <select
                        class="status-select"
                        data-id="${esc(o.id)}"
                      >

                        <option>
                          Aguardando pagamento
                        </option>

                        <option>
                          Pago
                        </option>

                        <option>
                          Entregue
                        </option>

                        <option>
                          Cancelado
                        </option>

                      </select>

                    </td>

                  </tr>
                `
              )
              .join('')}

          </tbody>

        </table>
      `
      : `
        <div class="empty">
          Nenhum pedido encontrado.
        </div>
      `;

  $$('.status-select').forEach(
    (select) => {

      const order =
        state.orders.find(
          (x) =>
            String(x.id) ===
            String(select.dataset.id)
        );

      if (order) {
        select.value =
          order.status ||
          'Aguardando pagamento';
      }

      select.onchange =
        () =>
          updateOrder(
            select.dataset.id,
            select.value
          );
    }
  );
}

async function updateOrder(
  id,
  status
) {
  try {

    await api(
      '/api/store?resource=orders',
      {
        method: 'POST',

        headers: {
          'content-type':
            'application/json'
        },

        body: JSON.stringify({
          action: 'status',
          id,
          status
        })
      }
    );

    const order =
      state.orders.find(
        (x) =>
          String(x.id) ===
          String(id)
      );

    if (order)
      order.status = status;

    renderDashboard();
    renderOrders();

    toast(
      'Status atualizado.'
    );

  } catch (error) {
    toast(error.message);
  }
}

$('#orderStatusFilter')?.addEventListener(
  'change',
  renderOrders
);

/* =========================================================
   CLIENTES
   ========================================================= */

function renderCustomers() {
  const arr =
    state.customers || [];

  if (!$('#customerTable'))
    return;

  $('#customerTable').innerHTML =
    arr.length
      ? `
        <table class="data-table">

          <thead>
            <tr>
              <th>CLIENTE</th>
              <th>DISCORD</th>
              <th>E-MAIL</th>
            </tr>
          </thead>

          <tbody>

            ${arr
              .map(
                (c) => `
                  <tr>

                    <td>
                      ${esc(
                        c.name ||
                        c.global_name ||
                        c.username ||
                        'Cliente'
                      )}
                    </td>

                    <td>
                      ${esc(
                        c.discord ||
                        c.id ||
                        '—'
                      )}
                    </td>

                    <td>
                      ${esc(
                        c.email ||
                        '—'
                      )}
                    </td>

                  </tr>
                `
              )
              .join('')}

          </tbody>

        </table>
      `
      : `
        <div class="empty">
          Nenhum cliente identificado.
        </div>
      `;
}

/* =========================================================
   CUPOM
   ========================================================= */

function renderCoupon() {
  const code =
    state.settings.couponCode ||
    'SAPUCAIA50';

  const percent =
    Number(
      state.settings.couponPercent ??
      50
    );

  if ($('#couponCodeAdmin'))
    $('#couponCodeAdmin').value =
      code;

  if ($('#couponPercentAdmin'))
    $('#couponPercentAdmin').value =
      percent;

  if ($('#couponPreview'))
    $('#couponPreview').textContent =
      code;

  if ($('#couponHeadline'))
    $('#couponHeadline').textContent =
      `${percent}% OFF EM TODOS OS PRODUTOS`;
}

/* =========================================================
   CONFIGURAÇÕES
   ========================================================= */

async function saveSettings(
  partial
) {
  const next = {
    ...state.settings,
    ...partial
  };

  try {

    const d =
      await api(
        '/api/store?resource=settings',
        {
          method: 'POST',

          headers: {
            'content-type':
              'application/json'
          },

          body: JSON.stringify({
            settings: next
          })
        }
      );

    state.settings = {
      ...DEFAULT_APPEARANCE,
      ...(d.settings || next)
    };

    state.draft =
      clone(state.settings);

    resetHistory();

    fillAllSettings();

    renderCoupon();

    toast(
      'Configurações salvas.'
    );

  } catch (error) {
    toast(error.message);
  }
}

$('#saveCoupon')?.addEventListener(
  'click',
  () =>
    saveSettings({
      couponCode:
        $('#couponCodeAdmin')
          ?.value
          .trim()
          .toUpperCase() || '',

      couponPercent:
        Math.max(
          0,
          Math.min(
            100,
            Number(
              $('#couponPercentAdmin')
                ?.value || 0
            )
          )
        )
    })
);

function fillAllSettings() {
  const s =
    state.settings || {};

  if ($('#paymentProvider'))
    $('#paymentProvider').value =
      s.paymentProvider ||
      'mercadopago';

  if ($('#pixEnabled'))
    $('#pixEnabled').value =
      String(
        s.pixEnabled !== false
      );

  if ($('#infinitePayEnabled'))
    $('#infinitePayEnabled').value =
      String(
        s.infinitePayEnabled === true
      );

  if ($('#infinitePayHandle'))
    $('#infinitePayHandle').value =
      s.infinitePayHandle || '';

  if ($('#fivemServerName'))
    $('#fivemServerName').value =
      s.fivemServerName ||
      'SAPUCAIA';

  if ($('#fivemWebhookUrl'))
    $('#fivemWebhookUrl').value =
      s.fivemWebhookUrl || '';

  if ($('#discordClientId'))
    $('#discordClientId').value =
      s.discordClientId || '';

  if ($('#discordRedirectUri'))
    $('#discordRedirectUri').value =
      s.discordRedirectUri || '';

  if ($('#discordScopes'))
    $('#discordScopes').value =
      s.discordScopes ||
      'identify email';

  if ($('#supportDiscordUrl'))
    $('#supportDiscordUrl').value =
      s.discordUrl || '';

  if ($('#supportUrl'))
    $('#supportUrl').value =
      s.supportUrl || '';

  if ($('#supportEmail'))
    $('#supportEmail').value =
      s.supportEmail || '';

  if ($('#termsUrl'))
    $('#termsUrl').value =
      s.termsUrl === 'terms.html'
        ? ''
        : s.termsUrl || '';

  if ($('#faqJson'))
    $('#faqJson').value =
      JSON.stringify(
        s.faq || [],
        null,
        2
      );

  fillEditor();
}

/* =========================================================
   EDITOR VISUAL
   ========================================================= */

const colorFields = [
  [
    '#colorPrimary',
    'primaryColor'
  ],

  [
    '#colorSecondary',
    'secondaryColor'
  ],

  [
    '#colorBackground',
    'backgroundColor'
  ],

  [
    '#colorSurface',
    'surfaceColor'
  ],

  [
    '#colorText',
    'textColor'
  ],

  [
    '#colorMuted',
    'mutedColor'
  ],

  [
    '#colorButton',
    'buttonColor'
  ],

  [
    '#colorButtonHover',
    'buttonHoverColor'
  ],

  [
    '#colorBorder',
    'borderColor'
  ],

  [
    '#colorPrice',
    'priceColor'
  ]
];

function pushHistory() {
  const current =
    clone(state.draft);

  const last =
    state.history[
      state.historyIndex
    ];

  if (
    last &&
    JSON.stringify(last) ===
      JSON.stringify(current)
  ) {
    return;
  }

  state.history =
    state.history.slice(
      0,
      state.historyIndex + 1
    );

  state.history.push(
    current
  );

  if (
    state.history.length >
    50
  ) {
    state.history.shift();
  }

  state.historyIndex =
    state.history.length - 1;

  updateHistoryButtons();
}

function resetHistory() {
  state.history = [
    clone(state.draft)
  ];

  state.historyIndex = 0;

  updateHistoryButtons();
}

function updateHistoryButtons() {
  if ($('#undoAppearance')) {
    $('#undoAppearance').disabled =
      state.historyIndex <= 0;
  }

  if ($('#redoAppearance')) {
    $('#redoAppearance').disabled =
      state.historyIndex >=
      state.history.length - 1;
  }
}

function applyDraftMutation(
  mutator
) {
  mutator(state.draft);

  pushHistory();

  fillEditor(false);

  postPreview();
}

function undo() {
  if (
    state.historyIndex <= 0
  ) {
    return;
  }

  state.historyIndex--;

  state.draft =
    clone(
      state.history[
        state.historyIndex
      ]
    );

  fillEditor(false);

  postPreview();

  updateHistoryButtons();
}

function redo() {
  if (
    state.historyIndex >=
    state.history.length - 1
  ) {
    return;
  }

  state.historyIndex++;

  state.draft =
    clone(
      state.history[
        state.historyIndex
      ]
    );

  fillEditor(false);

  postPreview();

  updateHistoryButtons();
}

function bindColor(
  colorId,
  key
) {
  const color =
    $(colorId);

  const hex =
    $(colorId + 'Hex');

  if (!color || !hex)
    return;

  color.oninput =
    () =>
      applyDraftMutation(
        (d) => {
          d[key] =
            color.value;
        }
      );

  hex.onchange =
    () => {

      const value =
        hex.value.trim();

      if (
        !/^#[\da-fA-F]{6}$/.test(
          value
        )
      ) {
        hex.value =
          dft(key);

        return;
      }

      applyDraftMutation(
        (d) => {
          d[key] =
            value.toLowerCase();
        }
      );
    };
}

function dft(key) {
  return (
    state.draft[key] ||
    DEFAULT_APPEARANCE[key] ||
    '#ff087f'
  );
}

colorFields.forEach(
  ([id, key]) =>
    bindColor(id, key)
);

function setRange(
  id,
  key,
  suffix = 'px',
  digits = 0
) {
  const el =
    $(id);

  const out =
    $(id + 'Out');

  if (!el)
    return;

  el.value =
    state.draft[key] ??
    DEFAULT_APPEARANCE[key] ??
    el.value;

  if (out) {
    out.textContent =
      Number(
        el.value
      ).toFixed(digits) +
      suffix;
  }

  el.oninput =
    () => {

      applyDraftMutation(
        (d) => {
          d[key] =
            Number(el.value);
        }
      );

      if (out) {
        out.textContent =
          Number(
            el.value
          ).toFixed(digits) +
          suffix;
      }
    };
}

function bindSelect(
  id,
  key
) {
  const el =
    $(id);

  if (!el)
    return;

  el.value =
    String(
      state.draft[key] ??
      DEFAULT_APPEARANCE[key] ??
      el.value
    );

  el.onchange =
    () => {

      applyDraftMutation(
        (d) => {

          const v =
            el.value;

          d[key] =
            v === 'true'
              ? true
              : v === 'false'
                ? false
                : v;
        }
      );
    };
}

function bindText(
  id,
  key
) {
  const el =
    $(id);

  if (!el)
    return;

  el.value =
    state.draft[key] ?? '';

  el.oninput =
    () =>
      applyDraftMutation(
        (d) => {
          d[key] =
            el.value;
        }
      );
}

function bindCheck(
  id,
  key
) {
  const el =
    $(id);

  if (!el)
    return;

  el.checked =
    state.draft[key] !==
    false;

  el.onchange =
    () =>
      applyDraftMutation(
        (d) => {
          d[key] =
            el.checked;
        }
      );
}

function fillEditor(
  resetBindings = true
) {
  const d =
    state.draft;

  colorFields.forEach(
    ([id, key]) => {

      const c =
        $(id);

      const h =
        $(id + 'Hex');

      if (c)
        c.value =
          d[key] ||
          DEFAULT_APPEARANCE[key];

      if (h)
        h.value =
          d[key] ||
          DEFAULT_APPEARANCE[key];
    }
  );

  const ranges = [

    [
      '#bannerIntensity',
      'bannerIntensity',
      '%'
    ],

    [
      '#bannerSpeed',
      'bannerSpeed',
      'x'
    ],

    [
      '#bannerRadius',
      'bannerRadius',
      'px'
    ],

    [
      '#bannerHeight',
      'bannerHeight',
      'px'
    ],

    [
      '#backgroundOpacity',
      'backgroundOpacity',
      '%'
    ],

    [
      '#backgroundBlur',
      'backgroundBlur',
      'px'
    ],

    [
      '#backgroundDarkness',
      'backgroundDarkness',
      '%'
    ],

    [
      '#buttonRadius',
      'buttonRadius',
      'px'
    ],

    [
      '#buttonHeight',
      'buttonHeight',
      'px'
    ],

    [
      '#buttonHoverScale',
      'buttonHoverScale',
      '%'
    ],

    [
      '#headingSize',
      'headingSize',
      'px'
    ],

    [
      '#bodySize',
      'bodySize',
      'px'
    ],

    [
      '#buttonFontSize',
      'buttonFontSize',
      'px'
    ],

    [
      '#letterSpacing',
      'letterSpacing',
      'px'
    ],

    [
      '#cardRadius',
      'cardRadius',
      'px'
    ],

    [
      '#cardLift',
      'cardLift',
      'px'
    ],

    [
      '#cardPadding',
      'cardPadding',
      'px'
    ],

    [
      '#cardImageHeight',
      'cardImageHeight',
      'px'
    ],

    [
      '#marqueeSpeed',
      'marqueeSpeed',
      's'
    ],

    [
      '#marqueeSize',
      'marqueeSize',
      'px'
    ],

    [
      '#marqueeGap',
      'marqueeGap',
      'px'
    ],

    [
      '#contentMaxWidth',
      'contentMaxWidth',
      'px'
    ],

    [
      '#sectionGap',
      'sectionGap',
      'px'
    ],

    [
      '#globalRadius',
      'globalRadius',
      'px'
    ],

    [
      '#effectsIntensity',
      'effectsIntensity',
      '%'
    ],

    [
      '#vignette',
      'vignette',
      '%'
    ]
  ];

  ranges.forEach(
    ([id, key, suffix]) =>
      setRange(
        id,
        key,
        suffix
      )
  );

  const selects = {
    '#bannerFit':
      'bannerFit',

    '#bannerEffect':
      'bannerEffect',

    '#backgroundSize':
      'backgroundSize',

    '#buttonStyle':
      'buttonStyle',

    '#buttonGlow':
      'buttonGlow',

    '#buttonShadow':
      'buttonShadow',

    '#buttonBorder':
      'buttonBorder',

    '#buttonAnimation':
      'buttonAnimation',

    '#headingFont':
      'headingFont',

    '#bodyFont':
      'bodyFont',

    '#buttonFont':
      'buttonFont',

    '#headingWeight':
      'headingWeight',

    '#cardGlow':
      'cardGlow',

    '#cardBorder':
      'cardBorder',

    '#productColumns':
      'productColumns',

    '#marqueeGlow':
      'marqueeGlow'
  };

  Object.entries(
    selects
  ).forEach(
    ([id, key]) =>
      bindSelect(
        id,
        key
      )
  );

  const checks = {
    '#fxParticles':
      'fxParticles',

    '#fxStars':
      'fxStars',

    '#fxGrid':
      'fxGrid',

    '#fxNoise':
      'fxNoise',

    '#fxCursorGlow':
      'fxCursorGlow',

    '#reducedMotion':
      'reducedMotion'
  };

  Object.entries(
    checks
  ).forEach(
    ([id, key]) =>
      bindCheck(
        id,
        key
      )
  );

  const texts = {

    '#shopNameInput':
      'shopName',

    '#cityInput':
      'city',

    '#heroTitleInput':
      'heroTitle',

    '#heroSubtitleInput':
      'heroSubtitle',

    '#heroButtonTextInput':
      'heroButtonText',

    '#heroButtonUrlInput':
      'heroButtonUrl',

    '#bannerUrl':
      'banner',

    '#backgroundUrl':
      'backgroundImage',

    '#marqueeTextInput':
      'marqueeText'
  };

  Object.entries(
    texts
  ).forEach(
    ([id, key]) =>
      bindText(
        id,
        key
      )
  );

  updateHistoryButtons();

  updateUploadStatus();

  if (resetBindings)
    postPreview();
}

function renderEditor() {
  fillEditor(true);

  updateHistoryButtons();
}

function updateUploadStatus() {

  if ($('#bannerUrl'))
    $('#bannerUrl').value =
      state.draft.banner || '';

  if ($('#backgroundUrl'))
    $('#backgroundUrl').value =
      state.draft.backgroundImage ||
      '';
}

/* =========================================================
   PREVIEW DA LOJA
   ========================================================= */

function postPreview() {
  const frame =
    $('#storePreview');

  if (
    !frame ||
    !frame.contentWindow
  ) {
    return;
  }

  frame.contentWindow.postMessage(
    {
      type:
        'sapucaia-preview',

      settings:
        clone(
          state.draft
        )
    },
    location.origin
  );

  if ($('#previewStatus')) {
    $('#previewStatus').textContent =
      'Alterações em tempo real (não publicadas)';
  }
}

window.addEventListener(
  'message',
  (event) => {

    if (
      event.origin !==
        location.origin ||
      !event.data
    ) {
      return;
    }

    if (
      event.data.type ===
      'preview-ready'
    ) {
      postPreview();
    }

    if (
      event.data.type ===
      'preview-focus-request'
    ) {
      focusPreview(
        event.data.target
      );
    }
  }
);

function focusPreview(
  target
) {
  $('#storePreview')
    ?.contentWindow
    ?.postMessage(
      {
        type:
          'sapucaia-preview-focus',

        target
      },
      location.origin
    );
}

function clearFocus() {
  $('#storePreview')
    ?.contentWindow
    ?.postMessage(
      {
        type:
          'sapucaia-preview-clear-focus'
      },
      location.origin
    );
}

/* =========================================================
   ABAS DO EDITOR
   ========================================================= */

$$('.editor-tab').forEach(
  (button) => {

    button.addEventListener(
      'click',
      () => {

        $$('.editor-tab')
          .forEach(
            (x) =>
              x.classList.remove(
                'active'
              )
          );

        $$('.editor-section')
          .forEach(
            (x) =>
              x.classList.remove(
                'active'
              )
          );

        button.classList.add(
          'active'
        );

        $(
          '#editor-' +
          button.dataset.editor
        )?.classList.add(
          'active'
        );
      }
    );
  }
);

$$('.focus-btn').forEach(
  (button) => {

    button.addEventListener(
      'click',
      () =>
        focusPreview(
          button.dataset.focus
        )
    );
  }
);

$('#clearFocus')?.addEventListener(
  'click',
  clearFocus
);

$('#exitFocus')?.addEventListener(
  'click',
  clearFocus
);

$('#previewDesktop')?.addEventListener(
  'click',
  () => {

    $('#previewWrap')
      ?.classList.remove(
        'mobile'
      );

    $('#previewDesktop')
      ?.classList.add(
        'active'
      );

    $('#previewMobile')
      ?.classList.remove(
        'active'
      );
  }
);

$('#previewMobile')?.addEventListener(
  'click',
  () => {

    $('#previewWrap')
      ?.classList.add(
        'mobile'
      );

    $('#previewMobile')
      ?.classList.add(
        'active'
      );

    $('#previewDesktop')
      ?.classList.remove(
        'active'
      );
  }
);

/* =========================================================
   DESFAZER / REFAZER
   ========================================================= */

$('#undoAppearance')?.addEventListener(
  'click',
  undo
);

$('#redoAppearance')?.addEventListener(
  'click',
  redo
);

$('#resetPreview')?.addEventListener(
  'click',
  () => {

    state.draft =
      clone(
        state.settings
      );

    resetHistory();

    clearFocus();

    fillEditor(false);

    postPreview();

    toast(
      'Edição revertida para o último estado salvo.'
    );
  }
);

$('#resetDefaults')?.addEventListener(
  'click',
  () => {

    if (
      !confirm(
        'Restaurar todos os padrões do editor visual?'
      )
    ) {
      return;
    }

    state.draft =
      clone(
        DEFAULT_APPEARANCE
      );

    pushHistory();

    fillEditor(false);

    postPreview();

    clearFocus();

    toast(
      'Padrão da loja restaurado na prévia.'
    );
  }
);

/* =========================================================
   UPLOAD VISUAL
   ========================================================= */

async function uploadVisual(
  file,
  key,
  inputId
) {
  if (!file)
    return;

  if (
    file.size >
    12 * 1024 * 1024
  ) {
    toast(
      'Imagem máxima: 12 MB.'
    );

    return;
  }

  try {

    const url =
      await uploadFile(
        file
      );

    applyDraftMutation(
      (d) => {
        d[key] = url;
      }
    );

    if (inputId)
      $(inputId).value =
        url;

    toast(
      'Arquivo enviado para a prévia.'
    );

  } catch (error) {
    toast(
      error.message
    );
  }
}

$('#bannerFile')?.addEventListener(
  'change',
  () =>
    uploadVisual(
      $('#bannerFile')
        ?.files?.[0],

      'banner',

      '#bannerUrl'
    )
);

$('#backgroundFile')?.addEventListener(
  'change',
  () =>
    uploadVisual(
      $('#backgroundFile')
        ?.files?.[0],

      'backgroundImage',

      '#backgroundUrl'
    )
);

/* =========================================================
   SALVAR CONFIGURAÇÕES
   ========================================================= */

$('#saveAppearance')?.addEventListener(
  'click',
  () =>
    saveSettings(
      state.draft
    )
);

$('#savePayment')?.addEventListener(
  'click',
  () =>
    saveSettings({
      paymentProvider:
        $('#paymentProvider')
          ?.value ||
        'mercadopago',

      pixEnabled:
        $('#pixEnabled')
          ?.value === 'true',

      infinitePayEnabled:
        $('#infinitePayEnabled')
          ?.value === 'true',

      infinitePayHandle:
        $('#infinitePayHandle')
          ?.value
          .trim() || ''
    })
);

$('#saveDelivery')?.addEventListener(
  'click',
  () =>
    saveSettings({
      fivemServerName:
        $('#fivemServerName')
          ?.value
          .trim() || '',

      fivemWebhookUrl:
        $('#fivemWebhookUrl')
          ?.value
          .trim() || ''
    })
);

$('#saveDiscord')?.addEventListener(
  'click',
  () =>
    saveSettings({
      discordClientId:
        $('#discordClientId')
          ?.value
          .trim() || '',

      discordRedirectUri:
        $('#discordRedirectUri')
          ?.value
          .trim() || '',

      discordScopes:
        $('#discordScopes')
          ?.value
          .trim() ||
        'identify email'
    })
);

$('#saveSupport')?.addEventListener(
  'click',
  async () => {

    let faq;

    try {

      faq =
        JSON.parse(
          $('#faqJson')
            ?.value || '[]'
        );

      if (
        !Array.isArray(faq)
      ) {
        throw new Error();
      }

    } catch {

      toast(
        'FAQ precisa ser um JSON válido em lista.'
      );

      return;
    }

    await saveSettings({
      discordUrl:
        $('#supportDiscordUrl')
          ?.value
          .trim() || '',

      supportUrl:
        $('#supportUrl')
          ?.value
          .trim() || '',

      supportEmail:
        $('#supportEmail')
          ?.value
          .trim() || '',

      termsUrl:
        $('#termsUrl')
          ?.value
          .trim() ||
        'terms.html',

      faq
    });
  }
);

/* =========================================================
   SEGURANÇA
   ========================================================= */

$('#changeCredentials')?.addEventListener(
  'click',
  async () => {

    try {

      await api(
        '/api/auth',
        {
          method: 'POST',

          headers: {
            'content-type':
              'application/json'
          },

          body: JSON.stringify({
            action:
              'change-credentials',

            username:
              $('#securityUser')
                ?.value
                .trim() || '',

            currentPassword:
              $('#securityCurrent')
                ?.value || '',

            newPassword:
              $('#securityNew')
                ?.value || '',

            confirmation:
              $('#securityConfirm')
                ?.value || ''
          })
        }
      );

      if ($('#securityCurrent'))
        $('#securityCurrent').value =
          '';

      if ($('#securityNew'))
        $('#securityNew').value =
          '';

      if ($('#securityConfirm'))
        $('#securityConfirm').value =
          '';

      toast(
        'Credenciais alteradas.'
      );

    } catch (error) {
      toast(
        error.message
      );
    }
  }
);

/* =========================================================
   SINCRONIZAÇÃO AUTOMÁTICA
   ========================================================= */

setInterval(
  async () => {

    if (
      $('#app')
        ?.classList
        .contains(
          'hidden'
        )
    ) {
      return;
    }

    try {

      const [
        p,
        o,
        c
      ] =
        await Promise.all([
          api(
            '/api/store?resource=products'
          ),

          api(
            '/api/store?resource=orders'
          ),

          api(
            '/api/store?resource=customers'
          )
        ]);

      state.products =
        p.products || [];

      state.orders =
        o.orders || [];

      state.customers =
        c.customers || [];

      renderAll();

      if ($('#adminStatus')) {
        $('#adminStatus').textContent =
          '● Sincronizado';
      }

    } catch {

      if ($('#adminStatus')) {
        $('#adminStatus').textContent =
          '● Aguardando conexão';
      }
    }

  },
  10000
);

/* =========================================================
   INICIAR
   ========================================================= */

boot();
```
