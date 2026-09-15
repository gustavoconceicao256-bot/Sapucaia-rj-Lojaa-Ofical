const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

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

const money = (n) =>
  Number(n || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

const esc = (v) =>
  String(v ?? '').replace(
    /[&<>'"]/g,
    (c) =>
      ({
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
    throw new Error(data.error || `Erro ${response.status}`);
  }

  return data;
}

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

async function boot() {
  try {
    const session = await api('/api/auth');

    if (session.authenticated) {
      showApp();

      $('#securityUser').value = session.username || '';

      await loadAll();

      return;
    }

    session.setupRequired ? showSetup() : showLogin();
  } catch (error) {
    console.error(error);

    showLogin();

    toast('Backend indisponível.');
  }
}

async function setupAdmin() {
  const username = $('#setupUser').value.trim();
  const password = $('#setupPass').value;
  const confirmation = $('#setupConfirm').value;

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

  button.disabled = true;

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

    $('#securityUser').value = username;

    showApp();

    await loadAll();

    toast('ADM criado com sucesso.');
  } catch (error) {
    toast(error.message);
  } finally {
    button.disabled = false;
  }
}

async function login() {
  const username = $('#loginUser').value.trim();
  const password = $('#loginPass').value;

  if (!username || !password) {
    toast('Informe usuário e senha.');
    return;
  }

  const button = $('#loginBtn');

  button.disabled = true;

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

    $('#securityUser').value = username;

    showApp();

    await loadAll();

    toast('Login realizado.');
  } catch (error) {
    toast(error.message);
  } finally {
    button.disabled = false;
  }
}

$('#loginBtn')?.addEventListener('click', login);

$('#loginPass')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') login();
});

$('#setupBtn')?.addEventListener('click', setupAdmin);

$('#setupConfirm')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') setupAdmin();
});

$('#logoutBtn')?.addEventListener('click', async () => {
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
});

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
  $$('.page').forEach((el) => {
    el.classList.remove('active-page');
  });

  $('#' + page)?.classList.add('active-page');

  $$('.side-link').forEach((el) => {
    el.classList.toggle(
      'active',
      el.dataset.page === page
    );
  });

  $('#pageTitle').textContent =
    titles[page] || 'Painel';

  history.replaceState(
    null,
    '',
    `#${page}`
  );

  renderPage(page);
}

$$('.side-link').forEach((button) => {
  button.addEventListener('click', () => {
    go(button.dataset.page);
  });
});

$$('[data-goto]').forEach((button) => {
  button.addEventListener('click', () => {
    go(button.dataset.goto);
  });
});

$('#mobileMenu')?.addEventListener('click', () => {
  $('.sidebar')?.classList.toggle('open');
});

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

    state.products = products.products || [];
    state.orders = orders.orders || [];
    state.customers = customers.customers || [];

    state.settings = {
      ...DEFAULT_APPEARANCE,
      ...(settings.settings || {})
    };

    state.draft = clone(state.settings);

    resetHistory();

    fillAllSettings();

    renderAll();

    const page = location.hash.slice(1);

    if (page && $('#' + page)) {
      go(page);
    }
  } catch (error) {
    console.error(error);

    if (error.message.includes('Não autorizado')) {
      return showLogin();
    }

    toast(error.message);
  }
}

function renderAll() {
  renderDashboard();
  renderProducts();
  renderOrders();
  renderCustomers();
  renderCoupon();
}

function renderPage(page) {
  if (page === 'dashboard') renderDashboard();
  if (page === 'products') renderProducts();
  if (page === 'appearance') renderEditor();
  if (page === 'orders') renderOrders();
  if (page === 'customers') renderCustomers();
  if (page === 'coupons') renderCoupon();

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

function renderDashboard() {
  const revenue = state.orders
    .filter((o) => o.status !== 'Cancelado')
    .reduce(
      (sum, o) => sum + Number(o.total || 0),
      0
    );

  $('#statProducts').textContent =
    state.products.length;

  $('#statOrders').textContent =
    state.orders.length;

  $('#statRevenue').textContent =
    money(revenue);

  $('#statCustomers').textContent =
    state.customers.length;

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
                    <td>${esc(o.id)}</td>
                    <td>${esc(
                      o.status ||
                        'Aguardando pagamento'
                    )}</td>
                    <td>${money(o.total)}</td>
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
      `
      : '<p class="muted">Nenhum pedido.</p>';

  const cats = {};

  state.products.forEach((p) => {
    const k = p.cat || 'Sem categoria';

    cats[k] = (cats[k] || 0) + 1;
  });

  const max = Math.max(
    1,
    ...Object.values(cats)
  );

  $('#categorySummary').innerHTML =
    Object.entries(cats)
      .map(
        ([k, v]) => `
          <div class="cat-row">
            <span>${esc(k)}</span>
            <div class="bar">
              <i style="width:${(v / max) * 100}%"></i>
            </div>
            <b>${v}</b>
          </div>
        `
      )
      .join('') ||
    '<p class="muted">Nenhum produto.</p>';
}

function renderProducts() {
  const q = (
    $('#productSearch')?.value || ''
  ).toLowerCase();

  const c =
    $('#productCat')?.value || '';

  const arr = state.products.filter(
    (p) =>
      (!q ||
        String(p.name)
          .toLowerCase()
          .includes(q)) &&
      (!c || p.cat === c)
  );

  $('#productTable').innerHTML =
    arr.length
      ? `
        <table class="data-table">
          <thead>
            <tr>
              <th>PRODUTO</th>
              <th>CATEGORIA</th>
              <th>PREÇO</th>
              <th>VALIDADE</th>
              <th>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            ${arr
              .map(
                (p) => `
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
                        <span>${esc(
                          p.name
                        )}</span>
                      </div>
                    </td>

                    <td>${esc(p.cat)}</td>

                    <td>${money(p.price)}</td>

                    <td>${esc(
                      p.valid ||
                        'Permanente'
                    )}</td>

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
                `
              )
              .join('')}
          </tbody>
        </table>
      `
      : '<div class="empty">Nenhum produto publicado pelo ADM.</div>';

  $$('[data-edit]').forEach((b) => {
    b.onclick = () =>
      openProduct(b.dataset.edit);
  });

  $$('[data-del]').forEach((b) => {
    b.onclick = () =>
      deleteProduct(b.dataset.del);
  });
}

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
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          action: 'delete',
          id
        })
      }
    );

    state.products = d.products || [];

    renderAll();

    toast('Produto removido.');
  } catch (error) {
    toast(error.message);
  }
}

/*
  EDITOR DE PRODUTO

  Estrutura:
  - img = imagem de capa
  - descImage1 = imagem da descrição 1
  - descImage2 = imagem da descrição 2

  Cada campo aceita somente UMA imagem:
  - URL
  - upload
*/
function openProduct(id = null) {
  state.editing = id;

  const p = id
    ? state.products.find(
        (x) =>
          String(x.id) === String(id)
      )
    : null;

  $('#modalTitle').textContent = p
    ? 'Editar produto'
    : 'Novo produto';

  $('#fName').value =
    p?.name || '';

  $('#fCat').value =
    p?.cat || 'Destaques';

  $('#fPrice').value =
    p?.price ?? '';

  $('#fOld').value =
    p?.old ?? '';

  $('#fTag').value =
    p?.tag || '';

  $('#fValidityType').value =
    p?.validityType ||
    'permanent';

  $('#fValidityDays').value =
    p?.validityDays || 30;

  $('#validDaysWrap').style.display =
    $('#fValidityType').value === 'days'
      ? 'flex'
      : 'none';

  /*
    IMAGEM DE CAPA
  */
  $('#fMainUrl').value =
    p?.img || '';

  /*
    DESCRIÇÃO
  */
  $('#fDesc').value =
    p?.desc || '';

  /*
    IMAGEM DA DESCRIÇÃO 1

    Compatibilidade:
    - novo campo: descImage1
    - estrutura antiga: images[1]
  */
  let descImage1 =
    p?.descImage1 || '';

  /*
    IMAGEM DA DESCRIÇÃO 2

    Compatibilidade:
    - novo campo: descImage2
    - estrutura antiga: images[2]
  */
  let descImage2 =
    p?.descImage2 || '';

  /*
    Se o produto antigo ainda possuir
    imagens na propriedade images,
    tentamos aproveitar as imagens antigas.
  */
  if (
    !descImage1 &&
    Array.isArray(p?.images)
  ) {
    const oldExtras = p.images.filter(
      (x) => x && x !== p?.img
    );

    descImage1 =
      oldExtras[0] || '';
  }

  if (
    !descImage2 &&
    Array.isArray(p?.images)
  ) {
    const oldExtras = p.images.filter(
      (x) => x && x !== p?.img
    );

    descImage2 =
      oldExtras[1] || '';
  }

  /*
    NOVOS CAMPOS
  */
  $('#fDescImage1Url').value =
    descImage1;

  $('#fDescImage2Url').value =
    descImage2;

  /*
    Limpa uploads anteriores.
  */
  $('#fMainFile').value = '';

  $('#fDescImage1File').value = '';

  $('#fDescImage2File').value = '';

  /*
    Status dos uploads.
  */
  $('#mainUploadStatus').textContent =
    'Nenhuma nova imagem escolhida.';

  $('#descImage1Status').textContent =
    'Nenhuma nova imagem escolhida.';

  $('#descImage2Status').textContent =
    'Nenhuma nova imagem escolhida.';

  $('#productModal').classList.add(
    'open'
  );
}

$('#addProductBtn').onclick = () =>
  openProduct();

$('#closeProduct').onclick = () =>
  $('#productModal').classList.remove(
    'open'
  );

$('#productModal').onclick = (e) => {
  if (e.target.id === 'productModal') {
    e.currentTarget.classList.remove(
      'open'
    );
  }
};

$('#fValidityType').onchange = (e) => {
  $('#validDaysWrap').style.display =
    e.target.value === 'days'
      ? 'flex'
      : 'none';
};

async function uploadFile(file) {
  const form = new FormData();

  form.append('file', file);

  const response = await fetch(
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

  return data.url;
}

/*
  CAPA
*/
$('#fMainFile').onchange = () => {
  const file =
    $('#fMainFile').files[0];

  if (!file) return;

  if (
    file.size >
    12 * 1024 * 1024
  ) {
    toast(
      'Imagem máxima: 12 MB.'
    );

    $('#fMainFile').value = '';

    return;
  }

  $('#mainUploadStatus').textContent =
    `Arquivo selecionado: ${file.name}`;
};

/*
  DESCRIÇÃO 1
*/
$('#fDescImage1File').onchange =
  () => {
    const file =
      $('#fDescImage1File')
        .files[0];

    if (!file) return;

    if (
      file.size >
      12 * 1024 * 1024
    ) {
      toast(
        'Imagem máxima: 12 MB.'
      );

      $('#fDescImage1File').value =
        '';

      return;
    }

    $('#descImage1Status').textContent =
      `Arquivo selecionado: ${file.name}`;
  };

/*
  DESCRIÇÃO 2
*/
$('#fDescImage2File').onchange =
  () => {
    const file =
      $('#fDescImage2File')
        .files[0];

    if (!file) return;

    if (
      file.size >
      12 * 1024 * 1024
    ) {
      toast(
        'Imagem máxima: 12 MB.'
      );

      $('#fDescImage2File').value =
        '';

      return;
    }

    $('#descImage2Status').textContent =
      `Arquivo selecionado: ${file.name}`;
  };

async function saveProduct() {
  const name =
    $('#fName').value.trim();

  const cat =
    $('#fCat').value;

  const price =
    Number($('#fPrice').value);

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

  const btn =
    $('#saveProduct');

  btn.disabled = true;

  btn.textContent =
    'Publicando...';

  try {
    /*
      PRODUTO ANTIGO
    */
    const old =
      state.editing
        ? state.products.find(
            (p) =>
              String(p.id) ===
              String(state.editing)
          )
        : null;

    /*
      ==========================
      IMAGEM DE CAPA
      ==========================
    */
    let img =
      $('#fMainUrl').value.trim();

    const mainFile =
      $('#fMainFile').files[0];

    if (mainFile) {
      img =
        await uploadFile(
          mainFile
        );
    }

    /*
      ==========================
      IMAGEM DA DESCRIÇÃO 1
      ==========================
    */
    let descImage1 =
      $('#fDescImage1Url')
        .value
        .trim();

    const descImage1File =
      $('#fDescImage1File')
        .files[0];

    if (descImage1File) {
      descImage1 =
        await uploadFile(
          descImage1File
        );
    }

    /*
      ==========================
      IMAGEM DA DESCRIÇÃO 2
      ==========================
    */
    let descImage2 =
      $('#fDescImage2Url')
        .value
        .trim();

    const descImage2File =
      $('#fDescImage2File')
        .files[0];

    if (descImage2File) {
      descImage2 =
        await uploadFile(
          descImage2File
        );
    }

    /*
      Se o usuário não alterar uma imagem
      ao editar, mantém a antiga.
    */
    if (
      !descImage1 &&
      old?.descImage1
    ) {
      descImage1 =
        old.descImage1;
    }

    if (
      !descImage2 &&
      old?.descImage2
    ) {
      descImage2 =
        old.descImage2;
    }

    /*
      Compatibilidade com produtos antigos.
    */
    if (
      !descImage1 &&
      Array.isArray(old?.images)
    ) {
      const oldExtras =
        old.images.filter(
          (x) =>
            x &&
            x !== old.img
        );

      descImage1 =
        oldExtras[0] || '';
    }

    if (
      !descImage2 &&
      Array.isArray(old?.images)
    ) {
      const oldExtras =
        old.images.filter(
          (x) =>
            x &&
            x !== old.img
        );

      descImage2 =
        oldExtras[1] || '';
    }

    /*
      ==========================
      VALIDADE
      ==========================
    */
    const type =
      $('#fValidityType').value;

    const days =
      Math.max(
        1,
        Math.floor(
          Number(
            $('#fValidityDays')
              .value
          ) || 30
        )
      );

    /*
      ==========================
      IMAGENS
      ==========================

      Mantemos a propriedade images
      para não quebrar produtos antigos
      ou partes do sistema que ainda
      utilizem essa propriedade.

      Agora ela contém no máximo:
      1. capa
      2. descrição 1
      3. descrição 2
    */
    const images = [
      img,
      descImage1,
      descImage2
    ].filter(Boolean);

    /*
      ==========================
      PRODUTO FINAL
      ==========================
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
          $('#fOld').value
        ) || 0,

      tag:
        $('#fTag')
          .value
          .trim(),

      desc:
        $('#fDesc')
          .value
          .trim(),

      /*
        CAPA
      */
      img:
        img ||
        old?.img ||
        'assets/banner-sapucaia.png',

      /*
        NOVAS IMAGENS
      */
      descImage1,

      descImage2,

      /*
        Mantido para compatibilidade.
      */
      images,

      published: true,

      validityType: type,

      validityDays: days,

      valid:
        type === 'days'
          ? `${days} dias`
          : type === 'wipe'
            ? 'Até o wipe'
            : 'Permanente'
    };

    /*
      ==========================
      SALVA NO BACKEND
      ==========================
    */
    const d = await api(
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
        'O backend não confirmou a publicação.'
      );
    }

    state.products =
      d.products || [];

    $('#productModal')
      .classList
      .remove('open');

    renderAll();

    toast(
      state.editing
        ? 'Produto atualizado.'
        : 'Produto publicado na loja.'
    );

    state.editing = null;
  } catch (error) {
    console.error(error);

    toast(error.message);
  } finally {
    btn.disabled = false;

    btn.textContent =
      'Publicar produto';
  }
}

$('#saveProduct').onclick =
  saveProduct;

$('#productSearch').oninput =
  renderProducts;

$('#productCat').onchange =
  renderProducts;

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
                    <td>${esc(o.id)}</td>

                    <td>${esc(
                      o.createdAt ||
                        '—'
                    )}</td>

                    <td>${money(
                      o.total
                    )}</td>

                    <td>${esc(
                      o.status ||
                        'Aguardando pagamento'
                    )}</td>

                    <td>
                      <select
                        class="status-select"
                        data-id="${esc(
                          o.id
                        )}"
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
      : '<div class="empty">Nenhum pedido encontrado.</div>';

  $$('.status-select').forEach(
    (s) => {
      const o =
        state.orders.find(
          (x) =>
            String(x.id) ===
            String(
              s.dataset.id
            )
        );

      if (o) {
        s.value =
          o.status ||
          'Aguardando pagamento';
      }

      s.onchange = () =>
        updateOrder(
          s.dataset.id,
          s.value
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

    const o =
      state.orders.find(
        (x) =>
          String(x.id) ===
          String(id)
      );

    if (o) {
      o.status = status;
    }

    renderDashboard();

    renderOrders();

    toast(
      'Status atualizado.'
    );
  } catch (error) {
    toast(error.message);
  }
}

$('#orderStatusFilter').onchange =
  renderOrders;

function renderCustomers() {
  const arr =
    state.customers || [];

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
                    <td>${esc(
                      c.name ||
                        c.global_name ||
                        c.username ||
                        'Cliente'
                    )}</td>

                    <td>${esc(
                      c.discord ||
                        c.id ||
                        '—'
                    )}</td>

                    <td>${esc(
                      c.email ||
                        '—'
                    )}</td>
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
      `
      : '<div class="empty">Nenhum cliente identificado.</div>';
}

function renderCoupon() {
  const code =
    state.settings.couponCode ||
    'SAPUCAIA50';

  const percent =
    Number(
      state.settings
        .couponPercent ?? 50
    );

  if ($('#couponCodeAdmin')) {
    $('#couponCodeAdmin').value =
      code;
  }

  if ($('#couponPercentAdmin')) {
    $('#couponPercentAdmin').value =
      percent;
  }

  if ($('#couponPreview')) {
    $('#couponPreview').textContent =
      code;
  }

  if ($('#couponHeadline')) {
    $('#couponHeadline').textContent =
      `${percent}% OFF EM TODOS OS PRODUTOS`;
  }
}

async function saveSettings(
  partial
) {
  const next = {
    ...state.settings,
    ...partial
  };

  try {
    const d = await api(
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

$('#saveCoupon').onclick = () =>
  saveSettings({
    couponCode:
      $('#couponCodeAdmin')
        .value
        .trim()
        .toUpperCase(),

    couponPercent:
      Math.max(
        0,
        Math.min(
          100,
          Number(
            $('#couponPercentAdmin')
              .value
          ) || 0
        )
      )
  });

function fillAllSettings() {
  const s =
    state.settings;

  $('#paymentProvider').value =
    s.paymentProvider ||
    'mercadopago';

  $('#pixEnabled').value =
    String(
      s.pixEnabled !== false
    );

  $('#infinitePayEnabled').value =
    String(
      s.infinitePayEnabled === true
    );

  $('#infinitePayHandle').value =
    s.infinitePayHandle || '';

  $('#fivemServerName').value =
    s.fivemServerName ||
    'SAPUCAIA';

  $('#fivemWebhookUrl').value =
    s.fivemWebhookUrl || '';

  $('#discordClientId').value =
    s.discordClientId || '';

  $('#discordRedirectUri').value =
    s.discordRedirectUri || '';

  $('#discordScopes').value =
    s.discordScopes ||
    'identify email';

  $('#supportDiscordUrl').value =
    s.discordUrl || '';

  $('#supportUrl').value =
    s.supportUrl || '';

  $('#supportEmail').value =
    s.supportEmail || '';

  $('#termsUrl').value =
    s.termsUrl === 'terms.html'
      ? ''
      : s.termsUrl || '';

  $('#faqJson').value =
    JSON.stringify(
      s.faq || [],
      null,
      2
    );

  fillEditor();
}

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

  state.history.push(current);

  if (
    state.history.length > 50
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

  state.historyIndex -= 1;

  state.draft = clone(
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

  state.historyIndex += 1;

  state.draft = clone(
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
  const color = $(colorId);

  const hex =
    $(colorId + 'Hex');

  if (!color || !hex) {
    return;
  }

  color.oninput = () => {
    applyDraftMutation(
      (d) => {
        d[key] =
          color.value;
      }
    );
  };

  hex.onchange = () => {
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
  const el = $(id);

  const out =
    $(id + 'Out');

  if (!el) return;

  el.value =
    state.draft[key] ??
    DEFAULT_APPEARANCE[key] ??
    el.value;

  if (out) {
    out.textContent =
      Number(el.value).toFixed(
        digits
      ) + suffix;
  }

  el.oninput = () => {
    applyDraftMutation(
      (d) => {
        d[key] =
          Number(el.value);
      }
    );
  };
}

function bindSelect(
  id,
  key
) {
  const el = $(id);

  if (!el) return;

  el.value = String(
    state.draft[key] ??
      DEFAULT_APPEARANCE[key] ??
      el.value
  );

  el.onchange = () => {
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
  const el = $(id);

  if (!el) return;

  el.value =
    state.draft[key] ?? '';

  el.oninput = () => {
    applyDraftMutation(
      (d) => {
        d[key] =
          el.value;
      }
    );
  };
}

function bindCheck(
  id,
  key
) {
  const el = $(id);

  if (!el) return;

  el.checked =
    state.draft[key] !== false;

  el.onchange = () => {
    applyDraftMutation(
      (d) => {
        d[key] =
          el.checked;
      }
    );
  };
}

function fillEditor(
  resetBindings = true
) {
  const d =
    state.draft;

  colorFields.forEach(
    ([id, key]) => {
      const c = $(id);

      const h =
        $(id + 'Hex');

      if (c) {
        c.value =
          d[key] ||
          DEFAULT_APPEARANCE[key];
      }

      if (h) {
        h.value =
          d[key] ||
          DEFAULT_APPEARANCE[key];
      }
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

  [
    '#bannerFit',
    '#bannerEffect',
    '#backgroundSize',
    '#buttonStyle',
    '#buttonGlow',
    '#buttonShadow',
    '#buttonBorder',
    '#buttonAnimation',
    '#headingFont',
    '#bodyFont',
    '#buttonFont',
    '#headingWeight',
    '#cardGlow',
    '#cardBorder',
    '#productColumns',
    '#marqueeGlow'
  ].forEach((id) => {
    const key =
      ({
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
      })[id];

    bindSelect(
      id,
      key
    );
  });

  [
    '#fxParticles',
    '#fxStars',
    '#fxGrid',
    '#fxNoise',
    '#fxCursorGlow',
    '#reducedMotion'
  ].forEach((id) => {
    const key =
      ({
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
      })[id];

    bindCheck(
      id,
      key
    );
  });

  [
    [
      '#shopNameInput',
      'shopName'
    ],
    [
      '#cityInput',
      'city'
    ],
    [
      '#heroTitleInput',
      'heroTitle'
    ],
    [
      '#heroSubtitleInput',
      'heroSubtitle'
    ],
    [
      '#heroButtonTextInput',
      'heroButtonText'
    ],
    [
      '#heroButtonUrlInput',
      'heroButtonUrl'
    ],
    [
      '#bannerUrl',
      'banner'
    ],
    [
      '#backgroundUrl',
      'backgroundImage'
    ],
    [
      '#marqueeTextInput',
      'marqueeText'
    ]
  ].forEach(
    ([id, key]) =>
      bindText(
        id,
        key
      )
  );

  updateHistoryButtons();

  updateUploadStatus();

  if (resetBindings) {
    postPreview();
  }
}

function renderEditor() {
  fillEditor(true);

  updateHistoryButtons();
}

function updateUploadStatus() {
  if ($('#bannerUrl')) {
    $('#bannerUrl').value =
      state.draft.banner || '';
  }

  if ($('#backgroundUrl')) {
    $('#backgroundUrl').value =
      state.draft.backgroundImage ||
      '';
  }
}

function postPreview() {
  const frame =
    $('#storePreview');

  if (!frame?.contentWindow) {
    return;
  }

  frame.contentWindow.postMessage(
    {
      type: 'sapucaia-preview',
      settings:
        clone(state.draft)
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

$$('.editor-tab').forEach(
  (button) => {
    button.addEventListener(
      'click',
      () => {
        $$('.editor-tab').forEach(
          (x) =>
            x.classList.remove(
              'active'
            )
        );

        $$('.editor-section').forEach(
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

$('#clearFocus').onclick = () =>
  $('#storePreview')
    ?.contentWindow
    ?.postMessage(
      {
        type:
          'sapucaia-preview-clear-focus'
      },
      location.origin
    );

$('#exitFocus').onclick = () =>
  $('#storePreview')
    ?.contentWindow
    ?.postMessage(
      {
        type:
          'sapucaia-preview-clear-focus'
      },
      location.origin
    );

$('#previewDesktop').onclick =
  () => {
    $('#previewWrap')
      .classList
      .remove('mobile');

    $('#previewDesktop')
      .classList
      .add('active');

    $('#previewMobile')
      .classList
      .remove('active');
  };

$('#previewMobile').onclick =
  () => {
    $('#previewWrap')
      .classList
      .add('mobile');

    $('#previewMobile')
      .classList
      .add('active');

    $('#previewDesktop')
      .classList
      .remove('active');
  };

$('#undoAppearance').onclick =
  undo;

$('#redoAppearance').onclick =
  redo;

$('#resetPreview').onclick =
  () => {
    state.draft =
      clone(state.settings);

    resetHistory();

    clearFocus();

    fillEditor(false);

    postPreview();

    toast(
      'Edição revertida para o último estado salvo.'
    );
  };

$('#resetDefaults').onclick =
  () => {
    if (
      !confirm(
        'Restaurar todos os padrões do editor visual? As mudanças só serão aplicadas na loja quando você publicar.'
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
  };

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

async function uploadVisual(
  file,
  key,
  inputId
) {
  if (!file) return;

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
      await uploadFile(file);

    applyDraftMutation(
      (d) => {
        d[key] = url;
      }
    );

    if (inputId) {
      $(inputId).value =
        url;
    }

    toast(
      'Arquivo enviado para a prévia.'
    );
  } catch (error) {
    toast(error.message);
  }
}

$('#bannerFile').onchange =
  () =>
    uploadVisual(
      $('#bannerFile')
        .files[0],
      'banner',
      '#bannerUrl'
    );

$('#backgroundFile').onchange =
  () =>
    uploadVisual(
      $('#backgroundFile')
        .files[0],
      'backgroundImage',
      '#backgroundUrl'
    );

$('#saveAppearance').onclick =
  () =>
    saveSettings(
      state.draft
    );

$('#savePayment').onclick =
  () =>
    saveSettings({
      paymentProvider:
        $('#paymentProvider')
          .value,

      pixEnabled:
        $('#pixEnabled')
          .value === 'true',

      infinitePayEnabled:
        $('#infinitePayEnabled')
          .value === 'true',

      infinitePayHandle:
        $('#infinitePayHandle')
          .value
          .trim()
    });

$('#saveDelivery').onclick =
  () =>
    saveSettings({
      fivemServerName:
        $('#fivemServerName')
          .value
          .trim(),

      fivemWebhookUrl:
        $('#fivemWebhookUrl')
          .value
          .trim()
    });

$('#saveDiscord').onclick =
  () =>
    saveSettings({
      discordClientId:
        $('#discordClientId')
          .value
          .trim(),

      discordRedirectUri:
        $('#discordRedirectUri')
          .value
          .trim(),

      discordScopes:
        $('#discordScopes')
          .value
          .trim()
    });

$('#saveSupport').onclick =
  async () => {
    let faq;

    try {
      faq = JSON.parse(
        $('#faqJson').value
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
          .value
          .trim(),

      supportUrl:
        $('#supportUrl')
          .value
          .trim(),

      supportEmail:
        $('#supportEmail')
          .value
          .trim(),

      termsUrl:
        $('#termsUrl')
          .value
          .trim() ||
        'terms.html',

      faq
    });
  };

$('#changeCredentials').onclick =
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
                .value
                .trim(),

            currentPassword:
              $('#securityCurrent')
                .value,

            newPassword:
              $('#securityNew')
                .value,

            confirmation:
              $('#securityConfirm')
                .value
          })
        }
      );

      $('#securityCurrent')
        .value = '';

      $('#securityNew')
        .value = '';

      $('#securityConfirm')
        .value = '';

      toast(
        'Credenciais alteradas.'
      );
    } catch (error) {
      toast(error.message);
    }
  };

setInterval(
  async () => {
    if (
      $('#app')
        ?.classList
        .contains('hidden')
    ) {
      return;
    }

    try {
      const [
        p,
        o,
        c
      ] = await Promise.all([
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

      $('#adminStatus').textContent =
        '● Sincronizado';
    } catch {
      $('#adminStatus').textContent =
        '● Aguardando conexão';
    }
  },
  10000
);

boot();
