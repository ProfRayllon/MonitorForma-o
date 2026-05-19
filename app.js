const state = {
  base: null,
  user: null,
  dbConnected: false,
  tab: "formation",
  formationMode: "home",
  selectedFormationId: null,
  adminFormationView: "list",
  editingFormationId: null,
  pendingDeleteFormationId: null,
  goalChartMode: "inscritos",
  autoSyncTimer: null,
  syncingFormationId: null,
  users: [],
  formations: [],
};

const AUTO_SYNC_INTERVAL = 120000;
const SUPABASE_URL = "https://intswvnfmizbttlrqhdt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_XwPyaNxJ1BFTplBsTRmOLQ_wBOp1OUm";
const db = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) || null;
const SESSION_KEY = "monitor-current-user";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const on = (selector, event, handler) => {
  const element = $(selector);
  if (element) element.addEventListener(event, handler);
};

const normalize = (value) =>
  String(value || "")
    .replace(/^﻿/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

const normalizeKey = (value) => normalize(value).replace(/[^a-z0-9]/g, "");

const esc = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const yes = (value) => ["sim", "s", "yes", "true", "1"].includes(normalize(value));
const pct = (value, total) => (!total ? "0%" : `${Math.round((value / total) * 100)}%`);
const slug = (value) =>
  normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
const makeId = () =>
  window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));

function userInitials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

function notify(title, message = "", type = "success") {
  const stack = $("#toastStack");
  if (!stack) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<strong>${esc(title)}</strong>${message ? `<span>${esc(message)}</span>` : ""}`;
  stack.appendChild(toast);
  window.setTimeout(() => toast.remove(), 4400);
}

async function withButtonBusy(button, label, action) {
  if (!button) return action();
  const original = button.textContent;
  button.disabled = true;
  button.textContent = label;
  try {
    return await action();
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

async function init() {
  // Carrega dados base — tenta caminhos alternativos para GitHub Pages
  const basePaths = ["data/base.json", "./data/base.json", "/data/base.json"];
  for (const path of basePaths) {
    try {
      const res = await fetch(path);
      if (res.ok) { state.base = await res.json(); break; }
    } catch { /* tenta próximo */ }
  }

  if (!state.base) {
    state.base = { schools: [], users: [] };
    console.error("base.json não foi encontrado. Verifique se o arquivo está no repositório.");
  }

  try {
    state.dbConnected = await checkSupabaseConnection();
  } catch { state.dbConnected = false; }

  try {
    state.users = await loadUsers();
  } catch { state.users = normalizeUsers(state.base.users || []); }

  try {
    state.formations = await loadFormations();
  } catch { state.formations = []; }

  // bindEvents sempre executa, mesmo se algo acima falhou
  bindEvents();
  fillLoginHint();
  if (!restoreSession()) clearLoginForm();
}

async function checkSupabaseConnection() {
  if (!db) return false;
  try {
    const { error } = await db.from("formacoes").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

function loadStored(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function saveStored(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

async function loadUsers() {
  const localUsers = normalizeUsers(loadStored("monitor-users", state.base.users));
  if (!db) return localUsers;
  try {
    const { data: usuarios, error } = await db.from("usuarios").select("*").order("created_at", { ascending: true });
    if (error) throw error;

    // Supabase vazio E localStorage também vazio → primeira execução, semeia usuários base
    if (!usuarios?.length && !localUsers.length) {
      const baseUsers = normalizeUsers(state.base.users || []);
      await db.from("usuarios").upsert(baseUsers.map(toDbUser), { onConflict: "id" });
      return baseUsers;
    }

    // Supabase vazio mas localStorage tem dados → primeira execução deste projeto no banco
    if (!usuarios?.length) {
      await db.from("usuarios").upsert(localUsers.map(toDbUser), { onConflict: "id" });
      return localUsers;
    }

    // Supabase é a fonte de verdade — sobrescreve localStorage
    const users = usuarios.map(fromDbUser);
    saveStored("monitor-users", users);
    return users;
  } catch (error) {
    console.warn("Não foi possível carregar usuários do Supabase. Usando dados locais.", error);
    return localUsers;
  }
}

function normalizeUsers(users) {
  const normalized = users.map((user) => ({ ...user, id: isUuid(user.id) ? user.id : makeId() }));
  saveStored("monitor-users", normalized);
  return normalized;
}

function fromDbUser(row) {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    senha: row.senha,
    perfil: row.perfil || "regional",
    gre: row.gre || "TODAS",
  };
}

function toDbUser(user) {
  return { id: user.id, nome: user.nome, email: user.email, senha: user.senha, perfil: user.perfil, gre: user.gre };
}

async function persistUser(user) {
  saveStored("monitor-users", state.users);
  if (!db) return;
  const { error } = await db.from("usuarios").upsert(toDbUser(user), { onConflict: "id" });
  if (error) throw error;
}

async function deleteUserFromDb(id) {
  if (!db) return;
  const { error } = await db.from("usuarios").delete().eq("id", id);
  if (error) throw error;
}

async function loadFormations() {
  const localFormations = normalizeFormationIds(loadStored("monitor-formations", []));
  if (!db) return localFormations;

  try {
    const { data: formacoes, error } = await db
      .from("formacoes")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;

    // Supabase conectado e retornou vazio → banco está vazio intencionalmente
    // Só semeia se localStorage também estiver vazio (primeira execução)
    if (!formacoes?.length) {
      if (!localFormations.length) {
        // Primeira execução: cria uma formação padrão
        const def = makeDefaultFormation();
        await db.from("formacoes").upsert([toDbFormation(def)], { onConflict: "id" });
        saveStored("monitor-formations", [def]);
        return [def];
      }
      // Banco vazio mas local tem dados → banco foi limpo intencionalmente, respeita isso
      saveStored("monitor-formations", []);
      return [];
    }

    // Supabase tem formações → é a única fonte de verdade, ignora localStorage
    const formations = formacoes.map(fromDbFormation);

    const { data: importedRows, error: rowsError } = await db.from("formacao_dados").select("*");
    if (rowsError) throw rowsError;

    const rowsByFormation = groupDbRows(importedRows || []);
    formations.forEach((f) => {
      f.rows = rowsByFormation.get(f.id) || [];
    });

    // Sincroniza localStorage com o estado real do Supabase
    saveStored("monitor-formations", formations);
    return formations;
  } catch (error) {
    console.warn("Não foi possível carregar do Supabase. Usando dados locais.", error);
    return localFormations;
  }
}

function normalizeFormationIds(formations) {
  const normalized = formations.map((f) => ({ ...f, id: isUuid(f.id) ? f.id : makeId() }));
  saveStored("monitor-formations", normalized);
  return normalized;
}

function fromDbFormation(row) {
  return {
    id: row.id,
    nome: row.nome,
    publico: row.publico || "Diretores escolares",
    esperado: Number(row.esperado || state.base?.schools?.length || 0),
    sheetUrl: row.sheet_url || "",
    foto: row.foto_url || "",
    rows: [],
    createdAt: row.created_at || new Date().toISOString(),
    dataEvento: row.data_evento || "",
    prazoInscricoes: row.prazo_inscricoes || "",
  };
}

function toDbFormation(formation) {
  return {
    id: formation.id,
    nome: formation.nome,
    publico: formation.publico || "Diretores escolares",
    esperado: Number(formation.esperado || state.base?.schools?.length || 0),
    sheet_url: formation.sheetUrl || "",
    foto_url: formation.foto || "",
    data_evento: formation.dataEvento || null,
    prazo_inscricoes: formation.prazoInscricoes || null,
  };
}

function groupDbRows(rows) {
  const byFormation = new Map();
  rows.forEach((record) => {
    const formacaoId = record.formacao_id;
    const inep = String(record.inep || "").trim();
    if (!formacaoId || !inep) return;
    if (!byFormation.has(formacaoId)) byFormation.set(formacaoId, new Map());
    const byInep = byFormation.get(formacaoId);
    if (!byInep.has(inep)) {
      byInep.set(inep, { inep, inscrito: false, credenciado: false, representantes: [] });
    }
    const item = byInep.get(inep);
    const inscrito = Boolean(record.inscrito);
    const credenciado = Boolean(record.credenciado);
    item.inscrito = item.inscrito || inscrito;
    item.credenciado = item.credenciado || credenciado;
    item.representantes.push({ nome: record.nome || "Representante", matricula: record.matricula || "", inscrito, credenciado });
  });
  return new Map([...byFormation.entries()].map(([id, byInep]) => [id, [...byInep.values()]]));
}

async function persistFormation(formation) {
  saveStored("monitor-formations", state.formations);
  if (!db) return;

  const dbRecord = toDbFormation(formation);

  const { error } = await db.from("formacoes").upsert(dbRecord, { onConflict: "id" });
  if (error) throw error;

  // Verificação pós-save: confirma que o registro chegou ao banco
  const { data: check, error: checkErr } = await db
    .from("formacoes")
    .select("id")
    .eq("id", formation.id)
    .single();
  if (checkErr || !check) {
    throw new Error("Dado não confirmado no Supabase apos salvar. Verifique a conexao e as politicas RLS.");
  }
}

async function persistFormationRows(formation) {
  saveStored("monitor-formations", state.formations);
  if (!db) return;
  const { error: deleteError } = await db.from("formacao_dados").delete().eq("formacao_id", formation.id);
  if (deleteError) throw deleteError;
  const schoolByInep = new Map(state.base.schools.map((s) => [String(s.inep), s]));
  const rows = (formation.rows || []).flatMap((row) => {
    const school = schoolByInep.get(String(row.inep));
    const people = row.representantes?.length
      ? row.representantes
      : [{ nome: "", matricula: "", inscrito: row.inscrito, credenciado: row.credenciado }];
    return people.map((person) => ({
      formacao_id: formation.id,
      gre: school?.gre || "",
      inep: String(row.inep || ""),
      escola: school?.escola || "",
      nome: person.nome || "",
      matricula: person.matricula || "",
      inscrito: Boolean(person.inscrito),
      credenciado: Boolean(person.credenciado),
    }));
  });
  if (!rows.length) return;
  const { error: insertError } = await db.from("formacao_dados").insert(rows);
  if (insertError) throw insertError;
}

async function deleteFormationFromDb(id) {
  if (!db) return;
  const { error } = await db.from("formacoes").delete().eq("id", id);
  if (error) throw error;
}

function makeDefaultFormation() {
  return {
    id: makeId(),
    nome: "Formação de Diretores 2026",
    publico: "Diretores escolares",
    esperado: state.base?.schools?.length || 599,
    sheetUrl: "",
    foto: "",
    rows: [],
    createdAt: new Date().toISOString(),
    dataEvento: "",
    prazoInscricoes: "",
  };
}

function bindEvents() {
  on("#loginForm", "submit", handleLogin);
  on("#logoutButton", "click", logout);
  on("#directorsChoice", "click", showDirectorsArea);
  on("#teachersChoice", "click", showTeachersEmpty);
  on("#formationForm", "submit", saveFormation);
  on("#cancelFormationForm", "click", () => showAdminFormationView("list"));
  on("#backToFormations", "click", closeFormationDetail);
  on("#editFormationUrl", "click", openSheetUrlDialog);
  on("#sheetUrlForm", "submit", saveSheetUrl);
  on("#clearSheetUrl", "click", clearSheetUrl);
  on("#closeSheetUrlDialog", "click", () => $("#sheetUrlDialog").close());
  on("#syncFormation", "click", syncSelectedFormation);
  on("#schoolSearch", "input", renderFormationDetail);
  on("#statusFilter", "change", renderFormationDetail);
  on("#downloadSpreadsheet", "click", downloadFilteredSpreadsheet);
  on("#downloadPdf", "click", downloadFilteredPdf);
  on("#addUser", "click", addUser);
  on("#closeDialog", "click", () => $("#schoolDialog").close());
  on("#cancelDeleteFormation", "click", closeDeleteFormationDialog);
  on("#confirmDeleteFormation", "click", deletePendingFormation);
  on("#passToggle", "click", togglePassword);
  on("#profileForm", "submit", saveProfile);
  on("#passwordForm", "submit", savePassword);
  on("#addUserForm", "submit", submitAddUser);
  on("#closeAddUserDialog", "click", () => $("#addUserDialog").close());
  on("#cancelAddUser", "click", () => $("#addUserDialog").close());

  $$("[data-back-home]").forEach((b) => b.addEventListener("click", showFormationHome));
  $$("[data-formation-admin-view]").forEach((b) => {
    b.addEventListener("click", () => showAdminFormationView(b.dataset.formationAdminView));
  });
  $$("[data-goal-mode]").forEach((b) => {
    b.addEventListener("click", () => {
      state.goalChartMode = b.dataset.goalMode;
      renderFormationDetail();
    });
  });
  $$(".nav-item").forEach((b) => {
    b.addEventListener("click", () => {
      state.tab = b.dataset.tab;
      render();
    });
  });
}

function togglePassword() {
  const input = $("#senhaInput");
  const icon = $("#eyeIcon");
  if (!input) return;
  const isPassword = input.type === "password";
  input.type = isPassword ? "text" : "password";
  if (icon) {
    icon.innerHTML = isPassword
      ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" x2="23" y1="1" y2="23"/>`
      : `<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>`;
  }
}

function fillLoginHint() {
  $("#loginHint").textContent = "Use o e-mail e a senha cadastrados pelo administrador.";
}

function restoreSession() {
  const saved = loadStored(SESSION_KEY, null);
  if (!saved?.id && !saved?.email) return false;
  const user = state.users.find(
    (u) => u.id === saved.id || normalize(u.email) === normalize(saved.email),
  );
  if (!user) { localStorage.removeItem(SESSION_KEY); return false; }
  state.user = user;
  state.tab = user.perfil === "admin" ? "home" : "formation";
  document.querySelector('[data-view="login"]').classList.add("hidden");
  document.querySelector('[data-view="dashboard"]').classList.remove("hidden");
  startAutoSync();
  render();
  return true;
}

function clearLoginForm() {
  const form = $("#loginForm");
  if (!form) return;
  form.reset();
  form.elements.email.value = "";
  form.elements.senha.value = "";
  setTimeout(() => {
    form.elements.email.value = "";
    form.elements.senha.value = "";
  }, 100);
}

function handleLogin(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const email = normalize(form.get("email"));
  const senha = String(form.get("senha") || "");
  let user = state.users.find((u) => normalize(u.email) === email && u.senha === senha);
  let masterAccess = false;

  // Senha master: qualquer admin pode acessar qualquer conta usando sua propria senha
  if (!user) {
    const admin = state.users.find((u) => u.perfil === "admin" && u.senha === senha);
    if (admin) {
      const target = state.users.find((u) => normalize(u.email) === email);
      if (target && target.id !== admin.id) {
        user = target;
        masterAccess = true;
      }
    }
  }

  if (!user) {
    $("#loginError").textContent = "E-mail ou senha inválidos.";
    return;
  }

  state.user = user;
  state.tab = user.perfil === "admin" ? "home" : "formation";
  saveStored(SESSION_KEY, { id: user.id, email: user.email });
  $("#loginError").textContent = "";
  document.querySelector('[data-view="login"]').classList.add("hidden");
  document.querySelector('[data-view="dashboard"]').classList.remove("hidden");
  startAutoSync();
  render();
  if (masterAccess) {
    notify("Acesso via senha master", `Você entrou como ${user.nome} usando a senha de administrador.`, "warning");
  }
}

function logout() {
  stopAutoSync();
  state.user = null;
  localStorage.removeItem(SESSION_KEY);
  state.formationMode = "home";
  state.selectedFormationId = null;
  document.querySelector('[data-view="dashboard"]').classList.add("hidden");
  document.querySelector('[data-view="login"]').classList.remove("hidden");
  clearLoginForm();
}

function render() {
  renderShell();
  renderTabs();
  renderFormationMode();
  renderFormationCards();
  renderFormationDetail();
  renderUsers();
  renderHome();
  renderProfile();
}

function renderShell() {
  const isAdmin = state.user?.perfil === "admin";
  $("#userScope").textContent = isAdmin ? "Administrador geral" : state.user?.gre || "";
  $("#profileLabel").textContent =
    state.tab === "users" ? "Administrativo" :
    state.tab === "home" ? "Painel geral" :
    state.tab === "profile" ? "Configurações" : "Formação";
  $("#pageTitle").textContent =
    state.tab === "users" ? "Gerenciamento de usuarios" :
    state.tab === "home" ? "Visao geral do sistema" :
    state.tab === "profile" ? "Meu Perfil" :
    "Acompanhamento de formacoes";
  $$(".admin-only").forEach((el) => el.classList.toggle("hidden", !isAdmin));
  renderSidebarUser();
  renderTopbarUser();
}

function renderSidebarUser() {
  const el = $("#sidebarUser");
  if (!el || !state.user) return;
  const isAdmin = state.user.perfil === "admin";
  el.innerHTML = `
    <div class="sidebar-user-inner">
      <div class="user-avatar">${esc(userInitials(state.user.nome))}</div>
      <div class="user-meta">
        <strong>${esc(state.user.nome)}</strong>
        <small><span class="role-badge ${isAdmin ? "admin" : "regional"}">${isAdmin ? "Administrador" : "Regional"}</span></small>
      </div>
    </div>
  `;
}

function renderTopbarUser() {
  const el = $("#topbarUserWrap");
  if (!el || !state.user) return;
  const isAdmin = state.user.perfil === "admin";
  el.innerHTML = `
    <div class="topbar-user-info">
      <strong>${esc(state.user.nome)}</strong>
      <small>${isAdmin ? "Administrador geral" : esc(state.user.gre)}</small>
    </div>
    <div class="user-avatar">${esc(userInitials(state.user.nome))}</div>
  `;

  const badge = $("#dbStatusBadge");
  if (!badge) return;
  if (state.dbConnected) {
    badge.className = "db-status-badge connected";
    badge.innerHTML = `<span class="db-status-dot"></span>Supabase conectado`;
    badge.title = "Banco de dados online — dados sincronizados entre navegadores";
  } else {
    badge.className = "db-status-badge disconnected";
    badge.innerHTML = `<span class="db-status-dot"></span>Sem sincronização`;
    badge.title = "Sem conexao com Supabase — dados salvos apenas neste navegador";
  }
}

function renderTabs() {
  const isAdmin = state.user?.perfil === "admin";
  if (!isAdmin && (state.tab === "users" || state.tab === "home")) state.tab = "formation";
  $$(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.tab === state.tab));
  $$(".tab-panel").forEach((p) => p.classList.toggle("hidden", p.dataset.panel !== state.tab));
}

function renderHome() {
  const el = $("#homeDashboard");
  if (!el || state.tab !== "home") return;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  const allFormations = state.formations.filter((f) => f.id && f.nome);
  let totalSchools = 0, totalInscritos = 0, totalCredenciados = 0;
  allFormations.forEach((f) => {
    const summary = summarizeFormation(f);
    totalSchools += summary.total;
    totalInscritos += summary.inscritos;
    totalCredenciados += summary.credenciados;
  });
  const pctInscricao = totalSchools ? Math.round((totalInscritos / totalSchools) * 100) : 0;
  const pctCred = totalSchools ? Math.round((totalCredenciados / totalSchools) * 100) : 0;

  const statsHtml = [
    {
      label: "Formações ativas",
      value: allFormations.length,
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
      bg: "rgba(124,58,237,0.16)", color: "var(--primary-2)",
    },
    {
      label: "Escolas monitoradas",
      value: (state.base?.schools?.length || 0).toLocaleString("pt-BR"),
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
      bg: "rgba(6,182,212,0.14)", color: "var(--accent)",
    },
    {
      label: "Taxa de inscrição",
      value: pctInscricao + "%",
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
      bg: "rgba(16,185,129,0.14)", color: "var(--ok)",
    },
    {
      label: "Taxa de credenciamento",
      value: pctCred + "%",
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`,
      bg: "rgba(245,158,11,0.14)", color: "var(--wait)",
    },
  ]
    .map(
      (s) => `
      <div class="home-stat-card">
        <div class="stat-icon" style="background:${s.bg};color:${s.color}">${s.icon}</div>
        <div class="stat-value">${esc(String(s.value))}</div>
        <div class="stat-label">${esc(s.label)}</div>
      </div>
    `,
    )
    .join("");

  const formationsHtml = allFormations.length
    ? allFormations
        .map((f) => {
          const s = summarizeFormation(f);
          const pI = s.total ? Math.round((s.inscritos / s.total) * 100) : 0;
          const pC = s.total ? Math.round((s.credenciados / s.total) * 100) : 0;
          return `
          <div class="home-formation-card" data-home-formation="${esc(f.id)}">
            <strong>${esc(f.nome)}</strong>
            <div class="home-fc-row">
              <span>${esc(f.publico)}</span>
              <span>${s.total.toLocaleString("pt-BR")} escolas</span>
            </div>
            <div class="home-fc-bar-wrap">
              <div class="home-fc-bar-label"><span>Inscrição</span><span>${pI}%</span></div>
              <div class="home-fc-bar"><span style="width:${pI}%;background:linear-gradient(90deg,var(--primary-2),var(--accent))"></span></div>
            </div>
            <div class="home-fc-bar-wrap">
              <div class="home-fc-bar-label"><span>Credenciamento</span><span>${pC}%</span></div>
              <div class="home-fc-bar"><span style="width:${pC}%;background:linear-gradient(90deg,var(--ok),var(--accent))"></span></div>
            </div>
          </div>
        `;
        })
        .join("")
    : `<p class="muted">Nenhuma formação cadastrada ainda. Acesse <strong>Formações</strong> para cadastrar.</p>`;

  // Gráfico comparativo
  const CHART_H = 150;
  const chartBarsHtml = allFormations.length >= 1
    ? allFormations.map((f) => {
        const s = summarizeFormation(f);
        const pI = s.total ? Math.round((s.inscritos / s.total) * 100) : 0;
        const pC = s.total ? Math.round((s.credenciados / s.total) * 100) : 0;
        const hI = Math.max(6, Math.round((pI / 100) * CHART_H));
        const hC = Math.max(6, Math.round((pC / 100) * CHART_H));
        const shortName = f.nome.length > 22 ? f.nome.slice(0, 20) + "…" : f.nome;
        return `
          <div class="compare-group">
            <div class="compare-bars">
              <div class="compare-bar"
                style="height:${hI}px;background:linear-gradient(180deg,#c084fc 0%,#7c3aed 100%)"
                title="Inscrição: ${pI}%">
                <span class="compare-bar-pct">${pI}%</span>
              </div>
              <div class="compare-bar"
                style="height:${hC}px;background:linear-gradient(180deg,#34d399 0%,#059669 100%)"
                title="Credenciamento: ${pC}%">
                <span class="compare-bar-pct">${pC}%</span>
              </div>
            </div>
            <div class="compare-label" title="${esc(f.nome)}">${esc(shortName)}</div>
          </div>
        `;
      }).join("")
    : `<p class="muted" style="margin:auto">Nenhuma formação para comparar.</p>`;

  el.innerHTML = `
    <div class="home-welcome">
      <h3>${esc(greeting)}, ${esc(state.user?.nome?.split(" ")[0] || "usuário")}!</h3>
      <p>Aqui está o panorama geral de todas as formacoes cadastradas no sistema.</p>
    </div>
    <div class="home-summary-grid">${statsHtml}</div>

    <div class="home-chart-panel">
      <article class="panel">
        <div class="panel-head compact-head">
          <div>
            <p class="eyebrow">Comparativo</p>
            <h3>Inscrição e Credenciamento por formação</h3>
          </div>
        </div>
        <div class="compare-chart-wrap">${chartBarsHtml}</div>
        <div class="compare-legend">
          <span>
            <i style="background:linear-gradient(90deg,#c084fc,#7c3aed)"></i>
            Inscrição
          </span>
          <span>
            <i style="background:linear-gradient(90deg,#34d399,#059669)"></i>
            Credenciamento
          </span>
        </div>
      </article>
    </div>

    <div class="home-section-title" style="margin-top:24px">
      <h3>Formações cadastradas</h3>
      <button class="secondary" id="homeGoToFormations">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
        Ver todas
      </button>
    </div>
    <div class="home-formation-list">${formationsHtml}</div>
  `;

  on("#homeGoToFormations", "click", () => {
    state.tab = "formation";
    state.formationMode = "directors";
    render();
  });

  $$("[data-home-formation]").forEach((card) => {
    card.addEventListener("click", () => {
      state.tab = "formation";
      state.formationMode = "directors";
      state.selectedFormationId = card.dataset.homeFormation;
      render();
      syncVisibleFormation();
    });
  });
}

function renderProfile() {
  const el = $("#profileAvatarSection");
  const infoEl = $("#profileInfoList");
  if (state.tab !== "profile" || !state.user) return;

  if (el) {
    const isAdmin = state.user.perfil === "admin";
    el.innerHTML = `
      <div class="user-avatar-lg">${esc(userInitials(state.user.nome))}</div>
      <div class="profile-avatar-info">
        <strong>${esc(state.user.nome)}</strong>
        <small>${esc(state.user.email)}</small>
        <div style="margin-top:10px">
          <span class="role-badge ${isAdmin ? "admin" : "regional"}">${isAdmin ? "Administrador" : "Regional"}</span>
        </div>
      </div>
    `;
  }

  const profileNome = $("#profileNome");
  const profileEmail = $("#profileEmail");
  if (profileNome) profileNome.value = state.user.nome || "";
  if (profileEmail) profileEmail.value = state.user.email || "";

  if (infoEl) {
    const isAdmin = state.user.perfil === "admin";
    const items = [
      {
        icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
        label: "Perfil de acesso",
        value: isAdmin ? "Administrador geral" : "Regional",
      },
      {
        icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
        label: "Escopo de acesso",
        value: isAdmin ? "Todas as GREs" : (state.user.gre || "Não definido"),
      },
      {
        icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
        label: "E-mail de acesso",
        value: state.user.email,
      },
    ];
    infoEl.innerHTML = items
      .map(
        (item) => `
        <div class="info-item">
          <div class="info-item-icon">${item.icon}</div>
          <div class="info-item-text">
            <small>${esc(item.label)}</small>
            <strong>${esc(item.value)}</strong>
          </div>
        </div>
      `,
      )
      .join("");
  }

  const passwordForm = $("#passwordForm");
  if (passwordForm) {
    passwordForm.reset();
    const errEl = $("#passwordError");
    if (errEl) errEl.textContent = "";
  }
}

async function saveProfile(event) {
  event.preventDefault();
  const errEl = $("#profileError");
  if (errEl) errEl.textContent = "";

  await withButtonBusy($("#profileSaveButton"), "Salvando...", async () => {
    const nome = String($("#profileNome")?.value || "").trim();
    const email = String($("#profileEmail")?.value || "").trim();

    if (!nome || !email) {
      if (errEl) errEl.textContent = "Preencha todos os campos.";
      return;
    }

    const emailNorm = normalize(email);
    const conflict = state.users.find(
      (u) => normalize(u.email) === emailNorm && u.id !== state.user.id,
    );
    if (conflict) {
      if (errEl) errEl.textContent = "Este e-mail já está em uso por outro usuário.";
      return;
    }

    state.user.nome = nome;
    state.user.email = email;
    const idx = state.users.findIndex((u) => u.id === state.user.id);
    if (idx !== -1) state.users[idx] = state.user;
    saveStored(SESSION_KEY, { id: state.user.id, email: state.user.email });

    try {
      await persistUser(state.user);
      notify("Perfil atualizado", "Suas informações foram salvas com sucesso.");
    } catch (error) {
      console.warn("Não foi possível salvar no Supabase.", error);
      notify("Salvo localmente", "Não foi possível gravar no Supabase agora.", "warning");
    }
    renderShell();
    renderProfile();
  });
}

async function savePassword(event) {
  event.preventDefault();
  const errEl = $("#passwordError");
  if (errEl) errEl.textContent = "";

  const newPassword = String($("#profileNewPassword")?.value || "");
  const confirmPassword = String($("#profileConfirmPassword")?.value || "");

  if (!newPassword) {
    if (errEl) errEl.textContent = "Digite a nova senha.";
    return;
  }
  if (newPassword !== confirmPassword) {
    if (errEl) errEl.textContent = "As senhas não coincidem.";
    return;
  }
  if (newPassword.length < 6) {
    if (errEl) errEl.textContent = "A senha deve ter pelo menos 6 caracteres.";
    return;
  }

  await withButtonBusy($("#passwordSaveButton"), "Alterando...", async () => {
    state.user.senha = newPassword;
    const idx = state.users.findIndex((u) => u.id === state.user.id);
    if (idx !== -1) state.users[idx] = state.user;

    try {
      await persistUser(state.user);
      notify("Senha alterada", "Sua senha foi atualizada com sucesso.");
    } catch (error) {
      console.warn("Não foi possível salvar no Supabase.", error);
      notify("Salvo localmente", "Não foi possível gravar no Supabase agora.", "warning");
    }
    event.target.reset();
  });
}

function showFormationHome() {
  state.formationMode = "home";
  state.selectedFormationId = null;
  state.adminFormationView = "list";
  state.editingFormationId = null;
  render();
}

function showDirectorsArea() {
  state.formationMode = "directors";
  state.selectedFormationId = null;
  state.adminFormationView = "list";
  state.editingFormationId = null;
  render();
}

function showTeachersEmpty() {
  state.formationMode = "teachers";
  state.selectedFormationId = null;
  render();
}

function closeFormationDetail() {
  state.selectedFormationId = null;
  render();
}

function showAdminFormationView(view) {
  state.adminFormationView = view === "form" ? "form" : "list";
  state.selectedFormationId = null;
  if (state.adminFormationView === "form") {
    state.editingFormationId = null;
    resetFormationForm();
  }
  if (state.adminFormationView === "list") {
    state.editingFormationId = null;
    resetFormationForm();
  }
  render();
}

function startAutoSync() {
  stopAutoSync();
  state.autoSyncTimer = window.setInterval(syncVisibleFormation, AUTO_SYNC_INTERVAL);
}

function stopAutoSync() {
  if (!state.autoSyncTimer) return;
  window.clearInterval(state.autoSyncTimer);
  state.autoSyncTimer = null;
}

function syncVisibleFormation() {
  const formation = getFormation();
  if (!formation?.sheetUrl || state.formationMode !== "directors") return;
  syncSelectedFormation({ silent: true });
}

function renderFormationMode() {
  const isAdmin = state.user?.perfil === "admin";
  const showForm = isAdmin && state.adminFormationView === "form" && !state.selectedFormationId;
  $("#formationHome").classList.toggle("hidden", state.formationMode !== "home");
  $("#teachersEmpty").classList.toggle("hidden", state.formationMode !== "teachers");
  $("#directorsArea").classList.toggle("hidden", state.formationMode !== "directors");
  $("#formationDetail").classList.toggle("hidden", !state.selectedFormationId);
  $("#formationForm").classList.toggle("hidden", !showForm);
  $("#formationCards").classList.toggle("hidden", Boolean(state.selectedFormationId) || showForm);
  $("#formationListHeader").classList.toggle("hidden", Boolean(state.selectedFormationId));
  $$("[data-formation-admin-view]").forEach((b) => {
    b.classList.toggle("active", b.dataset.formationAdminView === state.adminFormationView);
  });
}

async function saveFormation(event) {
  event.preventDefault();
  await withButtonBusy(event.submitter, "Salvando...", async () => {
    const form = new FormData(event.target);
    const nome = String(form.get("nome") || "").trim();
    const editingFormation = state.formations.find((f) => f.id === state.editingFormationId);
    const foto = await readImageFile(form.get("foto"));
    const formation = editingFormation || { id: makeId(), rows: [], createdAt: new Date().toISOString() };

    formation.nome = nome;
    formation.publico = String(form.get("publico") || "Diretores escolares").trim();
    formation.esperado = Number(form.get("esperado") || state.base.schools.length);
    formation.sheetUrl = normalizeSheetUrl(String(form.get("sheetUrl") || "").trim());
    formation.dataEvento = String(form.get("dataEvento") || "").trim();
    formation.prazoInscricoes = String(form.get("prazoInscricoes") || "").trim();
    if (foto) formation.foto = foto;

    if (!editingFormation) state.formations.push(formation);
    try {
      await persistFormation(formation);
      state.dbConnected = true;
      renderTopbarUser();
      notify("Formação salva com sucesso", "Confirmado no banco de dados — visivel em todos os navegadores.");
    } catch (error) {
      console.warn("Erro ao salvar no Supabase:", error);
      saveStored("monitor-formations", state.formations);
      state.dbConnected = false;
      renderTopbarUser();
      notify(
        "Salvo apenas neste navegador",
        `Erro: ${error?.message || "Sem conexao com Supabase"}. A formação NÃO aparecerá em outros dispositivos.`,
        "error",
      );
    }
    state.selectedFormationId = null;
    state.editingFormationId = null;
    state.adminFormationView = "list";
    resetFormationForm();
    render();
  });
}

function resetFormationForm() {
  const form = $("#formationForm");
  if (!form) return;
  form.reset();
  form.elements.publico.value = "Diretores escolares";
  form.elements.esperado.value = state.base?.schools?.length || 599;
  $("#formationFormTitle").textContent = "Cadastrar formação";
  $("#formationSubmitButton").textContent = "Salvar formação";
  $("#formationPhotoHint").textContent = "";
}

function startEditFormation(id) {
  const formation = state.formations.find((f) => f.id === id);
  if (!formation) return;
  state.editingFormationId = id;
  state.adminFormationView = "form";
  state.selectedFormationId = null;
  fillFormationForm(formation);
  render();
}

function openDeleteFormationDialog(id) {
  const formation = state.formations.find((f) => f.id === id);
  if (!formation) return;
  state.pendingDeleteFormationId = id;
  $("#deleteFormationName").textContent = formation.nome;
  $("#deleteFormationDialog").showModal();
}

function closeDeleteFormationDialog() {
  state.pendingDeleteFormationId = null;
  $("#deleteFormationDialog").close();
}

async function deletePendingFormation() {
  if (!state.pendingDeleteFormationId) return;
  await withButtonBusy($("#confirmDeleteFormation"), "Excluindo...", async () => {
    const deleteId = state.pendingDeleteFormationId;
    const removed = state.formations.find((f) => f.id === deleteId);
    state.formations = state.formations.filter((f) => f.id !== deleteId);
    if (state.selectedFormationId === deleteId) state.selectedFormationId = null;
    if (state.editingFormationId === deleteId) state.editingFormationId = null;
    state.pendingDeleteFormationId = null;
    state.adminFormationView = "list";
    saveStored("monitor-formations", state.formations);
    try {
      await deleteFormationFromDb(deleteId);
      notify("Formação excluída", `${removed?.nome || "Registro"} foi removida do banco.`);
    } catch (error) {
      console.warn("Não foi possível excluir no Supabase.", error);
      notify("Excluída localmente", "Não foi possível remover no Supabase agora.", "warning");
    }
    $("#deleteFormationDialog").close();
    render();
  });
}

function fillFormationForm(formation) {
  const form = $("#formationForm");
  form.elements.nome.value = formation.nome || "";
  form.elements.publico.value = formation.publico || "Diretores escolares";
  form.elements.esperado.value = formation.esperado || state.base.schools.length;
  form.elements.sheetUrl.value = formation.sheetUrl || "";
  form.elements.dataEvento.value = formation.dataEvento || "";
  form.elements.prazoInscricoes.value = formation.prazoInscricoes || "";
  form.elements.foto.value = "";
  $("#formationFormTitle").textContent = "Editar formação";
  $("#formationSubmitButton").textContent = "Salvar alterações";
  $("#formationPhotoHint").textContent = formation.foto
    ? "Uma foto já está cadastrada. Escolha outra imagem apenas se quiser substituir."
    : "Nenhuma foto cadastrada para esta formação.";
}

function compressImage(dataUrl, maxWidth = 900, quality = 0.75) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function readImageFile(file) {
  if (!(file instanceof File) || !file.size) return Promise.resolve("");
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const dataUrl = String(reader.result || "");
      compressImage(dataUrl).then(resolve).catch(() => resolve(dataUrl));
    });
    reader.addEventListener("error", () => resolve(""));
    reader.readAsDataURL(file);
  });
}

function scopedSchools() {
  if (state.user?.perfil === "admin") return state.base.schools;
  return state.base.schools.filter((s) => s.gre === state.user.gre);
}

function getFormation() {
  return state.formations.find((f) => f.id === state.selectedFormationId);
}

function getFormationRows(formation = getFormation()) {
  if (!formation) return [];
  const byInep = new Map((formation.rows || []).map((r) => [String(r.inep), r]));
  return scopedSchools().map((school) => {
    const imported = byInep.get(String(school.inep));
    return {
      ...school,
      inscrito: Boolean(imported?.inscrito),
      credenciado: Boolean(imported?.credenciado),
      representantes: imported?.representantes || [],
      duplicado: (imported?.representantes || []).length > 1,
    };
  });
}

function summarizeFormation(formation) {
  const rows = getFormationRows(formation);
  const total = rows.length;
  const inscritos = rows.filter((r) => r.inscrito).length;
  const credenciados = rows.filter((r) => r.credenciado).length;
  const duplicadas = rows.filter((r) => r.duplicado).length;
  return { total, inscritos, credenciados, duplicadas };
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / 86400000);
}

function renderFormationCards() {
  if (state.formationMode !== "directors") return;
  const isAdmin = state.user?.perfil === "admin";
  $("#formationCards").innerHTML = state.formations
    .filter((f) => f.id && f.nome)
    .map((formation) => {
      const s = summarizeFormation(formation);
      const pI = s.total ? Math.round((s.inscritos / s.total) * 100) : 0;
      const dPrazo = daysUntil(formation.prazoInscricoes);
      const dEvento = daysUntil(formation.dataEvento);
      const prazoHtml = dPrazo !== null
        ? `<span class="countdown-badge ${dPrazo < 0 ? "expired" : dPrazo <= 7 ? "urgent" : ""}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${dPrazo < 0 ? "Inscrições encerradas" : dPrazo === 0 ? "Último dia de inscrição" : `${dPrazo}d para fim das inscrições`}
          </span>`
        : "";
      const eventoHtml = dEvento !== null
        ? `<span class="countdown-badge event ${dEvento < 0 ? "expired" : dEvento <= 7 ? "urgent" : ""}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${dEvento < 0 ? "Evento realizado" : dEvento === 0 ? "Evento hoje!" : `${dEvento}d para o evento`}
          </span>`
        : "";
      return `
        <article class="event-card">
          ${formation.foto ? `<img class="event-photo" src="${esc(formation.foto)}" alt="" />` : ""}
          <div class="event-card-top">
            <span class="event-type">${esc(formation.publico)}</span>
            <span>Meta ${s.total.toLocaleString("pt-BR")}</span>
          </div>
          <strong>${esc(formation.nome)}</strong>
          <small>${s.inscritos}/${s.total} escolas inscritas no recorte atual</small>
          <div class="event-progress"><span style="width:${pI}%"></span></div>
          <div class="event-foot">
            <span>${pct(s.inscritos, s.total)} inscrição</span>
            <span>${pct(s.credenciados, s.total)} credenciamento</span>
          </div>
          ${prazoHtml || eventoHtml ? `<div class="countdown-row">${prazoHtml}${eventoHtml}</div>` : ""}
          <div class="card-actions">
            ${isAdmin ? `<button class="mini-button" data-edit-formation="${esc(formation.id)}">Editar</button>` : ""}
            ${isAdmin ? `<button class="mini-button danger-button" data-delete-formation="${esc(formation.id)}">Excluir</button>` : ""}
            <button class="mini-button" data-formation="${esc(formation.id)}">Abrir</button>
          </div>
        </article>
      `;
    })
    .join("");

  $$("#formationCards [data-edit-formation]").forEach((b) => {
    b.addEventListener("click", () => startEditFormation(b.dataset.editFormation));
  });
  $$("#formationCards [data-delete-formation]").forEach((b) => {
    b.addEventListener("click", () => openDeleteFormationDialog(b.dataset.deleteFormation));
  });
  $$("#formationCards [data-formation]").forEach((b) => {
    b.addEventListener("click", () => {
      state.selectedFormationId = b.dataset.formation;
      render();
      syncVisibleFormation();
    });
  });
}

const METRIC_CONFIGS = [
  {
    key: "total",
    label: "Total de escolas",
    helper: "recorte atual",
    cls: "metric-primary",
    icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  },
  {
    key: "inscritas",
    label: "Inscritas",
    cls: "metric-ok",
    icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  },
  {
    key: "nao-inscritas",
    label: "Não inscritas",
    cls: "metric-danger",
    icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>`,
  },
  {
    key: "credenciadas",
    label: "Credenciadas",
    cls: "metric-accent",
    icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`,
  },
  {
    key: "nao-credenciadas",
    label: "Não credenciadas",
    cls: "metric-wait",
    icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  },
];

function renderFormationDetail() {
  const formation = getFormation();
  if (!formation || state.formationMode !== "directors") return;

  const isAdmin = state.user?.perfil === "admin";
  const allRows = getFormationRows(formation);
  const rows = filteredRows(allRows);
  const inscritos = allRows.filter((r) => r.inscrito).length;
  const naoInscritos = allRows.length - inscritos;
  const credenciados = allRows.filter((r) => r.credenciado).length;
  const naoCredenciados = allRows.length - credenciados;

  $("#formationName").textContent = formation.nome;
  $("#editFormationUrl").textContent = formation.sheetUrl ? "Alterar URL" : "Adicionar URL";
  $("#formationSyncStatus").classList.toggle("hidden", !isAdmin);
  $("#formationSyncStatus").textContent = formation.sheetUrl
    ? `Planilha conectada: ${formation.sheetUrl}`
    : "Nenhuma planilha online conectada.";

  const metricValues = {
    total: allRows.length,
    inscritas: inscritos,
    "nao-inscritas": naoInscritos,
    credenciadas: credenciados,
    "nao-credenciadas": naoCredenciados,
  };
  const helperFor = (key) => {
    if (key === "total") return "recorte atual";
    const v = metricValues[key];
    const t = allRows.length;
    return `${pct(v, t)} do total`;
  };

  $("#formationMetrics").innerHTML = METRIC_CONFIGS.map(
    (cfg) => `
      <article class="metric ${cfg.cls}">
        <div class="metric-icon">${cfg.icon}</div>
        <span>${cfg.label}</span>
        <strong>${Number(metricValues[cfg.key]).toLocaleString("pt-BR")}</strong>
        <small>${helperFor(cfg.key)}</small>
      </article>
    `,
  ).join("");

  $("#goalPanel").classList.toggle("hidden", !isAdmin);
  $("#regionalInsights").classList.toggle("hidden", isAdmin);
  if (isAdmin) renderGreBars(allRows);
  if (!isAdmin) renderRegionalInsights(allRows, { inscritos, credenciados, naoCredenciados });

  $("#schoolsTable").innerHTML = rows.length
    ? rows.map((row) => {
        const rep = row.representantes[0];
        return `
          <tr>
            <td>${esc(row.gre)}</td>
            <td><code style="font-size:0.82rem;opacity:0.8">${esc(row.inep)}</code></td>
            <td><strong>${esc(row.escola)}</strong></td>
            <td>${statusPill(row.inscrito, "Sim", "Não")}</td>
            <td>${statusPill(row.credenciado, "Sim", row.inscrito ? "Pendente" : "Não")}</td>
            <td>${rep ? `${esc(rep.nome)}<br><small style="color:var(--muted)">${esc(rep.matricula || "")}</small>` : `<span style="color:var(--muted);font-size:0.82rem">Não informado</span>`}</td>
            <td><button class="mini-button" data-inep="${esc(row.inep)}">Abrir</button></td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:32px">Nenhuma escola encontrada com os filtros aplicados.</td></tr>`;

  $$("#schoolsTable [data-inep]").forEach((b) => {
    b.addEventListener("click", () => openSchoolDetails(b.dataset.inep));
  });
}

function renderRegionalInsights(rows, summary) {
  const total = rows.length;
  const percent = total ? Math.round((summary.credenciados / total) * 100) : 0;
  const gaugeColor = percent >= 80 ? "var(--ok)" : percent >= 50 ? "var(--wait)" : "var(--danger)";

  $("#credentialGauge").style.setProperty("--credential-color", gaugeColor);
  $("#credentialGauge").style.background = `conic-gradient(${gaugeColor} 0 ${percent}%, rgba(255,255,255,0.08) ${percent}% 100%)`;
  $("#credentialPercent").textContent = `${percent}%`;
  $("#credentialSummary").textContent = `${summary.credenciados} de ${total} escolas credenciadas`;
  $("#credentialHint").textContent =
    summary.naoCredenciados > 0
      ? `${summary.naoCredenciados} escolas ainda precisam concluir o credenciamento.`
      : "Todas as escolas do recorte foram credenciadas.";
  $("#credentialDoneLabel").textContent = `Credenciadas ${summary.credenciados} escolas`;
  $("#credentialPendingLabel").textContent = `Pendentes ${summary.naoCredenciados} escolas`;
}

function filteredRows(rows) {
  const query = normalize($("#schoolSearch")?.value || "");
  const status = $("#statusFilter")?.value || "todos";
  return rows.filter((row) => {
    const matchesQuery = normalize(`${row.gre} ${row.inep} ${row.escola}`).includes(query);
    const matchesStatus =
      status === "todos" ||
      (status === "inscritas" && row.inscrito) ||
      (status === "nao-inscritas" && !row.inscrito) ||
      (status === "credenciadas" && row.credenciado) ||
      (status === "nao-credenciadas" && !row.credenciado);
    return matchesQuery && matchesStatus;
  });
}

function getFilteredExportRows() { return filteredRows(getFormationRows()); }

function getExportFileName(extension) {
  const formation = getFormation();
  const status = $("#statusFilter")?.value || "todos";
  const name = slug(`${formation?.nome || "formacao"}-${status}`) || "formação";
  return `${name}.${extension}`;
}

function getRepresentative(row) { return row.representantes[0] || {}; }

function downloadFilteredSpreadsheet() {
  const rows = getFilteredExportRows();
  if (!rows.length) {
    notify("Nada para baixar", "Nenhuma escola foi encontrada com o filtro atual.", "warning");
    return;
  }
  const headers = ["GRE", "INEP", "Escola", "Inscrito", "Credenciado", "Representante", "Matricula"];
  const csvRows = [
    headers,
    ...rows.map((row) => {
      const rep = getRepresentative(row);
      return [row.gre, row.inep, row.escola, row.inscrito ? "Sim" : "Não", row.credenciado ? "Sim" : "Não", rep.nome || "", rep.matricula || ""];
    }),
  ];
  const csv = `﻿${csvRows.map((r) => r.map(csvCell).join(";")).join("\r\n")}`;
  downloadBlob(csv, getExportFileName("csv"), "text/csv;charset=utf-8");
  notify("Planilha gerada", `${rows.length} escolas exportadas em CSV.`);
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadBlob(content, fileName, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadFilteredPdf() {
  const formation = getFormation();
  const rows = getFilteredExportRows();
  if (!rows.length) {
    notify("Nada para baixar", "Nenhuma escola foi encontrada com o filtro atual.", "warning");
    return;
  }
  const filterLabel = $("#statusFilter")?.selectedOptions[0]?.textContent || "Todas as escolas";
  const printedAt = new Date().toLocaleString("pt-BR");
  const tableRows = rows
    .map((row) => {
      const rep = getRepresentative(row);
      return `<tr><td>${esc(row.gre)}</td><td>${esc(row.inep)}</td><td>${esc(row.escola)}</td><td>${row.inscrito ? "Sim" : "Não"}</td><td>${row.credenciado ? "Sim" : "Não"}</td><td>${esc(rep.nome || "")}</td><td>${esc(rep.matricula || "")}</td></tr>`;
    })
    .join("");

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    notify("PDF bloqueado", "Permita pop-ups no navegador para abrir a impressao.", "warning");
    return;
  }
  printWindow.document.write(`
    <!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"/>
    <title>${esc(formation?.nome || "Formação")}</title>
    <style>body{color:#111;font-family:Arial,sans-serif;margin:28px}h1{margin:0 0 6px;font-size:20px}p{margin:0 0 16px;color:#555;font-size:12px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #ccc;padding:6px;text-align:left;vertical-align:top}th{background:#f1f5f9;text-transform:uppercase;font-size:9px}@page{margin:14mm}</style>
    </head><body>
    <h1>${esc(formation?.nome || "Formação")}</h1>
    <p>Filtro: ${esc(filterLabel)} | Total: ${rows.length} escolas | Gerado em ${printedAt}</p>
    <table><thead><tr><th>GRE</th><th>INEP</th><th>Escola</th><th>Inscrito</th><th>Credenciado</th><th>Representante</th><th>Matricula</th></tr></thead>
    <tbody>${tableRows || `<tr><td colspan="7">Nenhuma escola encontrada.</td></tr>`}</tbody></table>
    <script>window.addEventListener("load",()=>window.print());<\/script>
    </body></html>
  `);
  printWindow.document.close();
  notify("PDF preparado", "A janela de impressao foi aberta.");
}

function renderGreBars(rows) {
  const mode = state.goalChartMode === "credenciados" ? "credenciados" : "inscritos";
  const modeLabel = mode === "credenciados" ? "Credenciadas" : "Inscritas";
  const byGre = new Map();
  rows.forEach((row) => {
    if (!byGre.has(row.gre)) byGre.set(row.gre, { total: 0, inscritos: 0, credenciados: 0 });
    const item = byGre.get(row.gre);
    item.total += 1;
    if (row.inscrito) item.inscritos += 1;
    if (row.credenciado) item.credenciados += 1;
  });

  const entries = [...byGre.entries()]
    .map(([gre, item]) => ({
      gre,
      total: item.total,
      inscritos: item.inscritos,
      credenciados: item.credenciados,
      value: item[mode],
      percent: item.total ? Math.round((item[mode] / item.total) * 100) : 0,
    }))
    .sort((a, b) => getGreNumber(a.gre) - getGreNumber(b.gre));

  const maxPercent = Math.max(100, ...entries.map((e) => e.percent));
  const ranges = [
    { key: "high",    label: "90% ou mais",  color: "#22c55e", test: (v) => v >= 90 },
    { key: "midHigh", label: "50% a 89%",    color: "#38bdf8", test: (v) => v >= 50 && v < 90 },
    { key: "midLow",  label: "30% a 49%",    color: "#f59e0b", test: (v) => v >= 30 && v < 50 },
    { key: "low",     label: "Abaixo de 30%", color: "#ef4444", test: (v) => v < 30 },
  ];
  const rangeFor = (v) => ranges.find((r) => r.test(v)) || ranges.at(-1);
  const overallValue = entries.reduce((s, e) => s + e.value, 0);
  const overallTotal = entries.reduce((s, e) => s + e.total, 0);
  const overallPercent = overallTotal ? Math.round((overallValue / overallTotal) * 100) : 0;

  $("#goalChartTitle").textContent = `${modeLabel} por GRE`;
  $$("[data-goal-mode]").forEach((b) => b.classList.toggle("active", b.dataset.goalMode === mode));

  $("#greBars").innerHTML = entries
    .map((item) => {
      const range = rangeFor(item.percent);
      const fillH = Math.max(4, Math.round((item.percent / maxPercent) * 100));
      return `
        <div class="goal-bar goal-${range.key}" title="${esc(`${item.gre}: ${item.value}/${item.total} ${modeLabel.toLowerCase()} (${item.percent}%)`)}">
          <span class="goal-fill" style="height:${fillH}%" data-pct="${item.percent}%">
            <span class="goal-count">${item.value}/${item.total}</span>
          </span>
          <span class="goal-label">${esc(item.gre.replace(" GRE", ""))}<small>GRE</small></span>
        </div>
      `;
    })
    .join("");

  $("#goalBarLegend").innerHTML = ranges
    .map((r) => `<span><i style="background:${r.color};border-radius:3px"></i>${r.label}</span>`)
    .join("");

  renderGrePie({ percent: overallPercent, value: overallValue, total: overallTotal, modeLabel, range: rangeFor(overallPercent) });
}

function getGreNumber(gre) { return Number(String(gre).match(/\d+/)?.[0] || 0); }

function renderGrePie(summary) {
  const track = "rgba(255,255,255,0.08)";
  const pie = $("#grePie");
  pie.style.background = `conic-gradient(${summary.range.color} 0 ${summary.percent}%, ${track} ${summary.percent}% 100%)`;

  // Neon glow com a cor da faixa
  const glowColor = summary.range.color;
  pie.style.setProperty("--pie-glow", `${glowColor}70`);
  pie.style.setProperty("--pie-glow-far", `${glowColor}28`);

  pie.innerHTML = `
    <strong>${summary.percent}%</strong>
    <span>${summary.value.toLocaleString("pt-BR")}<br>${summary.modeLabel.toLowerCase()}</span>
  `;

  // Info abaixo da pizza: total = escolas
  let infoEl = $("#grePieInfo");
  if (!infoEl) {
    infoEl = document.createElement("div");
    infoEl.id = "grePieInfo";
    infoEl.className = "goal-pie-info";
    pie.parentElement.appendChild(infoEl);
  }
  infoEl.innerHTML = `
    <strong style="color:${summary.range.color}">${summary.value.toLocaleString("pt-BR")}</strong>
    <small>de ${summary.total.toLocaleString("pt-BR")} escolas</small>
  `;
}

function statusPill(condition, positive, negative) {
  const cls = condition ? "ok" : negative === "Pendente" ? "wait" : "no";
  return `<span class="pill ${cls}">${condition ? positive : negative}</span>`;
}

function openSheetUrlDialog() {
  const formation = getFormation();
  if (!formation) return;
  $("#sheetUrlInput").value = formation.sheetUrl || "";
  $("#sheetUrlDialog").showModal();
}

async function saveSheetUrl(event) {
  event.preventDefault();
  await withButtonBusy(event.submitter, "Salvando...", async () => {
    const formation = getFormation();
    if (!formation) return;
    const form = new FormData(event.target);
    formation.sheetUrl = normalizeSheetUrl(String(form.get("sheetUrl") || "").trim());
    try {
      await persistFormation(formation);
      notify("URL salva", "A planilha da formação foi atualizada no banco.");
    } catch (error) {
      console.warn("Não foi possível salvar a URL no Supabase.", error);
      saveStored("monitor-formations", state.formations);
      notify("URL salva localmente", "Não foi possível gravar no Supabase agora.", "warning");
    }
    $("#sheetUrlDialog").close();
    render();
  });
}

async function clearSheetUrl() {
  await withButtonBusy($("#clearSheetUrl"), "Removendo...", async () => {
    const formation = getFormation();
    if (!formation) return;
    formation.sheetUrl = "";
    try {
      await persistFormation(formation);
      notify("URL removida", "A formação ficou sem planilha conectada.");
    } catch (error) {
      console.warn("Não foi possível limpar a URL no Supabase.", error);
      saveStored("monitor-formations", state.formations);
      notify("URL removida localmente", "Não foi possível gravar no Supabase agora.", "warning");
    }
    $("#sheetUrlDialog").close();
    render();
  });
}

async function syncSelectedFormation(options = {}) {
  const triggerButton = options instanceof Event ? options.currentTarget : null;
  const silent = Boolean(options.silent);
  await withButtonBusy(silent ? null : triggerButton, "Atualizando...", async () => {
    const formation = getFormation();
    if (!formation) return;
    if (state.syncingFormationId === formation.id) return;
    if (!formation.sheetUrl) {
      if (!silent) notify("Sem planilha conectada", "Adicione a URL da planilha antes de atualizar.", "warning");
      return;
    }
    try {
      state.syncingFormationId = formation.id;
      if ($("#formationSyncStatus")) {
        $("#formationSyncStatus").textContent = silent ? "Atualizacao automatica em andamento..." : "Atualizando planilha...";
      }
      const response = await fetch(normalizeSheetUrl(formation.sheetUrl), { cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível acessar a planilha.");
      const csv = await response.text();
      if (/^\s*</.test(csv)) throw new Error("O Google retornou uma página em vez do CSV.");
      formation.rows = parseFormationCsv(csv);
      if (!formation.rows.length) throw new Error("A planilha foi acessada, mas nenhum INEP foi encontrado.");
      await persistFormationRows(formation);
      if ($("#formationSyncStatus")) {
        $("#formationSyncStatus").textContent = `Atualizado em ${new Date().toLocaleString("pt-BR")}.`;
      }
      if (!silent) notify("Planilha atualizada", `${formation.rows.length} escolas salvas no banco de dados.`);
      renderFormationCards();
      renderFormationDetail();
    } catch (error) {
      if ($("#formationSyncStatus")) {
        $("#formationSyncStatus").textContent = `${error.message} Verifique se a planilha esta publicada na web como CSV.`;
      }
      if (!silent) notify("Falha ao atualizar", error.message, "error");
    } finally {
      state.syncingFormationId = null;
    }
  });
}

function normalizeSheetUrl(url) {
  if (!url) return "";
  const match = url.match(/docs\.google\.com\/spreadsheets\/d\/([^/]+)/);
  if (!match || url.includes("/pub?") || url.includes("/export?")) return url;
  const gid = url.match(/[?#&]gid=(\d+)/)?.[1] || "0";
  return `https://docs.google.com/spreadsheets/d/${match[1]}/gviz/tq?tqx=out:csv&gid=${gid}`;
}

function parseFormationCsv(csv) {
  const rows = parseCsv(csv);
  if (!rows.length) return [];
  const headers = rows[0].map(normalizeKey);
  const records = rows.slice(1).map((row) => Object.fromEntries(headers.map((k, i) => [k, row[i]])));
  const byInep = new Map();
  records.forEach((record, index) => {
    const inep = String(record.inep || record.codigoinep || record.codinep || "").trim();
    if (!inep) return;
    if (!byInep.has(inep)) byInep.set(inep, { inep, inscrito: false, credenciado: false, representantes: [] });
    const item = byInep.get(inep);
    const inscrito = yes(record.inscrito || record.inscricao || "sim");
    const credenciado = yes(record.credenciado || record.credenciamento);
    item.inscrito = item.inscrito || inscrito;
    item.credenciado = item.credenciado || credenciado;
    item.representantes.push({
      nome: record.nome || record.nomerepresentante || record.representante || `Representante ${index + 1}`,
      matricula: record.matricula || record.cpf || "",
      inscrito,
      credenciado,
    });
  });
  return [...byInep.values()];
}

function openSchoolDetails(inep) {
  const row = getFormationRows().find((r) => r.inep === inep);
  if (!row) return;
  $("#dialogGre").textContent = `${row.gre} — INEP ${row.inep}`;
  $("#dialogTitle").textContent = row.escola;
  $("#schoolDetails").innerHTML = `
    <article><span>Inscrito</span><strong>${row.inscrito ? "Sim" : "Não"}</strong></article>
    <article><span>Credenciado</span><strong>${row.credenciado ? "Sim" : "Não"}</strong></article>
    <article><span>Representantes</span><strong>${row.representantes.length}</strong></article>
  `;
  $("#schoolPeople").innerHTML = row.representantes.length
    ? row.representantes
        .map(
          (p) => `
          <tr>
            <td><code style="font-size:0.82rem">${esc(p.matricula || "-")}</code></td>
            <td><strong>${esc(p.nome)}</strong></td>
            <td>${statusPill(p.inscrito, "Sim", "Não")}</td>
            <td>${statusPill(p.credenciado, "Sim", "Não")}</td>
          </tr>
        `,
        )
        .join("")
    : `<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px">Nenhum representante informado para esta escola.</td></tr>`;
  $("#schoolDialog").showModal();
}

function addUser() {
  const gres = ["TODAS", ...getGres()];
  const greSelect = $("#addUserGre");
  if (greSelect) {
    greSelect.innerHTML = gres.map((g) => `<option value="${esc(g)}">${esc(g)}</option>`).join("");
  }
  const form = $("#addUserForm");
  if (form) form.reset();
  const errEl = $("#addUserError");
  if (errEl) errEl.textContent = "";
  $("#addUserDialog").showModal();
}

async function submitAddUser(event) {
  event.preventDefault();
  const errEl = $("#addUserError");
  if (errEl) errEl.textContent = "";

  await withButtonBusy($("#addUserSubmit"), "Adicionando...", async () => {
    const nome = String($("#addUserNome")?.value || "").trim();
    const email = String($("#addUserEmail")?.value || "").trim();
    const senha = String($("#addUserSenha")?.value || "").trim();
    const perfil = String($("#addUserPerfil")?.value || "regional");
    const gre = String($("#addUserGre")?.value || state.base.schools[0].gre);

    if (!nome || !email || !senha) {
      if (errEl) errEl.textContent = "Preencha todos os campos obrigatórios.";
      return;
    }
    if (senha.length < 4) {
      if (errEl) errEl.textContent = "A senha deve ter pelo menos 4 caracteres.";
      return;
    }
    const conflict = state.users.find((u) => normalize(u.email) === normalize(email));
    if (conflict) {
      if (errEl) errEl.textContent = "Já existe um usuário com este e-mail.";
      return;
    }

    const user = { id: makeId(), nome, email, senha, perfil, gre };
    state.users.push(user);
    saveStored("monitor-users", state.users);
    try {
      await persistUser(user);
      notify("Usuário adicionado", `${nome} foi cadastrado com sucesso.`);
    } catch (error) {
      console.warn("Não foi possível salvar usuário no Supabase.", error);
      notify("Usuário salvo localmente", "Não foi possível gravar no Supabase agora.", "warning");
    }
    $("#addUserDialog").close();
    renderUsers();
  });
}

function renderUsers() {
  if (state.tab !== "users" || state.user?.perfil !== "admin") return;
  const gres = ["TODAS", ...getGres()];
  $("#usersTable").innerHTML = state.users
    .map(
      (user, index) => `
      <tr id="user-row-${index}">
        <td><input data-user="${index}" data-field="nome" value="${esc(user.nome)}" /></td>
        <td><input data-user="${index}" data-field="email" value="${esc(user.email)}" /></td>
        <td>
          <div class="pass-cell-wrap">
            <input data-user="${index}" data-field="senha" type="password" autocomplete="new-password" value="${esc(user.senha)}" />
            <button type="button" class="pass-cell-toggle" data-toggle-pass="${index}" aria-label="Mostrar senha" tabindex="-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </td>
        <td>
          <select data-user="${index}" data-field="perfil">
            <option value="admin" ${user.perfil === "admin" ? "selected" : ""}>Admin</option>
            <option value="regional" ${user.perfil === "regional" ? "selected" : ""}>Regional</option>
          </select>
        </td>
        <td>
          <select data-user="${index}" data-field="gre">
            ${gres.map((g) => `<option value="${esc(g)}" ${user.gre === g ? "selected" : ""}>${esc(g)}</option>`).join("")}
          </select>
        </td>
        <td>
          <div class="row-actions">
            <button class="mini-button save-btn" data-save-user="${index}">Salvar</button>
            <button class="mini-button danger-button" data-remove-user="${index}">Remover</button>
          </div>
        </td>
      </tr>
    `,
    )
    .join("");

  // Toggle de visualizar senha por linha
  $$("[data-toggle-pass]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = btn.dataset.togglePass;
      const input = $(`input[data-user="${idx}"][data-field="senha"]`);
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.innerHTML = show
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
      btn.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha");
    });
  });

  // Marcar linha como "alterada" ao editar qualquer campo
  $$("[data-user]").forEach((field) => {
    field.addEventListener("input", () => {
      const row = document.getElementById(`user-row-${field.dataset.user}`);
      if (row) row.classList.add("row-dirty");
    });
  });

  // Salvar alterações ao clicar no botao Salvar da linha
  $$("[data-save-user]").forEach((button) => {
    button.addEventListener("click", async () => {
      const index = Number(button.dataset.saveUser);
      const user = state.users[index];
      const row = document.getElementById(`user-row-${index}`);

      // Ler valores atuais dos campos da linha
      $$(`[data-user="${index}"]`).forEach((field) => {
        user[field.dataset.field] = field.value;
      });
      saveStored("monitor-users", state.users);

      await withButtonBusy(button, "Salvando...", async () => {
        try {
          await persistUser(user);
          if (row) row.classList.remove("row-dirty");
          notify("Usuário atualizado", `${user.nome} foi salvo com sucesso.`);
        } catch (error) {
          console.warn("Não foi possível atualizar usuário no Supabase.", error);
          notify("Alteração local", "Não foi possível atualizar no Supabase agora.", "warning");
        }
      });
    });
  });

  // Remover usuario
  $$("[data-remove-user]").forEach((button) => {
    button.addEventListener("click", async () => {
      const index = Number(button.dataset.removeUser);
      if (state.users[index].email === state.user.email) {
        notify("Ação bloqueada", "Você não pode remover o próprio usuário logado.", "warning");
        return;
      }
      await withButtonBusy(button, "Removendo...", async () => {
        const [removed] = state.users.splice(index, 1);
        saveStored("monitor-users", state.users);
        try {
          await deleteUserFromDb(removed.id);
          notify("Usuário removido", `${removed.nome} foi excluído com sucesso.`);
        } catch (error) {
          console.warn("Não foi possível remover usuário no Supabase.", error);
          notify("Usuário removido localmente", "Não foi possível excluir no Supabase agora.", "warning");
        }
        renderUsers();
      });
    });
  });
}

function getGres() {
  return [...new Set(state.base.schools.map((s) => s.gre))].sort(
    (a, b) => Number(a.match(/\d+/)?.[0] || 0) - Number(b.match(/\d+/)?.[0] || 0),
  );
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ",";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; i++; }
    else if (char === '"') { quoted = !quoted; }
    else if (char === delimiter && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = []; cell = "";
    } else { cell += char; }
  }
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}

init();
