```javascript
/* =========================================================
   SAPUCAIA — ADMIN PANEL
   Interface premium + preview em tempo real
   ========================================================= */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const $$ = (selector) => document.querySelectorAll(selector);

  const state = {
    products: [],
    editing: null,
    draft: false,
    settings: {},
    currentPage: "dashboard"
  };

  /* =========================================================
     UTILIDADES
     ========================================================= */

  function toast(message, type = "normal") {
    let el = $("toast");

    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      document.body.appendChild(el);
    }

    el.textContent = message;

    el.style.borderColor =
      type === "error"
        ? "rgba(255,70,100,.5)"
        : type === "success"
          ? "rgba(80,255,150,.4)"
          : "rgba(255,8,127,.35)";

    el.classList.add("show");

    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
      el.classList.remove("show");
    }, 2800);
  }

  function safeJSON(value, fallback = null) {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function escapeHTML(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function money(value) {
    const number = Number(value || 0);

    return number.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function firstName(name = "") {
    return String(name).trim().split(/\s+/)[0] || "Usuário";
  }

  /* =========================================================
     API
     ========================================================= */

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      ...options
    });

    const text = await response.text();

    const data = safeJSON(text, {
      ok: response.ok,
      message: text
    });

    if (!response.ok) {
      throw new Error(
        data?.message ||
        data?.error ||
        `Erro HTTP ${response.status}`
      );
    }

    return data;
  }

  /* =========================================================
     AUTENTICAÇÃO
     ========================================================= */

  async function checkAuth() {
    try {
      const data = await api("/api/auth");

      if (data?.authenticated === false) {
        showLogin();
        return false;
      }

      hideLogin();
      return true;
    } catch {
      /*
       * Se o endpoint não existir, não bloqueia o painel.
       * O backend continua protegendo as operações reais.
       */
      hideLogin();
      return true;
    }
  }

  function showLogin() {
    const login = $("loginScreen");
    const app = $("app");

    if (login) login.classList.remove("hidden");
    if (app) app.classList.add("hidden");
  }

  function hideLogin() {
    const login = $("loginScreen");
    const app = $("app");

    if (login) login.classList.add("hidden");
    if (app) app.classList.remove("hidden");
  }

  /* =========================================================
     CARREGAR PRODUTOS
     ========================================================= */

  async function loadProducts() {
    try {
      const data = await api("/api/store");

      state.products =
        Array.isArray(data)
          ? data
          : data.products ||
            data.items ||
            [];

      renderProducts();
      updateStats();
      renderDashboard();
    } catch (error) {
      console.error(error);

      state.products = [];
      renderProducts();
      updateStats();
    }
  }

  /* =========================================================
     ESTATÍSTICAS
     ========================================================= */

  function updateStats() {
    const products = state.products;

    const active = products.filter(
      p => p.active !== false
    ).length;

    const featured = products.filter(
      p => p.featured === true || p.featured === "true"
    ).length;

    const total = products.length;

    const stats = document.querySelectorAll(".stat strong");

    if (stats[0]) stats[0].textContent = total;
    if (stats[1]) stats[1].textContent = active;
    if (stats[2]) stats[2].textContent = featured;
  }

  /* =========================================================
     DASHBOARD
     ========================================================= */

  function renderDashboard() {
    const table = $("dashboardProducts");

    if (!table) return;

    const products = state.products.slice(0, 6);

    table.innerHTML = products.length
      ? products.map(productRow).join("")
      : `
        <tr>
          <td colspan="6" style="padding:30px;text-align:center;color:#777">
            Nenhum produto cadastrado.
          </td>
        </tr>
      `;
  }

  /* =========================================================
     TABELA DE PRODUTOS
     ========================================================= */

  function productRow(p) {
    const active =
      p.active !== false &&
      p.active !=
```
