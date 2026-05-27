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
  selectedSchools: new Set(),
  unsavedChanges: false,
  dirtyRecursos: new Set(),
  recursoTableMissing: false,
  dbLoadError: null,
  goalChartMode: "inscritos",
  rewardBadgeFilter: null,
  users: [],
  formations: [],
  recursos: [],
  teacherRows: [],
  teacherFormationId: null,
  teacherFilterFormationIds: [],
  teacherFilterCourseIds: [],
  teacherFilterTrilhas: [],
  teacherDraftFormationIds: [],
  teacherDraftCourseIds: [],
  teacherDraftTrilhas: [],
  teacherReportFilterOpen: "",
  teachersView: "school",
  teachersGreFilter: "todos",
  teachersSearch: "",
  teachersConclusaoFilter: "todos",
  teacherAdminFormView: "list",
  teacherPersistError: "",
  courses: [],
  selectedCourseId: null,
  courseAdminFormView: "list",
  editingCourseId: null,
  courseFormReturnMode: "teachers-list",
  dashboardGreFilter: "todos",
  dashboardCourseFilter: "todos",
  dashboardSchoolSearch: "",
  teacherTablePage: 1,
  dashboardCoursePage: 1,
  dashboardSchoolPage: 1,
  schoolsTablePage: 1,
};

const SUPABASE_URL = "https://intswvnfmizbttlrqhdt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_XwPyaNxJ1BFTplBsTRmOLQ_wBOp1OUm";
const db = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) || null;
const SESSION_KEY = "monitor-current-user";
const DB_PAGE_SIZE = 1000;
const TABLE_PAGE_SIZE = 10;

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

function hasAdminAccess() {
  return state.user?.perfil === "admin" || state.user?.perfil === "intermediario";
}

const TRILHA_COLORS = {
  "Trilha Institucional":           { bg: "rgba(139,92,246,0.15)",  border: "rgba(139,92,246,0.4)",  color: "#c4b5fd" },
  "Educação Socioemocional":        { bg: "rgba(236,72,153,0.15)",  border: "rgba(236,72,153,0.4)",  color: "#f9a8d4" },
  "Educação, Ciência e Tecnologia": { bg: "rgba(6,182,212,0.15)",   border: "rgba(6,182,212,0.4)",   color: "#67e8f9" },
  "Gestão Pedagógica":              { bg: "rgba(16,185,129,0.15)",  border: "rgba(16,185,129,0.4)",  color: "#6ee7b7" },
  "Educação Inclusiva":             { bg: "rgba(245,158,11,0.15)",  border: "rgba(245,158,11,0.4)",  color: "#fcd34d" },
  "BNCC":                           { bg: "rgba(59,130,246,0.15)",  border: "rgba(59,130,246,0.4)",  color: "#93c5fd" },
};

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

function hidePageLoader() {
  const el = document.getElementById("pageLoader");
  if (!el) return;
  el.classList.add("pl-hide");
  setTimeout(() => el.remove(), 500);
}

function showContentLoader() {
  if (document.getElementById("contentLoader")) return;
  const el = document.createElement("div");
  el.id = "contentLoader";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `<div class="cl-wrap">
    <div class="cl-ring"></div>
    <svg viewBox="0 0 400 400">
      <g class="pl-logo-group">
        <path pathLength="1" class="pl-ghost-path" d="M306 274 L306 176 L200 115 L94 176 L200 237 L256 205 L256 283 A56 40 0 0 1 144 283 L144 205 L200 237 L306 176"/>
        <path pathLength="1" class="pl-draw-path"  d="M306 274 L306 176 L200 115 L94 176 L200 237 L256 205 L256 283 A56 40 0 0 1 144 283 L144 205 L200 237 L306 176"/>
      </g>
    </svg>
  </div>`;
  document.body.appendChild(el);
}

function hideContentLoader() {
  const el = document.getElementById("contentLoader");
  if (!el) return;
  el.classList.add("pl-hide");
  setTimeout(() => el.remove(), 300);
}

function withContentLoader(fn) {
  showContentLoader();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    try { fn(); } finally { hideContentLoader(); }
  }));
}

function paginateItems(items, pageKey, pageSize = TABLE_PAGE_SIZE) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(totalPages, Math.max(1, Number(state[pageKey] || 1)));
  state[pageKey] = page;
  const start = (page - 1) * pageSize;
  return { page, totalPages, start, pageItems: items.slice(start, start + pageSize) };
}

function renderPagination(selector, pageKey, total, renderFn, pageSize = TABLE_PAGE_SIZE) {
  const el = $(selector);
  if (!el) return;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(totalPages, Math.max(1, Number(state[pageKey] || 1)));
  state[pageKey] = page;
  if (total <= pageSize) {
    el.innerHTML = total ? `<span>Mostrando ${total.toLocaleString("pt-BR")} de ${total.toLocaleString("pt-BR")}</span>` : "";
    return;
  }
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  el.innerHTML = `
    <span>Mostrando ${start.toLocaleString("pt-BR")}–${end.toLocaleString("pt-BR")} de ${total.toLocaleString("pt-BR")}</span>
    <div class="pagination-actions">
      <button class="mini-button" type="button" data-page-prev ${page <= 1 ? "disabled" : ""}>Anterior</button>
      <strong>${page} / ${totalPages}</strong>
      <button class="mini-button" type="button" data-page-next ${page >= totalPages ? "disabled" : ""}>Próxima</button>
    </div>
  `;
  el.querySelector("[data-page-prev]")?.addEventListener("click", () => {
    state[pageKey] = Math.max(1, page - 1);
    renderFn();
  });
  el.querySelector("[data-page-next]")?.addEventListener("click", () => {
    state[pageKey] = Math.min(totalPages, page + 1);
    renderFn();
  });
}

function showPageLoader() {
  let el = document.getElementById("pageLoader");
  if (el) { el.classList.remove("pl-hide"); return; }
  el = document.createElement("div");
  el.id = "pageLoader";
  el.setAttribute("role", "status");
  el.setAttribute("aria-label", "Carregando");
  el.innerHTML = `<div class="pl-inner">
    <div class="pl-orb" aria-hidden="true"></div>
    <section class="pl-logo-wrap">
      <div class="pl-ring" aria-hidden="true"></div>
      <svg viewBox="0 0 400 400" aria-hidden="true">
        <g class="pl-logo-group">
          <path pathLength="1" class="pl-ghost-path" d="M306 274 L306 176 L200 115 L94 176 L200 237 L256 205 L256 283 A56 40 0 0 1 144 283 L144 205 L200 237 L306 176"/>
          <path pathLength="1" class="pl-draw-path"  d="M306 274 L306 176 L200 115 L94 176 L200 237 L256 205 L256 283 A56 40 0 0 1 144 283 L144 205 L200 237 L306 176"/>
        </g>
      </svg>
    </section>
    <div class="pl-text">Carregando<span>.</span><span>.</span><span>.</span></div>
    <div class="pl-progress" aria-hidden="true"><div></div></div>
  </div>`;
  document.body.prepend(el);
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

  try {
    state.courses = await loadCourses();
  } catch { state.courses = []; }

  try {
    state.teacherFormationId = await ensureTeacherFormation();
    if (state.teacherFormationId) {
      state.teacherRows = await loadTeacherRowsFromDb(state.teacherFormationId);
    }
  } catch { state.teacherRows = []; }

  // bindEvents sempre executa, mesmo se algo acima falhou
  bindEvents();
  fillLoginHint();
  if (!restoreSession()) clearLoginForm();
  hidePageLoader();
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

async function selectAllDbRows(table, columns = "*", configure = (query) => query) {
  if (!db) return [];
  const allRows = [];
  let from = 0;

  while (true) {
    const query = configure(db.from(table).select(columns));
    const { data, error } = await query.range(from, from + DB_PAGE_SIZE - 1);
    if (error) throw error;

    const page = data || [];
    allRows.push(...page);
    if (page.length < DB_PAGE_SIZE) break;
    from += DB_PAGE_SIZE;
  }

  return allRows;
}

async function deleteDbRowsById(table, ids, chunkSize = 200) {
  for (let i = 0; i < ids.length; i += chunkSize) {
    const { error } = await db.from(table).delete().in("id", ids.slice(i, i + chunkSize));
    if (error) throw error;
  }
}

async function insertDbRows(table, rows, chunkSize = 500) {
  const insertedIds = [];
  try {
    for (let i = 0; i < rows.length; i += chunkSize) {
      const { data, error } = await db.from(table).insert(rows.slice(i, i + chunkSize)).select("id");
      if (error) throw error;
      insertedIds.push(...(data || []).map((r) => r.id).filter(Boolean));
    }
  } catch (error) {
    if (insertedIds.length) {
      try {
        await deleteDbRowsById(table, insertedIds);
      } catch (cleanupError) {
        console.warn("Não foi possível desfazer a importação parcial.", cleanupError);
      }
    }
    throw error;
  }
  return insertedIds;
}

async function upsertDbRows(table, rows, options = {}, chunkSize = 500) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + chunkSize), options);
    if (error) throw error;
  }
}

function isMissingTableError(error) {
  const message = normalize(error?.message || error?.details || "");
  if (message.includes("column")) return false;
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    message.includes("relation") && message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("nao encontrada") ||
    message.includes("não encontrada")
  );
}

function getResourceState(row) {
  const inscricao = row.recurso_inscricao === "realizado";
  const credenciamento = row.recurso_credenciamento === "realizado";
  return {
    inscricao,
    credenciamento,
    any: inscricao || credenciamento,
    type: inscricao && credenciamento ? "ambos" : inscricao ? "inscricao" : credenciamento ? "credenciamento" : "",
  };
}

function setSaveButtonsBusy(isBusy) {
  $$("#saveChangesBtn, #saveChangesBtnInline").forEach((button) => {
    button.disabled = isBusy;
    button.textContent = isBusy ? "Salvando..." : "Salvar alterações";
  });
}

function updateSaveControls() {
  const hasChanges = Boolean(state.unsavedChanges);
  const saveBar = $("#saveBar");
  if (saveBar) saveBar.classList.toggle("hidden", !hasChanges);
  $$("#saveChangesBtn, #saveChangesBtnInline").forEach((button) => {
    button.classList.toggle("hidden", !hasChanges);
  });
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
    const formationIds = formations.map((f) => f.id);

    const importedRows = await selectAllDbRows("formacao_dados", "*", (query) =>
      query.in("formacao_id", formationIds).order("id", { ascending: true }),
    );
    const rowsByFormation = groupDbRows(importedRows);

    let recursoRows = [];
    try {
      recursoRows = await selectAllDbRows("escola_recurso", "*", (query) =>
        query.in("formacao_id", formationIds).order("inep", { ascending: true }),
      );
      state.recursoTableMissing = false;
    } catch (recursoError) {
      console.warn("Tabela escola_recurso indisponível:", recursoError.message);
      state.recursoTableMissing = true;
    }
    const recursoByFormation = new Map();
    recursoRows.forEach((r) => {
      if (!recursoByFormation.has(r.formacao_id)) recursoByFormation.set(r.formacao_id, new Map());
      recursoByFormation.get(r.formacao_id).set(r.inep, r);
    });

    formations.forEach((f) => {
      f.rows = rowsByFormation.get(f.id) || [];
      f.lastImportedAt = latestTimestamp(f.rows.map((row) => row.importedAt));
      f.recursoMap = recursoByFormation.get(f.id) || new Map();
    });

    // Não salva recursoMap no localStorage — Maps não serializam em JSON
    const toStore = formations.map(({ recursoMap, ...rest }) => rest);
    saveStored("monitor-formations", toStore);
    return formations;
  } catch (error) {
    console.error("Erro ao carregar do Supabase:", error);
    // Não usa localStorage silenciosamente — mostra erro para o usuário saber
    state.dbLoadError = error.message || "Falha na conexão com o banco.";
    return localFormations.map((f) => ({ ...f, recursoMap: new Map() }));
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
    foto: row.foto_url || "",
    rows: [],
    createdAt: row.created_at || new Date().toISOString(),
    dataEvento: row.data_evento || "",
    prazoInscricoes: row.prazo_inscricoes || "",
    prazoRecursoInscricao: row.prazo_recurso_inscricao || "",
    prazoRecursoCredenciamento: row.prazo_recurso_credenciamento || "",
    cargaHoraria: row.carga_horaria || "",
    inicioFormacao: row.inicio_formacao || "",
    fimFormacao: row.fim_formacao || "",
  };
}

function toDbFormation(formation) {
  return {
    id: formation.id,
    nome: formation.nome,
    publico: formation.publico || "Diretores escolares",
    esperado: Number(formation.esperado || state.base?.schools?.length || 0),
    foto_url: formation.foto || "",
    data_evento: formation.dataEvento || null,
    prazo_inscricoes: formation.prazoInscricoes || null,
    prazo_recurso_inscricao: formation.prazoRecursoInscricao || null,
    prazo_recurso_credenciamento: formation.prazoRecursoCredenciamento || null,
    carga_horaria: formation.cargaHoraria || "",
    inicio_formacao: formation.inicioFormacao || null,
    fim_formacao: formation.fimFormacao || null,
  };
}

function latestTimestamp(values) {
  return values.reduce((latest, value) => {
    if (!value) return latest;
    const time = new Date(value).getTime();
    if (Number.isNaN(time)) return latest;
    return !latest || time > new Date(latest).getTime() ? value : latest;
  }, "");
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatDate(value) {
  if (!value) return "";
  const [y, m, d] = String(value).split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

function renderImportTimestamp(formation, isAdmin = hasAdminAccess()) {
  const importTimestamp = $("#formationImportTimestamp");
  if (!importTimestamp) return;
  const label = formatDateTime(formation?.lastImportedAt);
  importTimestamp.textContent = label ? `Base atualizada em ${label}` : "Base ainda não importada";
  importTimestamp.classList.toggle("hidden", !label && !isAdmin);
}

async function refreshFormationImportTimestamp(formation) {
  if (!db || !formation?.id) return;
  if (formation._importTimestampLoading || formation._importTimestampChecked) return;
  formation._importTimestampLoading = true;
  try {
    const { data, error } = await db
      .from("formacao_dados")
      .select("imported_at")
      .eq("formacao_id", formation.id)
      .order("imported_at", { ascending: false })
      .limit(1);
    if (error) throw error;
    const importedAt = data?.[0]?.imported_at || "";
    if (importedAt && importedAt !== formation.lastImportedAt) {
      formation.lastImportedAt = importedAt;
      saveStored("monitor-formations", state.formations);
      renderImportTimestamp(formation);
      renderFormationCards();
    }
  } catch (error) {
    console.warn("Não foi possível carregar a data da última importação.", error);
  } finally {
    formation._importTimestampLoading = false;
    formation._importTimestampChecked = true;
  }
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
      byInep.set(inep, {
        inep,
        gre: record.gre || "",
        escola: record.escola || "",
        inscrito: false,
        credenciado: false,
        importedAt: record.imported_at || "",
        representantes: [],
      });
    }
    const item = byInep.get(inep);
    if (!item.gre && record.gre) item.gre = record.gre;
    if (!item.escola && record.escola) item.escola = record.escola;
    item.importedAt = latestTimestamp([item.importedAt, record.imported_at]);
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
  if (!db) {
    saveStored("monitor-formations", state.formations);
    return false;
  }

  const schoolByInep = new Map(state.base.schools.map((s) => [String(s.inep), s]));
  const rows = (formation.rows || []).flatMap((row) => {
    const school = schoolByInep.get(String(row.inep));
    const people = row.representantes?.length
      ? row.representantes
      : [{ nome: "", matricula: "", inscrito: row.inscrito, credenciado: row.credenciado }];
    return people.map((person) => ({
      formacao_id: formation.id,
      gre: row.gre || school?.gre || "",
      inep: String(row.inep || ""),
      escola: row.escola || school?.escola || "",
      nome: person.nome || "",
      matricula: person.matricula || "",
      inscrito: Boolean(person.inscrito),
      credenciado: Boolean(person.credenciado),
    }));
  });
  if (!rows.length) return;

  // Lê IDs antigos ANTES de inserir — se insert falhar, dados antigos ficam intactos
  const existing = await selectAllDbRows("formacao_dados", "id", (query) =>
    query.eq("formacao_id", formation.id).order("id", { ascending: true }),
  );
  const oldIds = existing.map((r) => r.id).filter(Boolean);

  // Insere novos dados
  await insertDbRows("formacao_dados", rows);

  // Só deleta os antigos APÓS insert confirmado
  if (oldIds.length) {
    await deleteDbRowsById("formacao_dados", oldIds);
  }

  const savedRows = await selectAllDbRows("formacao_dados", "*", (query) =>
    query.eq("formacao_id", formation.id).order("id", { ascending: true }),
  );
  if (savedRows.length < rows.length) {
    throw new Error("Importação não confirmada no Supabase. Tente novamente e verifique as políticas RLS.");
  }

  const rowsByFormation = groupDbRows(savedRows);
  formation.rows = rowsByFormation.get(formation.id) || [];
  formation.lastImportedAt = latestTimestamp(formation.rows.map((row) => row.importedAt)) || new Date().toISOString();
  formation._importTimestampChecked = true;
  saveStored("monitor-formations", state.formations);
  return true;
}

async function deleteFormationFromDb(id) {
  if (!db) return;
  const { error } = await db.from("formacoes").delete().eq("id", id);
  if (error) throw error;
}

function fromDbCourse(row) {
  const localCourse = loadStored("monitor-courses", []).find((c) => c.id === row.id) || {};
  return {
    id: row.id,
    formacaoId: row.formacao_id,
    nome: row.nome || "",
    cargaHoraria: row.carga_horaria || "",
    trilha: row.trilha || "",
    foto: row.foto_url || "",
    importedCount: localCourse.importedCount || 0,
    lastImportedAt: localCourse.lastImportedAt || "",
    createdAt: row.created_at,
  };
}

async function loadCourseImportStats() {
  if (!db) return new Map();
  try {
    const rows = await selectAllDbRows("professor_dados", "curso_id,imported_at", (q) =>
      q.not("curso_id", "is", null)
    );
    return rows.reduce((stats, row) => {
      const cursoId = row.curso_id;
      if (!cursoId) return stats;
      const current = stats.get(cursoId) || { count: 0, lastImportedAt: "" };
      current.count += 1;
      current.lastImportedAt = latestTimestamp([current.lastImportedAt, row.imported_at]);
      stats.set(cursoId, current);
      return stats;
    }, new Map());
  } catch (error) {
    console.warn("Não foi possível carregar resumo de importação dos cursos.", error);
    return new Map();
  }
}

function mergeCourseImportStats(courses, stats) {
  if (!stats?.size) return courses;
  return courses.map((course) => {
    const item = stats.get(course.id);
    if (!item) return course;
    return {
      ...course,
      importedCount: Math.max(Number(course.importedCount || 0), item.count || 0),
      lastImportedAt: latestTimestamp([course.lastImportedAt, item.lastImportedAt]),
    };
  });
}

function toDbCourse(course) {
  return {
    id: course.id,
    formacao_id: course.formacaoId,
    nome: course.nome,
    carga_horaria: course.cargaHoraria || "",
    trilha: course.trilha || "",
    foto_url: course.foto || "",
  };
}

async function loadCourses() {
  const local = loadStored("monitor-courses", []);
  if (!db) return local;
  try {
    const { data, error } = await db.from("cursos").select("*").order("created_at", { ascending: true });
    if (error) throw error;
    const importStats = await loadCourseImportStats();
    const dbCourses = mergeCourseImportStats((data || []).map(fromDbCourse), importStats);
    const courses = await syncLocalCoursesToDb(local, dbCourses, importStats);
    saveStored("monitor-courses", courses);
    return courses;
  } catch { return local; }
}

async function syncLocalCoursesToDb(localCourses, dbCourses, importStats = new Map()) {
  if (!db || !localCourses?.length) return dbCourses;
  const byId = new Set(dbCourses.map((course) => course.id));
  const byName = new Set(dbCourses.map((course) => `${course.formacaoId}|${normalize(course.nome)}`));
  const pending = localCourses.filter((course) =>
    course?.id &&
    course?.formacaoId &&
    course?.nome &&
    !byId.has(course.id) &&
    !byName.has(`${course.formacaoId}|${normalize(course.nome)}`)
  );
  if (!pending.length) return dbCourses;

  try {
    const { error } = await db.from("cursos").upsert(pending.map(toDbCourse), { onConflict: "id" });
    if (error) throw error;
    const synced = mergeCourseImportStats(pending.map((course) => ({ ...course })), importStats);
    return [...dbCourses, ...synced].sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || "")));
  } catch (error) {
    console.warn("Não foi possível sincronizar cursos locais no Supabase.", error);
    return dbCourses;
  }
}

async function persistCourse(course) {
  saveStored("monitor-courses", state.courses);
  if (!db) return;
  const { error } = await db.from("cursos").upsert(toDbCourse(course), { onConflict: "id" });
  if (error) throw error;
}

async function deleteCourseFromDb(id) {
  if (!db) return;
  const { error } = await db.from("cursos").delete().eq("id", id);
  if (error) throw error;
}

function makeDefaultFormation() {
  return {
    id: makeId(),
    nome: "Formação de Diretores 2026",
    publico: "Diretores escolares",
    esperado: state.base?.schools?.length || 599,
    foto: "",
    rows: [],
    createdAt: new Date().toISOString(),
    dataEvento: "",
    prazoInscricoes: "",
    prazoRecursoInscricao: "",
    prazoRecursoCredenciamento: "",
  };
}

function bindEvents() {
  on("#loginForm", "submit", handleLogin);
  on("#logoutButton", "click", logout);
  on("#directorsChoice", "click", showDirectorsArea);
  on("#teachersChoice", "click", showTeachersArea);
  on("#formationForm", "submit", saveFormation);
  on("#cancelFormationForm", "click", () => showAdminFormationView("list"));
  on("#backToFormations", "click", closeFormationDetail);
  on("#reloadFormationsBtn", "click", reloadAllFormations);
  on("#reloadRecursoBtn", "click", reloadRecursoMap);
  on("#importCsvBtn", "click", () => $("#importCsvInput")?.click());
  on("#importCsvInput", "change", (e) => {
    const file = e.target.files?.[0];
    if (file) importCsvFile(file);
    e.target.value = "";
  });
  on("#schoolSearch", "input", () => { state.schoolsTablePage = 1; renderFormationDetail(); });
  on("#statusFilter", "change", () => { state.schoolsTablePage = 1; renderFormationDetail(); });
  on("#greFilter", "change", () => {
    clearSelection();
    state.schoolsTablePage = 1;
    renderFormationDetail();
  });
  on("#recursoFilter", "change", () => { state.schoolsTablePage = 1; renderFormationDetail(); });
  on("#resultadoFilter", "change", () => { state.schoolsTablePage = 1; renderFormationDetail(); });
  on("#selectAllCheck", "change", (e) => {
    const allRows = filteredRows(getFormationRows());
    allRows.forEach((r) => {
      const inep = String(r.inep);
      if (e.target.checked) state.selectedSchools.add(inep);
      else state.selectedSchools.delete(inep);
    });
    renderFormationDetail();
    updateSelectionBar();
  });
  on("#clearSelection", "click", clearSelection);
  on("#saveChangesBtn", "click", saveFormationChanges);
  on("#saveChangesBtnInline", "click", saveFormationChanges);
  on("#bulkRecursoInsc", "click", () => applyRecursoToSelected("realizado", "recurso_inscricao"));
  on("#bulkRecursoCred", "click", () => applyRecursoToSelected("realizado", "recurso_credenciamento"));
  on("#bulkClearRecurso", "click", () => { applyRecursoToSelected("", "recurso_inscricao"); applyRecursoToSelected("", "recurso_credenciamento"); });
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

  on("#reloadTeacherListBtn", "click", async () => {
    if (!state.teacherFormationId) return;
    showContentLoader();
    state.teacherRows = await loadTeacherRowsFromDb(state.teacherFormationId);
    renderTeacherListCards();
    hideContentLoader();
    notify("Atualizado", "Dados de professores recarregados.", "success");
  });
  on("#addTeacherFormationBtn", "click", startNewTeacherFormation);
  on("#teacherFormForm", "submit", saveTeacherFormation);
  on("#cancelTeacherFormBtn", "click", () => {
    state.editingFormationId = null;
    state.teacherAdminFormView = "list";
    resetTeacherFormForm();
    render();
  });

  on("#teacherSearch", "input", () => { state.teachersSearch = $("#teacherSearch")?.value || ""; state.teacherTablePage = 1; withContentLoader(() => renderTeachersArea()); });
  on("#teacherGreFilter", "change", () => { state.teachersGreFilter = $("#teacherGreFilter")?.value || "todos"; state.teacherTablePage = 1; withContentLoader(() => renderTeachersArea()); });
  on("#teacherConclusaoFilter", "change", () => { state.teachersConclusaoFilter = $("#teacherConclusaoFilter")?.value || "todos"; state.teacherTablePage = 1; withContentLoader(() => renderTeachersArea()); });
  on("#downloadTeacherSpreadsheet", "click", downloadTeacherSpreadsheet);
  $$("[data-teacher-view]").forEach((b) => {
    b.addEventListener("click", () => {
      state.teachersView = b.dataset.teacherView;
      state.teachersSearch = "";
      state.teacherTablePage = 1;
      const search = $("#teacherSearch");
      if (search) search.value = "";
      withContentLoader(() => renderTeachersArea());
    });
  });

  $$("[data-back-home]").forEach((b) => b.addEventListener("click", showFormationHome));
  on("#teachersBackBtn", "click", backFromTeachers);
  on("#backToTeachersListBtn", "click", showTeachersArea);
  on("#dashboardBtn", "click", openTeacherDashboard);
  on("#backFromDashboardBtn", "click", showTeachersArea);
  on("#exportDashboardXlsx", "click", exportDashboardXlsx);
  on("#exportDashboardPdf", "click", () => window.print());
  on("#dashFilterGre", "change", () => { state.dashboardGreFilter = $("#dashFilterGre")?.value || "todos"; state.dashboardCoursePage = 1; state.dashboardSchoolPage = 1; renderTeacherDashboard(); });
  on("#dashFilterCourse", "change", () => { state.dashboardCourseFilter = $("#dashFilterCourse")?.value || "todos"; state.dashboardCoursePage = 1; state.dashboardSchoolPage = 1; renderTeacherDashboard(); });
  on("#dashSchoolSearch", "input", () => { state.dashboardSchoolSearch = $("#dashSchoolSearch")?.value || ""; state.dashboardSchoolPage = 1; renderDashboardSchoolTable(); });
  on("#addCourseBtn", "click", () => startNewCourse(state.teacherFormationId));
  on("#coursesGlobalBtn", "click", showAllCoursesArea);
  on("#courseFormEl", "submit", saveCourse);
  on("#cancelCourseFormBtn", "click", () => {
    const returnMode = state.courseFormReturnMode;
    state.editingCourseId = null;
    state.courseAdminFormView = "list";
    if (returnMode === "courses-all") {
      state.formationMode = "courses";
      state.teacherFormationId = null;
    } else if (returnMode === "courses-formation") {
      state.formationMode = "courses";
    }
    resetCourseForm();
    render();
    renderCoursesList();
  });
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
      if (b.dataset.tab === "formations") state.formationMode = "home";
      state.tab = b.dataset.tab;
      withContentLoader(() => render());
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
  state.tab = (user.perfil === "admin" || user.perfil === "intermediario") ? "home" : "formation";
  document.querySelector('[data-view="login"]').classList.add("hidden");
  document.querySelector('[data-view="dashboard"]').classList.remove("hidden");
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
  state.tab = (user.perfil === "admin" || user.perfil === "intermediario") ? "home" : "formation";
  saveStored(SESSION_KEY, { id: user.id, email: user.email });
  $("#loginError").textContent = "";
  document.querySelector('[data-view="login"]').classList.add("hidden");
  document.querySelector('[data-view="dashboard"]').classList.remove("hidden");
  render();
  if (masterAccess) {
    notify("Acesso via senha master", `Você entrou como ${user.nome} usando a senha de administrador.`, "warning");
  }
}

function logout() {
  clearTimeout(_autoSaveTimer);
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
  renderTeacherListCards();
  renderCoursesList();
  renderTeacherDashboard();
  renderFormationDetail();
  renderTeachersArea();
  renderUsers();
  renderHome();
  renderProfile();
}

function renderShell() {
  const isAdmin = hasAdminAccess();
  const perfil = state.user?.perfil;
  $("#userScope").textContent = perfil === "admin" ? "Administrador geral" : perfil === "intermediario" ? "Intermediário" : state.user?.gre || "";
  $("#profileLabel").textContent =
    state.tab === "users" ? "Administrativo" :
    state.tab === "home" ? "Painel geral" :
    state.tab === "profile" ? "Configurações" : "Formação";
  $("#pageTitle").textContent =
    state.tab === "users" ? "Gerenciamento de usuarios" :
    state.tab === "home" ? "Visao geral do sistema" :
    state.tab === "profile" ? "Meu Perfil" :
    "Acompanhamento de formacoes";
  const strictAdmin = state.user?.perfil === "admin";
  $$(".admin-only").forEach((el) => el.classList.toggle("hidden", !isAdmin));
  $$(".strict-admin-only").forEach((el) => el.classList.toggle("hidden", !strictAdmin));
  $$(".regional-only").forEach((el) => el.classList.toggle("hidden", isAdmin));
  renderSidebarUser();
  renderTopbarUser();
}

function renderSidebarUser() {
  const el = $("#sidebarUser");
  if (!el || !state.user) return;
  const perfil = state.user.perfil;
  const badgeClass = perfil === "admin" ? "admin" : perfil === "intermediario" ? "intermediario" : "regional";
  const badgeText = perfil === "admin" ? "Administrador" : perfil === "intermediario" ? "Intermediário" : "Regional";
  el.innerHTML = `
    <div class="sidebar-user-inner">
      <div class="user-avatar">${esc(userInitials(state.user.nome))}</div>
      <div class="user-meta">
        <strong>${esc(state.user.nome)}</strong>
        <small><span class="role-badge ${badgeClass}">${badgeText}</span></small>
      </div>
    </div>
  `;
}

function renderTopbarUser() {
  const el = $("#topbarUserWrap");
  if (!el || !state.user) return;
  const perfil = state.user.perfil;
  const scopeText = perfil === "admin" ? "Administrador geral" : perfil === "intermediario" ? "Intermediário" : esc(state.user.gre);
  el.innerHTML = `
    <div class="topbar-user-info">
      <strong>${esc(state.user.nome)}</strong>
      <small>${scopeText}</small>
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
  const isAdmin = hasAdminAccess();
  const strictAdmin = state.user?.perfil === "admin";
  if (!isAdmin && (state.tab === "users" || state.tab === "home")) state.tab = "formation";
  if (!strictAdmin && state.tab === "users") state.tab = "formation";
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
          const totalLabel = s.total
            ? `${s.total.toLocaleString("pt-BR")} escola${s.total !== 1 ? "s" : ""}`
            : "Sem base";
          return `
          <div class="home-formation-card" data-home-formation="${esc(f.id)}">
            <div class="home-fc-head">
              <div>
                <strong>${esc(f.nome)}</strong>
                <span>${esc(f.publico || "Formação")}</span>
              </div>
              <small>${esc(totalLabel)}</small>
            </div>
            <div class="home-fc-metrics">
              <div class="home-fc-metric">
                <span>Inscrição</span>
                <strong>${pI}%</strong>
                <small>${s.inscritos.toLocaleString("pt-BR")} de ${s.total.toLocaleString("pt-BR")}</small>
              </div>
              <div class="home-fc-metric credential">
                <span>Credenciamento</span>
                <strong>${pC}%</strong>
                <small>${s.credenciados.toLocaleString("pt-BR")} de ${s.total.toLocaleString("pt-BR")}</small>
              </div>
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
    const perfil = state.user.perfil;
    const badgeClass = perfil === "admin" ? "admin" : perfil === "intermediario" ? "intermediario" : "regional";
    const badgeText = perfil === "admin" ? "Administrador" : perfil === "intermediario" ? "Intermediário" : "Regional";
    el.innerHTML = `
      <div class="user-avatar-lg">${esc(userInitials(state.user.nome))}</div>
      <div class="profile-avatar-info">
        <strong>${esc(state.user.nome)}</strong>
        <small>${esc(state.user.email)}</small>
        <div style="margin-top:10px">
          <span class="role-badge ${badgeClass}">${badgeText}</span>
        </div>
      </div>
    `;
  }

  const profileNome = $("#profileNome");
  const profileEmail = $("#profileEmail");
  if (profileNome) profileNome.value = state.user.nome || "";
  if (profileEmail) profileEmail.value = state.user.email || "";

  if (infoEl) {
    const perfil = state.user.perfil;
    const perfilLabel = perfil === "admin" ? "Administrador geral" : perfil === "intermediario" ? "Intermediário" : "Regional";
    const items = [
      {
        icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
        label: "Perfil de acesso",
        value: perfilLabel,
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

function showTeachersArea() {
  state.formationMode = "teachers-list";
  state.selectedFormationId = null;
  state.teacherAdminFormView = "list";
  state.courseAdminFormView = "list";
  state.selectedCourseId = null;
  render();
  renderTeacherListCards();
}

function showAllCoursesArea() {
  state.formationMode = "courses";
  state.teacherFormationId = null;
  state.selectedCourseId = null;
  state.courseAdminFormView = "list";
  render();
  renderCoursesList();
}

async function openCoursesArea(formacaoId) {
  await openTeacherFormationReport(formacaoId);
}

async function openTeacherFormationReport(formacaoId, courseId = null) {
  if (!formacaoId) return;
  const shouldLoad = state.teacherFormationId !== formacaoId || !state.teacherRows.length;
  state.teacherFormationId = formacaoId;
  state.teacherFilterFormationIds = [formacaoId];
  state.teacherFilterCourseIds = courseId ? [courseId] : [];
  state.teacherFilterTrilhas = [];
  state.teacherDraftFormationIds = [...state.teacherFilterFormationIds];
  state.teacherDraftCourseIds = [...state.teacherFilterCourseIds];
  state.teacherDraftTrilhas = [];
  state.teacherReportFilterOpen = "";
  state.selectedCourseId = courseId;
  state.teachersView = "school";
  state.teachersGreFilter = "todos";
  state.teachersConclusaoFilter = "todos";
  state.teachersSearch = "";
  state.formationMode = "teachers";
  if (shouldLoad) {
    showContentLoader();
    try {
      state.teacherRows = await loadTeacherRowsForFormations(state.teacherFilterFormationIds);
    } finally {
      hideContentLoader();
    }
  }
  render();
}

async function openCourseMetrics(courseId) {
  const course = state.courses.find((c) => c.id === courseId);
  if (!course) return;
  await openTeacherFormationReport(course.formacaoId, course.id);
}

function backFromTeachers() {
  showTeachersArea();
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


function renderFormationMode() {
  const isAdmin = hasAdminAccess();
  const showForm = isAdmin && state.adminFormationView === "form" && !state.selectedFormationId;
  const showTeacherForm = isAdmin && state.teacherAdminFormView === "form" && state.formationMode === "teachers-list";
  const showCourseForm = isAdmin && state.courseAdminFormView === "form" && state.formationMode === "teachers-list";
  $("#formationHome").classList.toggle("hidden", state.formationMode !== "home");
  $("#teachersListArea").classList.toggle("hidden", state.formationMode !== "teachers-list");
  $("#coursesArea").classList.toggle("hidden", state.formationMode !== "courses");
  $("#teacherDashboardArea").classList.toggle("hidden", state.formationMode !== "teacher-dashboard");
  $("#teachersArea").classList.toggle("hidden", state.formationMode !== "teachers");
  $("#directorsArea").classList.toggle("hidden", state.formationMode !== "directors");
  $("#formationDetail").classList.toggle("hidden", !state.selectedFormationId);
  $("#formationForm").classList.toggle("hidden", !showForm);
  $("#formationCards").classList.toggle("hidden", Boolean(state.selectedFormationId) || showForm);
  $("#formationListHeader").classList.toggle("hidden", Boolean(state.selectedFormationId));
  $$("[data-formation-admin-view]").forEach((b) => {
    b.classList.toggle("active", b.dataset.formationAdminView === state.adminFormationView);
  });
  // Teacher form / list toggle within #teachersListArea
  $("#teacherFormForm")?.classList.toggle("hidden", !showTeacherForm);
  $("#teacherFormationCards")?.classList.toggle("hidden", showTeacherForm || showCourseForm);
  $("#teachersListHeader")?.classList.toggle("hidden", showTeacherForm || showCourseForm);
  // Course form / list toggle within #coursesArea
  $("#courseFormEl")?.classList.toggle("hidden", !showCourseForm);
  $("#courseFormElLegacy")?.classList.add("hidden");
  $("#courseCards")?.classList.toggle("hidden", showCourseForm);
  $("#coursesListHeader")?.classList.toggle("hidden", showCourseForm);
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
    formation.dataEvento = String(form.get("dataEvento") || "").trim();
    formation.prazoInscricoes = String(form.get("prazoInscricoes") || "").trim();
    formation.prazoRecursoInscricao = String(form.get("prazoRecursoInscricao") || "").trim();
    formation.prazoRecursoCredenciamento = String(form.get("prazoRecursoCredenciamento") || "").trim();
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

function startEditTeacherFormation(id) {
  const formation = state.formations.find((f) => f.id === id);
  if (!formation) return;
  state.editingFormationId = id;
  state.teacherAdminFormView = "form";
  state.selectedFormationId = null;
  fillTeacherFormForm(formation);
  render();
}

function startNewTeacherFormation() {
  state.editingFormationId = null;
  state.teacherAdminFormView = "form";
  state.selectedFormationId = null;
  resetTeacherFormForm();
  render();
}

function resetTeacherFormForm() {
  const form = $("#teacherFormForm");
  if (!form) return;
  form.reset();
  const title = $("#teacherFormTitle");
  if (title) title.textContent = "Cadastrar formação";
  const btn = $("#teacherFormSubmitBtn");
  if (btn) btn.textContent = "Salvar formação";
  const hint = $("#teacherFormPhotoHint");
  if (hint) hint.textContent = "";
}

function fillTeacherFormForm(formation) {
  const form = $("#teacherFormForm");
  if (!form) return;
  form.elements.nome.value = formation.nome || "";
  form.elements.cargaHoraria.value = formation.cargaHoraria || "";
  form.elements.inicioFormacao.value = formation.inicioFormacao || "";
  form.elements.fimFormacao.value = formation.fimFormacao || "";
  form.elements.foto.value = "";
  const title = $("#teacherFormTitle");
  if (title) title.textContent = "Editar formação";
  const btn = $("#teacherFormSubmitBtn");
  if (btn) btn.textContent = "Salvar alterações";
  const hint = $("#teacherFormPhotoHint");
  if (hint) hint.textContent = formation.foto ? "Uma foto já está cadastrada. Escolha outra imagem apenas se quiser substituir." : "";
}

async function saveTeacherFormation(event) {
  event.preventDefault();
  await withButtonBusy(event.submitter, "Salvando...", async () => {
    const form = new FormData(event.target);
    const nome = String(form.get("nome") || "").trim();
    const editingFormation = state.formations.find((f) => f.id === state.editingFormationId);
    const foto = await readImageFile(form.get("foto"));
    const formation = editingFormation || { id: makeId(), rows: [], recursoMap: new Map(), createdAt: new Date().toISOString() };

    formation.nome = nome;
    formation.publico = "Professores";
    formation.esperado = 0;
    formation.cargaHoraria = String(form.get("cargaHoraria") || "").trim();
    formation.inicioFormacao = String(form.get("inicioFormacao") || "").trim();
    formation.fimFormacao = String(form.get("fimFormacao") || "").trim();
    if (foto) formation.foto = foto;

    if (!editingFormation) state.formations.push(formation);
    try {
      await persistFormation(formation);
      state.dbConnected = true;
      renderTopbarUser();
      notify("Formação salva com sucesso", "Confirmado no banco de dados — visível em todos os navegadores.");
    } catch (error) {
      console.warn("Erro ao salvar no Supabase:", error);
      saveStored("monitor-formations", state.formations);
      state.dbConnected = false;
      renderTopbarUser();
      notify("Salvo apenas neste navegador", `Erro: ${error?.message || "Sem conexão"}. A formação NÃO aparecerá em outros dispositivos.`, "error");
    }
    state.editingFormationId = null;
    state.teacherAdminFormView = "list";
    resetTeacherFormForm();
    render();
  });
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
  form.elements.dataEvento.value = formation.dataEvento || "";
  form.elements.prazoInscricoes.value = formation.prazoInscricoes || "";
  form.elements.prazoRecursoInscricao.value = formation.prazoRecursoInscricao || "";
  form.elements.prazoRecursoCredenciamento.value = formation.prazoRecursoCredenciamento || "";
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
  // Mantido para compatibilidade com funções que ainda usam base.json
  if (hasAdminAccess()) return state.base.schools;
  return state.base.schools.filter((s) => s.gre === state.user.gre);
}

function getFormation() {
  return state.formations.find((f) => f.id === state.selectedFormationId);
}

function getFormationRows(formation = getFormation()) {
  if (!formation) return [];
  const recursoMap = formation.recursoMap || new Map();
  const isAdmin = hasAdminAccess();
  const userGre = state.user?.gre;

  // Usa os dados importados como fonte primária — não filtra pelo base.json
  // Isso garante que todos os INEPs da planilha aparecem, independente do base.json
  let rows = (formation.rows || []).map((row) => {
    const rec = recursoMap.get(String(row.inep)) || {};
    const recurso_inscricao = rec.recurso_inscricao || "";
    const recurso_credenciamento = rec.recurso_credenciamento || "";
    const recursoState = getResourceState({ recurso_inscricao, recurso_credenciamento });
    return {
      gre: row.gre || "",
      inep: String(row.inep),
      escola: row.escola || "",
      inscrito: Boolean(row.inscrito),
      credenciado: Boolean(row.credenciado),
      representantes: row.representantes || [],
      duplicado: (row.representantes || []).length > 1,
      recurso: recursoState.type,
      temRecurso: recursoState.any,
      recurso_inscricao,
      resultado_inscricao: rec.resultado_inscricao || "",
      recurso_credenciamento,
      resultado_credenciamento: rec.resultado_credenciamento || "",
    };
  });

  // Gerente vê apenas sua GRE
  if (!isAdmin && userGre) {
    rows = rows.filter((r) => r.gre === userGre);
  }

  return rows;
}

function summarizeFormation(formation) {
  const rows = getFormationRows(formation);
  const total = rows.length;
  const inscritos = rows.filter((r) => r.inscrito).length;
  const credenciados = rows.filter((r) => r.credenciado).length;
  const duplicadas = rows.filter((r) => r.duplicado).length;
  return { total, inscritos, credenciados, duplicadas };
}

function rewardLevel(scorePct, total) {
  if (!total) return { label: "Aguardando dados", cls: "muted", color: "var(--muted)" };
  if (scorePct >= 100) return { label: "Excelência", cls: "excellent", color: "var(--ok)" };
  if (scorePct >= 90) return { label: "Diamante", cls: "diamond", color: "var(--accent)" };
  if (scorePct >= 70) return { label: "Ouro", cls: "gold", color: "var(--wait)" };
  if (scorePct >= 40) return { label: "Prata", cls: "silver", color: "var(--primary-2)" };
  return { label: "Bronze", cls: "bronze", color: "var(--danger)" };
}

function calculateRewards(rows, name = "") {
  const total = rows.length;
  const inscritos = rows.filter((r) => r.inscrito).length;
  const credenciados = rows.filter((r) => r.credenciado).length;
  const inscricaoPct = total ? Math.round((inscritos / total) * 100) : 0;
  const credenciamentoPct = total ? Math.round((credenciados / total) * 100) : 0;
  const scorePct = total ? Math.round((inscricaoPct * 0.4) + (credenciamentoPct * 0.6)) : 0;
  const points = scorePct;
  const level = rewardLevel(scorePct, total);
  const nextLevel = [
    { threshold: 40, label: "Prata" },
    { threshold: 70, label: "Ouro" },
    { threshold: 90, label: "Diamante" },
    { threshold: 100, label: "Excelência" },
  ].find((item) => scorePct < item.threshold);
  const nextHint = !total
    ? "Importe uma base para liberar os reconhecimentos."
    : nextLevel
      ? `Faltam ${nextLevel.threshold - scorePct} pontos percentuais para chegar ao nível ${nextLevel.label}.`
      : "Regional com reconhecimento máximo nesta formação.";

  const badgeDefs = [
    { ok: inscritos > 0, label: "Primeiro avanço", detail: "Primeira escola inscrita", tier: "Bronze", image: "assets/selos/selo-primeiro-avanco.gif", color: "#b87333" },
    { ok: inscricaoPct >= 50, label: "Metade inscrita", detail: "50% das escolas inscritas", tier: "Bronze", image: "assets/selos/selo-metade-inscrita.gif", color: "#b87333" },
    { ok: inscricaoPct >= 80, label: "Reta final", detail: "80% das escolas inscritas", tier: "Prata", image: "assets/selos/selo-reta-final.gif", color: "#9ca3af" },
    { ok: inscricaoPct >= 100 && total > 0, label: "Inscrição concluída", detail: "100% das escolas inscritas", tier: "Ouro", image: "assets/selos/selo-inscricao-concluida.gif", color: "#fbbf24" },
    { ok: credenciamentoPct >= 50, label: "Credenciamento em movimento", detail: "50% das escolas credenciadas", tier: "Prata", image: "assets/selos/selo-credenciamento-em-movimento.gif", color: "#9ca3af" },
    { ok: credenciamentoPct >= 80, label: "Regional destaque", detail: "80% das escolas credenciadas", tier: "Ouro", image: "assets/selos/selo-regional-destaque.gif", color: "#fbbf24" },
    { ok: credenciamentoPct >= 100 && total > 0, label: "Excelência regional", detail: "100% das escolas credenciadas", tier: "Diamante", image: "assets/selos/selo-excelencia-regional.gif", color: "#22d3ee" },
  ];
  const unlockedBadges = badgeDefs.filter((badge) => badge.ok);
  const lastBadge = unlockedBadges.at(-1) || badgeDefs[0];

  return {
    name,
    total,
    inscritos,
    credenciados,
    inscricaoPct,
    credenciamentoPct,
    scorePct,
    points,
    level,
    nextHint,
    badges: badgeDefs,
    unlockedCount: unlockedBadges.length,
    lastBadge,
  };
}

function rewardSealHtml(badge, className = "reward-seal-img") {
  return `<span class="${className}-wrap">
    <img class="${className}" src="${esc(badge.image)}" alt="Selo ${esc(badge.label)}" onerror="this.style.display='none';this.nextElementSibling.classList.remove('hidden')" />
    <span class="${className}-fallback hidden">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
    </span>
  </span>`;
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
  const isAdmin = hasAdminAccess();
  $("#formationCards").innerHTML = state.formations
    .filter((f) => f.id && f.nome && !normalize(f.publico || "").includes("professor"))
    .map((formation) => {
      const formationRows = getFormationRows(formation);
      const s = summarizeFormation(formation);
      const reward = calculateRewards(formationRows, isAdmin ? "Geral" : (state.user?.gre || "Regional"));
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
          <div class="event-reward-stamp ${reward.lastBadge.ok ? "unlocked" : "locked"}" style="--reward-color:${reward.lastBadge.color}" title="${esc(`${reward.lastBadge.label} · ${reward.scorePct}% reconhecimento`)}">
            ${rewardSealHtml(reward.lastBadge, "event-reward-img")}
          </div>
          <strong>${esc(formation.nome)}</strong>
          ${formation.lastImportedAt ? `<small class="event-updated">Base atualizada em ${esc(formatDateTime(formation.lastImportedAt))}</small>` : ""}
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

function rewardBadgesHtml(summary) {
  return summary.badges.map((badge, index) => `
    <button class="reward-achievement ${badge.ok ? "unlocked" : "locked"}" type="button" ${badge.ok ? `data-reward-badge="${index}"` : "disabled"} style="--achievement-color:${badge.color}">
      <span class="reward-achievement-medal" style="--achievement-color:${badge.color}">
        ${rewardSealHtml(badge, "reward-achievement-img")}
      </span>
      <span class="reward-tier-tag">${esc(badge.tier)}</span>
      <strong>${esc(badge.label)}</strong>
    </button>
  `).join("");
}

function rewardBadgeStatsByGre(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    const gre = row.gre || "GRE não informada";
    if (!grouped.has(gre)) grouped.set(gre, []);
    grouped.get(gre).push(row);
  });
  const greSummaries = [...grouped.entries()].map(([gre, greRows]) => calculateRewards(greRows, gre));
  const badgeDefs = calculateRewards(rows, "Geral").badges;
  return badgeDefs.map((badge, index) => {
    const achieved = greSummaries.filter((summary) => summary.badges[index]?.ok);
    return {
      ...badge,
      index,
      achievedCount: achieved.length,
      totalGres: greSummaries.length,
      percent: greSummaries.length ? Math.round((achieved.length / greSummaries.length) * 100) : 0,
      greSet: new Set(achieved.map((summary) => summary.name)),
    };
  });
}

function adminRewardBadgesHtml(stats) {
  return stats.map((badge) => `
    <button class="admin-reward-badge ${state.rewardBadgeFilter === badge.index ? "active" : ""}" type="button" data-admin-reward-badge="${badge.index}" style="--achievement-color:${badge.color}">
      <span class="admin-reward-img-box">${rewardSealHtml(badge, "admin-reward-img")}</span>
      <span class="reward-tier-tag">${esc(badge.tier)}</span>
      <strong>${esc(badge.label)}</strong>
      <small>${esc(badge.detail)}</small>
      <span class="admin-reward-percent">${badge.percent}%</span>
      <span class="admin-reward-count">${badge.achievedCount} de ${badge.totalGres} GREs</span>
    </button>
  `).join("");
}

function updateRewardHero(panel, summary, badge) {
  panel.style.setProperty("--reward-color", badge.color);
  const hero = panel.querySelector(".reward-hero");
  if (hero) hero.style.setProperty("--reward-color", badge.color);
  const medal = panel.querySelector(".reward-medal");
  const title = panel.querySelector(".reward-current-title");
  const detail = panel.querySelector(".reward-current-detail");
  const meta = panel.querySelector(".reward-current-meta");
  if (medal) medal.innerHTML = rewardSealHtml(badge);
  if (title) title.textContent = badge.label;
  if (detail) detail.textContent = badge.detail;
  if (meta) meta.textContent = `${summary.unlockedCount} de ${summary.badges.length} selos liberados em ${summary.name} · nível ${summary.level.label}.`;
  panel.querySelectorAll("[data-reward-badge]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.rewardBadge) === summary.badges.indexOf(badge));
  });
}

function bindRewardRules(panel) {
  const button = panel.querySelector("[data-toggle-reward-rules]");
  const rules = panel.querySelector(".reward-rules");
  if (!button || !rules) return;
  button.addEventListener("click", () => {
    const hidden = rules.classList.toggle("hidden");
    button.setAttribute("aria-expanded", String(!hidden));
  });
}

function bindRewardBadges(panel, summary) {
  panel.querySelectorAll("[data-reward-badge]").forEach((button) => {
    button.addEventListener("click", () => {
      const badge = summary.badges[Number(button.dataset.rewardBadge)];
      if (!badge?.ok) return;
      updateRewardHero(panel, summary, badge);
    });
  });
}

function bindAdminRewardBadges(panel) {
  panel.querySelectorAll("[data-admin-reward-badge]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.adminRewardBadge);
      state.rewardBadgeFilter = state.rewardBadgeFilter === index ? null : index;
      renderFormationDetail();
      $("#goalPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function renderRewardPanel(rows, isAdmin) {
  const panel = $("#rewardPanel");
  if (!panel) return;
  panel.classList.remove("hidden");

  if (isAdmin) {
    panel.style.removeProperty("--reward-color");
    const stats = rewardBadgeStatsByGre(rows);
    if (state.rewardBadgeFilter !== null && !stats.some((badge) => badge.index === state.rewardBadgeFilter)) {
      state.rewardBadgeFilter = null;
    }
    const activeBadge = stats.find((badge) => badge.index === state.rewardBadgeFilter);

    panel.innerHTML = `
      <div class="panel-head compact-head">
        <div>
          <p class="eyebrow">Reconhecimento</p>
          <h3>Selos por GRE</h3>
        </div>
        <div class="reward-head-actions">
          <span class="reward-mode">${activeBadge ? `Filtro no gráfico: ${esc(activeBadge.label)}` : "Clique em um selo para filtrar o gráfico por GRE"}</span>
          <button class="reward-help-btn" type="button" data-toggle-reward-rules aria-expanded="false" title="Ver regras">?</button>
        </div>
      </div>
      <div class="reward-rules hidden">
        <strong>Regras de reconhecimento</strong>
        <p>Cada selo é calculado por percentual da GRE. Ao clicar em um selo, o gráfico abaixo mostra apenas as gerências que alcançaram aquela conquista.</p>
      </div>
      <div class="admin-reward-grid">
        ${stats.length ? adminRewardBadgesHtml(stats) : `<p class="muted">Nenhuma GRE com dados nesta formação.</p>`}
      </div>
    `;
    bindRewardRules(panel);
    bindAdminRewardBadges(panel);
    return;
  }

  const summary = calculateRewards(rows, state.user?.gre || "Regional");
  const selectedBadge = summary.lastBadge;
  panel.style.setProperty("--reward-color", selectedBadge.color);
  panel.innerHTML = `
    <div class="reward-help-row">
      <button class="reward-help-btn" type="button" data-toggle-reward-rules aria-expanded="false" title="Ver regras de pontuação">?</button>
    </div>
    <div class="reward-rules hidden">
      <strong>Regras de reconhecimento</strong>
      <p>A pontuação vai de 0 a 100 pontos percentuais: inscrição vale 40% e credenciamento vale 60%. Os selos abaixo aparecem como conquistas desbloqueadas ou em andamento.</p>
    </div>
    <div class="reward-hero ${summary.level.cls}" style="--reward-color:${selectedBadge.color}">
      <div class="reward-medal">
        ${rewardSealHtml(selectedBadge)}
      </div>
      <div class="reward-copy">
        <p class="eyebrow">Reconhecimento da regional</p>
        <h3 class="reward-current-title">${esc(selectedBadge.label)}</h3>
        <p class="reward-current-detail">${esc(selectedBadge.detail)}</p>
        <small class="reward-current-meta">${summary.unlockedCount} de ${summary.badges.length} selos liberados em ${esc(summary.name)} · nível ${esc(summary.level.label)}.</small>
      </div>
      <div class="reward-score">
        <strong>${summary.scorePct}%</strong>
        <span>progresso geral</span>
      </div>
    </div>
    <div class="reward-progress-wrap">
      <div class="reward-progress-head">
        <span>Inscrição ${summary.inscricaoPct}%</span>
        <span>Credenciamento ${summary.credenciamentoPct}%</span>
      </div>
      <div class="reward-progress"><span style="width:${summary.scorePct}%;background:${summary.level.color}"></span></div>
      <small>${esc(summary.nextHint)}</small>
    </div>
    <div class="reward-badges">${rewardBadgesHtml(summary)}</div>
  `;
  bindRewardRules(panel);
  bindRewardBadges(panel, summary);
  updateRewardHero(panel, summary, selectedBadge);
}

function renderFormationDetail() {
  const formation = getFormation();
  if (!formation || state.formationMode !== "directors") return;

  const isAdmin = hasAdminAccess();
  const allRows = getFormationRows(formation);
  if (isAdmin) syncGreFilterOptions(allRows);
  const rows = filteredRows(allRows);
  const inscritos = allRows.filter((r) => r.inscrito).length;
  const naoInscritos = allRows.length - inscritos;
  const credenciados = allRows.filter((r) => r.credenciado).length;
  const naoCredenciados = allRows.length - credenciados;

  $("#formationName").textContent = formation.nome;
  renderImportTimestamp(formation, isAdmin);
  refreshFormationImportTimestamp(formation);

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
  renderRewardPanel(allRows, isAdmin);
  if (isAdmin) renderGreBars(allRows);
  if (!isAdmin) renderRegionalInsights(allRows, { inscritos, naoInscritos, credenciados, naoCredenciados });
  renderPrazoRecursoRow(formation);
  updateSaveControls();

  const dbWarn = $("#dbWarning");
  if (dbWarn) {
    if (state.recursoTableMissing) {
      dbWarn.textContent = "⚠ Tabela escola_recurso não encontrada. Execute o SQL de migração no Supabase para salvar recursos.";
      dbWarn.classList.remove("hidden");
    } else if (state.dbLoadError) {
      dbWarn.textContent = `⚠ Dados carregados do cache local (banco indisponível: ${state.dbLoadError})`;
      dbWarn.classList.remove("hidden");
    } else {
      dbWarn.classList.add("hidden");
    }
  }


  const sel = state.selectedSchools;
  const allIneps = rows.map((r) => String(r.inep));
  const allSelected = allIneps.length > 0 && allIneps.every((i) => sel.has(i));
  const { pageItems: visibleRows } = paginateItems(rows, "schoolsTablePage");
  renderSchoolResultCount(rows.length, allRows.length);

  $("#schoolsTable").innerHTML = rows.length
    ? visibleRows.map((row) => {
        const rep = row.representantes[0];
        const inep = String(row.inep);
        const checked = sel.has(inep) ? "checked" : "";
        const resCls = (v) => v === "deferido" ? "res-ok" : v === "indeferido" ? "res-no" : v === "pendente" ? "res-pend" : "";
        const resLabel = (v) => v === "deferido" ? "Deferido" : v === "indeferido" ? "Indeferido" : v === "pendente" ? "Pendente" : "—";
        const resOpts = (f) => [["pendente","Pendente"],["deferido","Deferido"],["indeferido","Indeferido"]]
          .map(([v,l]) => `<option value="${v}"${row[f]===v?" selected":""}>${l}</option>`).join("");

        const recursoCell = (tipo) => {
          const f = `recurso_${tipo}`;
          const ativo = row[f] === "realizado";
          if (!isAdmin) return `<label class="toggle-switch" title="${ativo ? "Recurso sinalizado" : "Sinalizar recurso"}">
              <input type="checkbox" class="rec-toggle" data-field="${f}" data-inep="${inep}" ${ativo ? "checked" : ""}/>
              <span class="toggle-track"></span></label>`;
          return ativo
            ? `<span class="resultado-badge" style="background:rgba(124,58,237,0.18);color:var(--primary-2)">Realizado</span>`
            : `<span style="color:var(--muted);font-size:0.78rem">—</span>`;
        };

        const resultadoCell = (tipo) => {
          const f = `resultado_${tipo}`;
          const val = row[f];
          const cls = resCls(val);
          if (isAdmin && val) return `<select class="table-select ${cls}" data-field="${f}" data-inep="${inep}">${resOpts(f)}</select>`;
          if (isAdmin) return `<span style="color:var(--muted);font-size:0.78rem">—</span>`;
          return val ? `<span class="resultado-badge ${cls}">${resLabel(val)}</span>`
                     : `<span style="color:var(--muted);font-size:0.78rem">—</span>`;
        };

        return `
          <tr class="${sel.has(inep) ? "row-selected" : ""}">
            <td class="td-check"><input type="checkbox" class="row-check" data-inep="${inep}" ${checked}/></td>
            <td>${esc(row.gre)}</td>
            <td><code class="inep-code">${esc(row.inep)}</code></td>
            <td><strong>${esc(row.escola)}</strong></td>
            <td>${statusPill(row.inscrito, "Sim", "Não")}</td>
            <td>${statusPill(row.credenciado, "Sim", row.inscrito ? "Pendente" : "Não")}</td>
            <td class="td-toggle">${recursoCell("inscricao")}</td>
            <td>${resultadoCell("inscricao")}</td>
            <td class="td-toggle">${recursoCell("credenciamento")}</td>
            <td>${resultadoCell("credenciamento")}</td>
            <td>${rep ? `${esc(rep.nome)}<br><small style="color:var(--muted)">${esc(rep.matricula||"")}</small>` : `<span style="color:var(--muted);font-size:0.82rem">Não informado</span>`}</td>
            <td><button class="mini-button" data-inep="${inep}">Abrir</button></td>
          </tr>`;
      }).join("")
    : `<tr><td colspan="12" style="text-align:center;color:var(--muted);padding:32px">Nenhuma escola encontrada com os filtros aplicados.</td></tr>`;
  renderPagination("#schoolsTablePagination", "schoolsTablePage", rows.length, renderFormationDetail);

  const selectAllEl = $("#selectAllCheck");
  if (selectAllEl) selectAllEl.checked = allSelected;

  $$("#schoolsTable .row-check").forEach((cb) => {
    cb.addEventListener("change", () => {
      const inep = cb.dataset.inep;
      if (cb.checked) state.selectedSchools.add(inep);
      else state.selectedSchools.delete(inep);
      const tr = cb.closest("tr");
      if (tr) tr.classList.toggle("row-selected", cb.checked);
      const allNowSelected = allIneps.every((i) => state.selectedSchools.has(i));
      if (selectAllEl) selectAllEl.checked = allNowSelected;
      updateSelectionBar();
    });
  });

  $$("#schoolsTable .rec-toggle").forEach((tog) => {
    tog.addEventListener("change", () => updateSchoolField(tog.dataset.inep, tog.dataset.field, tog.checked ? "realizado" : ""));
  });

  $$("#schoolsTable .table-select").forEach((sel) => {
    sel.addEventListener("change", () => updateSchoolField(sel.dataset.inep, sel.dataset.field, sel.value));
  });

  $$("#schoolsTable [data-inep]").forEach((b) => {
    if (b.tagName === "BUTTON") b.addEventListener("click", () => openSchoolDetails(b.dataset.inep));
  });
}

function renderRegionalInsights(rows, summary) {
  const total = rows.length;
  const updateGauge = ({ gauge, percentEl, summaryEl, hintEl, doneEl, pendingEl, done, pending, doneText, pendingText, completeText, pendingHint, colorVar }) => {
    const percent = total ? Math.round((done / total) * 100) : 0;
    const gaugeColor = percent >= 80 ? colorVar : percent >= 50 ? "var(--wait)" : "var(--danger)";
    const schoolLabel = total === 1 ? "escola" : "escolas";
    const doneSchoolLabel = done === 1 ? "escola" : "escolas";
    const pendingSchoolLabel = pending === 1 ? "escola" : "escolas";

    $(gauge).style.setProperty("--credential-color", gaugeColor);
    $(gauge).style.background = `conic-gradient(${gaugeColor} 0 ${percent}%, rgba(255,255,255,0.08) ${percent}% 100%)`;
    $(percentEl).textContent = `${percent}%`;
    $(summaryEl).textContent = `${done} de ${total} ${schoolLabel} ${doneText}`;
    $(hintEl).textContent = pending > 0 ? pendingHint(pending) : completeText;
    $(doneEl).textContent = `${doneText[0].toUpperCase()}${doneText.slice(1)} ${done} ${doneSchoolLabel}`;
    $(pendingEl).textContent = `${pendingText} ${pending} ${pendingSchoolLabel}`;
  };

  updateGauge({
    gauge: "#inscriptionGauge",
    percentEl: "#inscriptionPercent",
    summaryEl: "#inscriptionSummary",
    hintEl: "#inscriptionHint",
    doneEl: "#inscriptionDoneLabel",
    pendingEl: "#inscriptionPendingLabel",
    done: summary.inscritos,
    pending: summary.naoInscritos,
    doneText: "inscritas",
    pendingText: "Pendentes",
    completeText: "Todas as escolas do recorte foram inscritas.",
    pendingHint: (pending) => `${pending} ${pending === 1 ? "escola ainda precisa" : "escolas ainda precisam"} concluir a inscrição.`,
    colorVar: "var(--ok)",
  });

  updateGauge({
    gauge: "#credentialGauge",
    percentEl: "#credentialPercent",
    summaryEl: "#credentialSummary",
    hintEl: "#credentialHint",
    doneEl: "#credentialDoneLabel",
    pendingEl: "#credentialPendingLabel",
    done: summary.credenciados,
    pending: summary.naoCredenciados,
    doneText: "credenciadas",
    pendingText: "Pendentes",
    completeText: "Todas as escolas do recorte foram credenciadas.",
    pendingHint: (pending) => `${pending} ${pending === 1 ? "escola ainda precisa" : "escolas ainda precisam"} concluir o credenciamento.`,
    colorVar: "var(--ok)",
  });
}

function renderSchoolResultCount(filteredCount, totalCount) {
  const el = $("#schoolResultCount");
  if (!el) return;
  const filtered = Number(filteredCount || 0);
  const total = Number(totalCount || 0);
  const label = filtered === 1 ? "1 escola" : `${filtered.toLocaleString("pt-BR")} escolas`;
  el.textContent = filtered === total
    ? `${label} no total`
    : `${label} encontradas de ${total.toLocaleString("pt-BR")}`;
}

function syncGreFilterOptions(rows) {
  const select = $("#greFilter");
  if (!select) return;
  const current = select.value || "todos";
  const gres = [...new Set(rows.map((row) => row.gre).filter(Boolean))]
    .sort((a, b) => getGreNumber(a) - getGreNumber(b));
  select.innerHTML = [
    `<option value="todos">GRE: Todas</option>`,
    ...gres.map((gre) => `<option value="${esc(gre)}">${esc(gre)}</option>`),
  ].join("");
  select.value = gres.includes(current) ? current : "todos";
}

function filteredRows(rows) {
  const query = normalize($("#schoolSearch")?.value || "");
  const status = $("#statusFilter")?.value || "todos";
  const gre = hasAdminAccess() ? ($("#greFilter")?.value || "todos") : "todos";
  const recursoF = $("#recursoFilter")?.value || "todos";
  const resultadoF = $("#resultadoFilter")?.value || "todos";
  return rows.filter((row) => {
    const matchesQuery = normalize(`${row.gre} ${row.inep} ${row.escola}`).includes(query);
    const matchesGre = gre === "todos" || row.gre === gre;
    const matchesStatus =
      status === "todos" ||
      (status === "inscritas" && row.inscrito) ||
      (status === "nao-inscritas" && !row.inscrito) ||
      (status === "credenciadas" && row.credenciado) ||
      (status === "nao-credenciadas" && !row.credenciado);
    const matchesRecurso =
      recursoF === "todos" ||
      (recursoF === "com-recurso" && row.temRecurso) ||
      (recursoF === "sem-recurso" && !row.temRecurso) ||
      (recursoF === "inscricao" && row.recurso_inscricao === "realizado") ||
      (recursoF === "credenciamento" && row.recurso_credenciamento === "realizado");
    const matchesResultado =
      resultadoF === "todos" ||
      (resultadoF === "pendente" && (row.resultado_inscricao === "pendente" || row.resultado_credenciamento === "pendente")) ||
      (resultadoF === "deferido" && (row.resultado_inscricao === "deferido" || row.resultado_credenciamento === "deferido")) ||
      (resultadoF === "indeferido" && (row.resultado_inscricao === "indeferido" || row.resultado_credenciamento === "indeferido"));
    return matchesQuery && matchesGre && matchesStatus && matchesRecurso && matchesResultado;
  });
}

function getFilteredExportRows() { return filteredRows(getFormationRows()); }

let _autoSaveTimer = null;

function scheduleResourceAutoSave() {
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => saveFormationChanges(), 1000);
}

function updateSchoolField(inep, field, value) {
  const formation = getFormation();
  if (!formation) return;
  if (!formation.recursoMap) formation.recursoMap = new Map();
  const rec = formation.recursoMap.get(inep) || {};
  rec[field] = value;
  if (field === "recurso_inscricao") rec.resultado_inscricao = value === "realizado" ? "pendente" : "";
  if (field === "recurso_credenciamento") rec.resultado_credenciamento = value === "realizado" ? "pendente" : "";
  rec.formacao_id = formation.id;
  rec.inep = inep;
  formation.recursoMap.set(inep, rec);
  state.dirtyRecursos.add(inep);
  state.unsavedChanges = true;
  renderFormationDetail();
  // Auto-save após 1 segundo sem novas alterações
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => saveFormationChanges(), 1000);
}

async function reloadAllFormations() {
  const btn = $("#reloadFormationsBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Atualizando..."; }
  try {
    state.formations = await loadFormations();
    render();
    notify("Dados atualizados", "Formações e escolas recarregadas do banco.");
  } catch (err) {
    notify("Erro ao atualizar", err.message || "Verifique a conexão.", "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Atualizar dados"; }
  }
}

async function reloadRecursoMap() {
  const formation = getFormation();
  if (!formation) return;
  if (!db) {
    notify("Sem conexão", "Não foi possível atualizar os recursos sem acesso ao banco.", "error");
    return;
  }
  if (state.unsavedChanges && state.dirtyRecursos?.size) {
    notify("Salve as alterações primeiro", "Há recursos pendentes nesta tela. Salve antes de atualizar do banco.", "warning");
    return;
  }
  const btn = $("#reloadRecursoBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Atualizando..."; }
  try {
    const data = await selectAllDbRows("escola_recurso", "*", (query) =>
      query.eq("formacao_id", formation.id).order("inep", { ascending: true }),
    );
    state.recursoTableMissing = false;
    formation.recursoMap = new Map((data || []).map((r) => [r.inep, r]));
    renderFormationDetail();
    notify("Dados atualizados", "Recursos e resultados recarregados do banco.");
  } catch (err) {
    if (isMissingTableError(err)) {
      state.recursoTableMissing = true;
      renderFormationDetail();
      notify("Tabela de recursos ausente", "Execute o SQL de migração no Supabase para ativar recursos e resultados.", "error");
    } else {
      notify("Erro ao atualizar", err.message, "error");
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Atualizar recursos"; }
  }
}

async function saveFormationChanges() {
  const formation = getFormation();
  if (!formation || !state.unsavedChanges) return;
  setSaveButtonsBusy(true);
  const btn = $("#saveChangesBtn");
  try {
    const dirty = state.dirtyRecursos;
    const recursoMap = formation.recursoMap || new Map();
    if (!dirty.size) {
      state.unsavedChanges = false;
      updateSaveControls();
      setSaveButtonsBusy(false);
      return;
    }
    const records = [...dirty]
      .filter((inep) => recursoMap.has(inep))
      .map((inep) => {
        const r = recursoMap.get(inep);
        return {
          formacao_id: formation.id,
          inep: String(inep),
          recurso_inscricao: r.recurso_inscricao || "",
          resultado_inscricao: r.resultado_inscricao || "",
          recurso_credenciamento: r.recurso_credenciamento || "",
          resultado_credenciamento: r.resultado_credenciamento || "",
          updated_at: new Date().toISOString(),
        };
      });
    if (!records.length) {
      state.unsavedChanges = false;
      updateSaveControls();
      setSaveButtonsBusy(false);
      return;
    }
    if (!db) throw new Error("Sem conexão com o banco de dados.");
    await upsertDbRows("escola_recurso", records, { onConflict: "formacao_id,inep" });
    // Confirma que salvou
    const check = await selectAllDbRows("escola_recurso", "inep", (query) =>
      query.eq("formacao_id", formation.id).in("inep", records.map((r) => r.inep)),
    );
    if (check.length < records.length) throw new Error("Dado não confirmado no banco após salvar.");
    state.recursoTableMissing = false;
    state.dirtyRecursos = new Set();
    state.unsavedChanges = false;
    updateSaveControls();
    setSaveButtonsBusy(false);
    notify("Salvo no banco ✓", `${records.length} escola(s) gravadas com sucesso.`);
    renderFormationDetail();
  } catch (err) {
    console.error("Erro ao salvar recurso:", err);
    setSaveButtonsBusy(false);
    if (isMissingTableError(err)) {
      state.recursoTableMissing = true;
      renderFormationDetail();
    }
    notify("Erro ao salvar", err.message || "Verifique a conexão com o banco.", "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Salvar alterações"; }
  }
}

function updateSelectionBar() {
  const bar = $("#selectionBar");
  if (!bar) return;
  const count = state.selectedSchools.size;
  bar.classList.toggle("hidden", count === 0);
  const label = bar.querySelector("#selectionCount");
  if (label) label.textContent = `${count} escola${count !== 1 ? "s" : ""} selecionada${count !== 1 ? "s" : ""}`;
}

function applyRecursoToSelected(tipo, campo) {
  const formation = getFormation();
  if (!formation) return;
  if (!formation.recursoMap) formation.recursoMap = new Map();
  if (!state.dirtyRecursos) state.dirtyRecursos = new Set();
  state.selectedSchools.forEach((inep) => {
    const rec = formation.recursoMap.get(inep) || { formacao_id: formation.id, inep };
    rec[campo] = tipo;
    const resCampo = campo === "recurso_inscricao" ? "resultado_inscricao" : "resultado_credenciamento";
    rec[resCampo] = tipo === "realizado" ? "pendente" : "";
    formation.recursoMap.set(inep, rec);
    state.dirtyRecursos.add(inep);
  });
  state.unsavedChanges = true;
  clearSelection();
  renderFormationDetail();
  scheduleResourceAutoSave();
}

function renderPrazoRecursoRow(formation) {
  const el = $("#prazoRecursoRow");
  if (!el) return;
  const badges = [];
  const dInsc = daysUntil(formation.prazoRecursoInscricao);
  const dCred = daysUntil(formation.prazoRecursoCredenciamento);
  if (dInsc !== null) {
    const cls = dInsc < 0 ? "expired" : dInsc <= 7 ? "urgent" : "";
    badges.push(`<span class="countdown-badge ${cls}">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      Recurso inscrição: ${dInsc < 0 ? "encerrado" : dInsc === 0 ? "hoje é o último dia" : `${dInsc}d restantes`}
    </span>`);
  }
  if (dCred !== null) {
    const cls = dCred < 0 ? "expired" : dCred <= 7 ? "urgent" : "";
    badges.push(`<span class="countdown-badge event ${cls}">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      Recurso credenciamento: ${dCred < 0 ? "encerrado" : dCred === 0 ? "hoje é o último dia" : `${dCred}d restantes`}
    </span>`);
  }
  el.innerHTML = badges.join("");
  el.classList.toggle("hidden", badges.length === 0);
}

function clearSelection() {
  state.selectedSchools.clear();
  $$("#schoolsTable .row-check").forEach((cb) => { cb.checked = false; });
  $$("#schoolsTable tr.row-selected").forEach((tr) => tr.classList.remove("row-selected"));
  const sel = $("#selectAllCheck");
  if (sel) sel.checked = false;
  updateSelectionBar();
}

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
  const resLabel = (v) => v === "deferido" ? "DEFERIDO" : v === "indeferido" ? "INDEFERIDO" : v === "pendente" ? "PENDENTE" : "";
  const headers = ["GRE", "INEP", "ESCOLA", "NOME", "MATRICULA", "INSCRITO", "CREDENCIADO",
    "RECURSO INSCRIÇÃO", "RESULTADO", "RECURSO CREDENCIAMENTO", "RESULTADO"];
  const data = [
    headers,
    ...rows.flatMap((row) => {
      const reps = row.representantes.length ? row.representantes : [{ nome: "", matricula: "" }];
      return reps.map((rep) => [
        row.gre, row.inep, row.escola, rep.nome || "", rep.matricula || "",
        row.inscrito ? "SIM" : "NÃO", row.credenciado ? "SIM" : "NÃO",
        row.recurso_inscricao === "realizado" ? "REALIZADO" : "",
        resLabel(row.resultado_inscricao),
        row.recurso_credenciamento === "realizado" ? "REALIZADO" : "",
        resLabel(row.resultado_credenciamento),
      ]);
    }),
  ];
  const ws = window.XLSX.utils.aoa_to_sheet(data);
  const wb = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(wb, ws, "Formação");
  window.XLSX.writeFile(wb, getExportFileName("xlsx"));
  notify("Planilha gerada", `${rows.length} escolas exportadas em XLSX.`);
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
  let activeRewardBadge = null;
  if (hasAdminAccess() && state.rewardBadgeFilter !== null) {
    activeRewardBadge = rewardBadgeStatsByGre(rows).find((badge) => badge.index === state.rewardBadgeFilter) || null;
    if (activeRewardBadge) rows = rows.filter((row) => activeRewardBadge.greSet.has(row.gre || "GRE não informada"));
  }
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

  $("#goalChartTitle").textContent = activeRewardBadge
    ? `${modeLabel} por GRE · ${activeRewardBadge.label}`
    : `${modeLabel} por GRE`;
  $$("[data-goal-mode]").forEach((b) => b.classList.toggle("active", b.dataset.goalMode === mode));

  $("#greBars").innerHTML = entries
    .map((item) => {
      const range = rangeFor(item.percent);
      const fillH = Math.max(4, Math.round((item.percent / maxPercent) * 100));
      const selected = $("#greFilter")?.value === item.gre ? " selected" : "";
      return `
        <button class="goal-bar goal-${range.key}${selected}" type="button" data-gre="${esc(item.gre)}" title="${esc(`${item.gre}: ${item.value}/${item.total} ${modeLabel.toLowerCase()} (${item.percent}%)`)}">
          <span class="goal-fill" style="height:${fillH}%" data-pct="${item.percent}%">
            <span class="goal-count">${item.value}/${item.total}</span>
          </span>
          <span class="goal-label">${esc(item.gre.replace(" GRE", ""))}<small>GRE</small></span>
        </button>
      `;
    })
    .join("");

  $$("#greBars [data-gre]").forEach((bar) => {
    bar.addEventListener("click", () => {
      const greFilter = $("#greFilter");
      if (!greFilter) return;
      greFilter.value = greFilter.value === bar.dataset.gre ? "todos" : bar.dataset.gre;
      const search = $("#schoolSearch");
      if (search) search.value = "";
      clearSelection();
      state.schoolsTablePage = 1;
      renderFormationDetail();
      $("#schoolsTable")?.closest(".panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  $("#goalBarLegend").innerHTML = [
    activeRewardBadge
      ? `<button class="goal-filter-chip" type="button" id="clearRewardBadgeFilter">Filtro: ${esc(activeRewardBadge.label)} · ${activeRewardBadge.achievedCount}/${activeRewardBadge.totalGres} GREs</button>`
      : "",
    ...ranges.map((r) => `<span><i style="background:${r.color};border-radius:3px"></i>${r.label}</span>`),
  ].join("");

  on("#clearRewardBadgeFilter", "click", () => {
    state.rewardBadgeFilter = null;
    renderFormationDetail();
  });

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


async function importCsvFile(file) {
  await withButtonBusy($("#importCsvBtn"), "Importando...", async () => {
    const formation = getFormation();
    if (!formation) return;
    const previousRows = formation.rows || [];
    try {
      let rows2D;
      if (/\.xlsx?$/i.test(file.name)) {
        const buffer = await file.arrayBuffer();
        const wb = window.XLSX.read(buffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows2D = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      } else {
        rows2D = parseCsv(await file.text());
      }
      const rows = parseFormationRows(rows2D);
      if (!rows.length) throw new Error("Nenhum INEP encontrado. Verifique se o arquivo tem as colunas GRE, INEP, ESCOLA, INSCRITO, CREDENCIADO.");
      formation.rows = rows;
      const savedToDb = await persistFormationRows(formation);
      notify(
        savedToDb ? "Importação concluída" : "Importação salva localmente",
        savedToDb ? `${formation.rows.length} escolas salvas no banco de dados.` : `${formation.rows.length} escolas salvas apenas neste navegador.`,
        savedToDb ? "success" : "warning",
      );
      renderFormationCards();
      renderFormationDetail();
    } catch (err) {
      formation.rows = previousRows;
      saveStored("monitor-formations", state.formations);
      renderFormationCards();
      renderFormationDetail();
      notify("Erro na importação", err.message || "Verifique o formato do arquivo.", "error");
    }
  });
}


function parseFormationCsv(csv) {
  return parseFormationRows(parseCsv(csv));
}

function parseFormationRows(rows) {
  if (!rows.length) return [];

  // Build index map — handle duplicate "resultado" columns by order
  const rawHeaders = rows[0].map((h) => normalizeKey(String(h ?? "")));
  const idx = {};
  let resultadoCount = 0;
  rawHeaders.forEach((h, i) => {
    if (h === "resultado") {
      resultadoCount++;
      idx[resultadoCount === 1 ? "resultado_inscricao" : "resultado_credenciamento"] = i;
    } else if (!(h in idx)) {
      idx[h] = i;
    }
  });

  const col = (row, ...keys) => {
    for (const k of keys) {
      if (idx[k] !== undefined) return String(row[idx[k]] ?? "").trim();
    }
    return "";
  };

  const mapRes = (v) => { const n = normalize(v); return n === "deferido" ? "deferido" : n === "indeferido" ? "indeferido" : ""; };

  const byInep = new Map();
  rows.slice(1).forEach((row, i) => {
    const inep = col(row, "inep", "codigoinep", "codinep");
    if (!inep) return;
    if (!byInep.has(inep)) {
      byInep.set(inep, {
        inep,
        gre: col(row, "gre"),
        escola: col(row, "escola"),
        inscrito: false,
        credenciado: false,
        recurso_inscricao: normalize(col(row, "recursoinscricao", "recursoinscricoes")) === "realizado" ? "realizado" : "",
        resultado_inscricao: mapRes(col(row, "resultado_inscricao")),
        recurso_credenciamento: normalize(col(row, "recursocredenciamento")) === "realizado" ? "realizado" : "",
        resultado_credenciamento: mapRes(col(row, "resultado_credenciamento")),
        representantes: [],
      });
    }
    const item = byInep.get(inep);
    const inscrito = yes(col(row, "inscrito", "inscricao"));
    const credenciado = yes(col(row, "credenciado", "credenciamento"));
    item.inscrito = item.inscrito || inscrito;
    item.credenciado = item.credenciado || credenciado;
    item.representantes.push({
      nome: col(row, "nome", "nomerepresentante", "representante") || `Representante ${i + 1}`,
      matricula: col(row, "matricula", "cpf"),
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
            <option value="intermediario" ${user.perfil === "intermediario" ? "selected" : ""}>Intermediário</option>
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

// ─── PROFESSORES ────────────────────────────────────────────────────────────

async function ensureTeacherFormation() {
  const existing = state.formations.find((f) => normalize(f.publico || "").includes("professor"));
  if (existing) return existing.id;

  const f = {
    id: makeId(),
    nome: "Formação de Professores 2026",
    publico: "Professores",
    esperado: 0,
    foto: "",
    rows: [],
    recursoMap: new Map(),
    createdAt: new Date().toISOString(),
    dataEvento: "",
    prazoInscricoes: "",
    prazoRecursoInscricao: "",
    prazoRecursoCredenciamento: "",
  };

  if (db) {
    try {
      const { data, error } = await db.from("formacoes").upsert(toDbFormation(f), { onConflict: "id" }).select("id").single();
      if (!error && data?.id) f.id = data.id;
    } catch { /* usa id local */ }
  }

  state.formations.push(f);
  saveStored("monitor-teacher-formation-id", f.id);
  return f.id;
}

async function loadTeacherRowsFromDb(formacaoId) {
  const localKey = "monitor-teacher-rows-" + formacaoId;
  const localRows = loadStored(localKey, []).map((r) => ({ ...r, formacaoId: r.formacaoId || formacaoId }));
  if (!db) return localRows;
  try {
    const rows = await selectAllDbRows("professor_dados", "nome,email,inep,conclusao,media,resultado,curso_id,imported_at", (q) =>
      q.eq("formacao_id", formacaoId).not("curso_id", "is", null).order("nome")
    );
    const schoolByInep = new Map();
    (state.base?.schools || []).forEach((s) => schoolByInep.set(String(s.inep), s));
    const mapped = rows.map((r) => {
      const school = schoolByInep.get(String(r.inep || ""));
      return {
        nome: r.nome || "",
        email: r.email || "",
        inep: String(r.inep || ""),
        gre: school?.gre || "",
        escola: school?.escola || "",
        conclusao: Number(r.conclusao || 0),
        media: Number(r.media || 0),
        resultado: r.resultado || "",
        cursoId: r.curso_id || null,
        importedAt: r.imported_at || "",
        formacaoId,
      };
    });
    saveStored(localKey, mapped);
    return mapped;
  } catch {
    return localRows;
  }
}

async function loadTeacherRowsForFormations(formacaoIds) {
  const ids = [...new Set((formacaoIds || []).filter(Boolean))];
  if (!ids.length) return [];
  const groups = await Promise.all(ids.map((id) => loadTeacherRowsFromDb(id)));
  return groups.flat();
}

async function persistTeacherRows(formacaoId, rows, cursoId = null) {
  const localRows = (state.teacherRows?.length ? state.teacherRows : rows)
    .filter((r) => (r.formacaoId || formacaoId) === formacaoId)
    .map((r) => ({ ...r, formacaoId: r.formacaoId || formacaoId }));
  saveStored("monitor-teacher-rows-" + formacaoId, localRows);
  state.teacherPersistError = "";
  if (!db) return false;
  try {
    notify("Salvando no banco...", `${rows.length.toLocaleString("pt-BR")} professores — pode levar alguns segundos.`, "warning");
    let delQuery = db.from("professor_dados").delete().eq("formacao_id", formacaoId);
    if (cursoId) delQuery = delQuery.eq("curso_id", cursoId);
    const { error: delErr } = await delQuery;
    if (delErr) throw delErr;
    const dbRows = rows.map((r) => ({
      formacao_id: formacaoId,
      curso_id: cursoId || null,
      nome: r.nome,
      email: r.email,
      inep: r.inep,
      conclusao: r.conclusao,
      media: r.media || 0,
      resultado: r.resultado || "",
    }));
    await insertDbRows("professor_dados", dbRows, 500);
    return true;
  } catch (err) {
    console.warn("Não foi possível salvar professores no Supabase.", err);
    state.teacherPersistError = err?.message || "Erro desconhecido ao salvar no Supabase.";
    return false;
  }
}

function parseTeacherRows(rows2D) {
  if (!rows2D.length) return [];
  const rawHeaders = rows2D[0].map((h) => normalizeKey(String(h ?? "")));
  const idx = {};
  rawHeaders.forEach((h, i) => { if (!(h in idx)) idx[h] = i; });

  // busca exata, depois por prefixo (lida com headers longos como "Conclusão (Clique...)")
  const col = (row, ...keys) => {
    for (const k of keys) {
      if (idx[k] !== undefined) return String(row[idx[k]] ?? "").trim();
      const prefixKey = Object.keys(idx).find((h) => h.startsWith(k) || k.startsWith(h));
      if (prefixKey !== undefined) return String(row[idx[prefixKey]] ?? "").trim();
    }
    return "";
  };

  const schoolByInep = new Map();
  (state.base?.schools || []).forEach((s) => schoolByInep.set(String(s.inep), s));

  const rows = [];
  rows2D.slice(1).forEach((row) => {
    const inep = col(row, "inep", "codigoinep", "codinep");
    if (!inep) return;
    const nome = col(row, "nome", "nomeservidor", "nomeprofessor");
    const email = col(row, "email", "emailservidor");
    const conclusaoRaw = col(row, "conclusao", "conclusao2026", "percentual", "pct", "progresso");

    let conclusao = 0;
    if (conclusaoRaw) {
      const clean = conclusaoRaw.replace(",", ".").replace("%", "").trim();
      const num = parseFloat(clean);
      if (!isNaN(num)) conclusao = num > 1.5 ? Math.min(100, num) : Math.round(num * 100);
    }

    const mediaRaw = col(row, "mediadanota", "media", "nota", "mediadadanota");
    const media = mediaRaw ? Math.max(0, parseFloat(mediaRaw.replace(",", ".")) || 0) : 0;

    const resultadoRaw = col(row, "resultado", "status", "situacao");
    const resultado = resultadoRaw || (conclusao >= 100 ? "Concluído" : conclusao > 0 ? "Em andamento" : "Não iniciado");

    const school = schoolByInep.get(inep);
    rows.push({ nome, email, inep, gre: school?.gre || "", escola: school?.escola || "", conclusao, media, resultado });
  });
  return rows;
}

async function importTeacherCsv(file) {
  return withButtonBusy(null, "Importando...", async () => {
    if (!state.teacherFormationId) {
      notify("Erro", "Formação de professores não encontrada.", "error");
      return false;
    }
    showPageLoader();
    try {
      let rows2D;
      if (/\.xlsx?$/i.test(file.name)) {
        const buffer = await file.arrayBuffer();
        const wb = window.XLSX.read(buffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows2D = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      } else {
        rows2D = parseCsv(await file.text());
      }
      const rows = parseTeacherRows(rows2D);
      if (!rows.length) throw new Error("Nenhum dado encontrado. Verifique se a planilha tem as colunas NOME, EMAIL, INEP, CONCLUSÃO.");

      const cursoId = state.selectedCourseId || null;
      const taggedRows = rows.map((r) => ({ ...r, cursoId }));
      // Merge: keep rows of other courses, replace rows of this course
      state.teacherRows = [
        ...state.teacherRows.filter((r) => r.cursoId !== cursoId),
        ...taggedRows,
      ];
      const savedToDb = await persistTeacherRows(state.teacherFormationId, taggedRows, cursoId);
      if (db && !savedToDb) {
        hidePageLoader();
        notify(
          "Base não salva no banco",
          state.teacherPersistError || "A importação ficou apenas neste navegador. Tente novamente depois.",
          "error",
        );
        renderTeachersArea();
        return false;
      }
      if (cursoId) {
        const course = state.courses.find((c) => c.id === cursoId);
        if (course) {
          course.importedCount = rows.length;
          course.lastImportedAt = new Date().toISOString();
          saveStored("monitor-courses", state.courses);
        }
      }

      hidePageLoader();
      notify(
        savedToDb ? "Importação concluída" : "Importação salva localmente",
        `${rows.length.toLocaleString("pt-BR")} professores carregados.`,
        savedToDb ? "success" : "warning",
      );
      renderTeachersArea();
      return true;
    } catch (err) {
      hidePageLoader();
      notify("Erro na importação", err.message || "Verifique o formato do arquivo.", "error");
      return false;
    }
  });
}

function getTeacherSchoolRows() {
  const isAdmin = hasAdminAccess();
  const userGre = state.user?.gre;
  const schoolByInep = new Map();
  (state.base?.schools || []).forEach((s) => schoolByInep.set(String(s.inep), s));

  const byInep = new Map();
  getFilteredTeacherRowsByReportFilters().forEach((r) => {
    if (!isAdmin && userGre && r.gre !== userGre) return;
    if (!byInep.has(r.inep)) {
      const school = schoolByInep.get(r.inep);
      byInep.set(r.inep, {
        gre: r.gre || school?.gre || "",
        inep: r.inep,
        escola: r.escola || school?.escola || "",
        esperado: school?.professores || 0,
        total: 0,
        concluidos: 0,
        somaMedia: 0,
      });
    }
    const entry = byInep.get(r.inep);
    entry.total++;
    if (r.resultado === "Concluído") entry.concluidos++;
    entry.somaMedia += r.media || 0;
  });

  return Array.from(byInep.values()).map((e) => ({
    gre: e.gre,
    inep: e.inep,
    escola: e.escola,
    esperado: e.esperado,
    total: e.total,
    concluidos: e.concluidos,
    mediaEscola: e.total > 0 ? Math.round((e.somaMedia / e.total) * 10) / 10 : 0,
    pct: e.total > 0 ? Math.round((e.concluidos / e.total) * 100) : 0,
  }));
}

function filteredTeacherPersonRows() {
  const isAdmin = hasAdminAccess();
  const userGre = state.user?.gre;
  const q = normalize(state.teachersSearch || "");
  const greF = state.teachersGreFilter;
  const concF = state.teachersConclusaoFilter;

  return getFilteredTeacherRowsByReportFilters().filter((r) => {
    if (!isAdmin && userGre && r.gre !== userGre) return false;
    if (greF !== "todos" && r.gre !== greF) return false;
    if (concF !== "todos" && r.resultado !== concF) return false;
    if (q) {
      const text = normalize(`${r.nome} ${r.email} ${r.inep} ${r.escola} ${r.gre}`);
      if (!text.includes(q)) return false;
    }
    return true;
  });
}

function filteredTeacherSchoolRows() {
  const schools = getTeacherSchoolRows();
  const q = normalize(state.teachersSearch || "");
  const greF = state.teachersGreFilter;
  const concF = state.teachersConclusaoFilter;

  return schools.filter((s) => {
    if (greF !== "todos" && s.gre !== greF) return false;
    if (concF === "Concluído" && s.concluidos === 0) return false;
    if (concF === "Não iniciado" && s.concluidos > 0) return false;
    if (q) {
      const text = normalize(`${s.gre} ${s.inep} ${s.escola}`);
      if (!text.includes(q)) return false;
    }
    return true;
  });
}

function getTeacherSelectedFormationIds() {
  const teacherFormations = state.formations.filter((f) => f.id && normalize(f.publico || "").includes("professor"));
  const selected = state.teacherFilterFormationIds?.length ? state.teacherFilterFormationIds : teacherFormations.map((f) => f.id);
  return selected.filter((id) => teacherFormations.some((f) => f.id === id));
}

function getTeacherDraftFormationIds() {
  const teacherFormations = state.formations.filter((f) => f.id && normalize(f.publico || "").includes("professor"));
  const selected = state.teacherDraftFormationIds?.length ? state.teacherDraftFormationIds : teacherFormations.map((f) => f.id);
  return selected.filter((id) => teacherFormations.some((f) => f.id === id));
}

function getFilteredTeacherRowsByReportFilters() {
  const formationIds = new Set(getTeacherSelectedFormationIds());
  const courseIds = new Set(state.teacherFilterCourseIds || []);
  const trilhas = new Set(state.teacherFilterTrilhas || []);
  const coursesById = new Map(state.courses.map((c) => [c.id, c]));

  return state.teacherRows.filter((row) => {
    const rowFormationId = row.formacaoId || state.teacherFormationId;
    if (formationIds.size && !formationIds.has(rowFormationId)) return false;
    const course = coursesById.get(row.cursoId);
    if (courseIds.size && !courseIds.has(row.cursoId)) return false;
    if (trilhas.size && !trilhas.has(course?.trilha || "")) return false;
    return true;
  });
}

function backToCourses() {
  showTeachersArea();
}

function openTeacherDashboard() {
  state.formationMode = "teacher-dashboard";
  state.dashboardGreFilter = "todos";
  state.dashboardCourseFilter = "todos";
  state.dashboardSchoolSearch = "";
  render();
}

function getDashboardRows() {
  const isAdmin = hasAdminAccess();
  const userGre = state.user?.gre;
  const formacaoId = state.teacherFormationId;
  const allFormationCourses = state.courses.filter((c) => c.formacaoId === formacaoId);
  const filteredCourses = state.dashboardCourseFilter !== "todos"
    ? allFormationCourses.filter((c) => c.id === state.dashboardCourseFilter)
    : allFormationCourses;
  const courseIdSet = new Set(filteredCourses.map((c) => c.id));
  let rows = state.teacherRows.filter((r) => courseIdSet.has(r.cursoId));
  if (!isAdmin) rows = rows.filter((r) => r.gre === userGre);
  else if (state.dashboardGreFilter !== "todos") rows = rows.filter((r) => r.gre === state.dashboardGreFilter);
  return { rows, allFormationCourses, filteredCourses };
}

function renderTeacherDashboard() {
  if (state.formationMode !== "teacher-dashboard") return;
  const isAdmin = hasAdminAccess();
  const formacaoId = state.teacherFormationId;
  const formation = state.formations.find((f) => f.id === formacaoId);
  const nameEl = $("#dashboardFormationName");
  if (nameEl) nameEl.textContent = formation?.nome || "Dashboard";

  const allFormationCourses = state.courses.filter((c) => c.formacaoId === formacaoId);

  // Populate GRE filter
  const greSelect = $("#dashFilterGre");
  if (greSelect) {
    if (!isAdmin) {
      greSelect.closest(".dash-filter-row")?.classList.add("hidden");
    } else {
      const courseIds = new Set(allFormationCourses.map((c) => c.id));
      const gres = [...new Set(state.teacherRows.filter((r) => courseIds.has(r.cursoId)).map((r) => r.gre).filter(Boolean))]
        .sort((a, b) => getGreNumber(a) - getGreNumber(b));
      const prev = state.dashboardGreFilter;
      greSelect.innerHTML = `<option value="todos">Todas as GREs</option>` +
        gres.map((g) => `<option value="${esc(g)}">${esc(g)}</option>`).join("");
      greSelect.value = gres.includes(prev) ? prev : "todos";
    }
  }

  // Populate course filter
  const courseSelect = $("#dashFilterCourse");
  if (courseSelect) {
    const prev = state.dashboardCourseFilter;
    courseSelect.innerHTML = `<option value="todos">Todos os cursos</option>` +
      allFormationCourses.map((c) => `<option value="${esc(c.id)}">${esc(c.nome)}</option>`).join("");
    courseSelect.value = allFormationCourses.some((c) => c.id === prev) ? prev : "todos";
  }

  const { rows, filteredCourses } = getDashboardRows();

  // KPIs
  const total = rows.length;
  const concluidos = rows.filter((r) => r.resultado === "Concluído").length;
  const emAndamento = rows.filter((r) => r.resultado === "Em andamento").length;
  const naoIniciados = rows.filter((r) => !r.resultado || r.resultado === "Não iniciado").length;
  const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;
  const pctNao = total > 0 ? Math.round((naoIniciados / total) * 100) : 0;
  const metricsEl = $("#dashboardMetrics");
  if (metricsEl) {
    const kpis = [
      { label: "Inscritos", value: total.toLocaleString("pt-BR"), v: "metric-accent" },
      { label: "Não iniciados", value: naoIniciados.toLocaleString("pt-BR"), sub: `${pctNao}%`, v: "metric-danger" },
      { label: "Em andamento", value: emAndamento.toLocaleString("pt-BR"), v: "metric-wait" },
      { label: "Concluídos", value: concluidos.toLocaleString("pt-BR"), v: "metric-ok" },
      { label: "Taxa de conclusão", value: `${pct}%`, v: "metric-ok" },
    ];
    metricsEl.innerHTML = kpis.map((k) => `
      <div class="metric panel ${k.v}">
        <span>${k.label}</span>
        <strong>${k.value}${k.sub ? `<small class="metric-sub">${k.sub}</small>` : ""}</strong>
      </div>`).join("");
  }

  renderDashboardGreBars(rows);
  renderDashboardCourseTable(filteredCourses, rows);
  renderDashboardSchoolTable(rows);
}

function renderDashboardGreBars(rows) {
  const byGre = new Map();
  rows.forEach((r) => {
    if (!byGre.has(r.gre)) byGre.set(r.gre, { total: 0, concluidos: 0 });
    const e = byGre.get(r.gre);
    e.total++;
    if (r.resultado === "Concluído") e.concluidos++;
  });
  const ranges = [
    { key: "high",    color: "#22c55e", label: "90% ou mais",   test: (v) => v >= 90 },
    { key: "midHigh", color: "#38bdf8", label: "50% a 89%",     test: (v) => v >= 50 },
    { key: "midLow",  color: "#f59e0b", label: "30% a 49%",     test: (v) => v >= 30 },
    { key: "low",     color: "#ef4444", label: "Abaixo de 30%", test: (v) => v < 30 },
  ];
  const rangeFor = (v) => ranges.find((r) => r.test(v)) || ranges.at(-1);
  const entries = [...byGre.entries()]
    .filter(([g]) => g && /\d/.test(g))
    .map(([g, d]) => ({ gre: g, total: d.total, concluidos: d.concluidos, pct: d.total > 0 ? Math.round((d.concluidos / d.total) * 100) : 0 }))
    .sort((a, b) => getGreNumber(a.gre) - getGreNumber(b.gre));
  const maxPct = Math.max(100, ...entries.map((e) => e.pct));
  const totalC = entries.reduce((s, e) => s + e.concluidos, 0);
  const totalT = entries.reduce((s, e) => s + e.total, 0);
  const overall = totalT > 0 ? Math.round((totalC / totalT) * 100) : 0;
  const barsEl = $("#dashboardGreBars");
  if (barsEl) {
    barsEl.innerHTML = entries.map((e) => {
      const range = rangeFor(e.pct);
      const h = Math.max(4, Math.round((e.pct / maxPct) * 100));
      return `<button class="goal-bar goal-${range.key}" title="${esc(`${e.gre}: ${e.concluidos}/${e.total} (${e.pct}%)`)}">
        <span class="goal-fill" style="height:${h}%" data-pct="${e.pct}%">
          <span class="goal-count">${e.concluidos}/${e.total}</span>
        </span>
        <span class="goal-label">${esc(e.gre.replace(" GRE", ""))}<small>GRE</small></span>
      </button>`;
    }).join("");
  }
  const legendEl = $("#dashboardGreLegend");
  if (legendEl) legendEl.innerHTML = ranges.map((r) => `<span><i style="background:${r.color};border-radius:3px"></i>${r.label}</span>`).join("");
  const pieEl = $("#dashboardPie");
  if (pieEl) {
    const range = rangeFor(overall);
    pieEl.style.background = `conic-gradient(${range.color} 0 ${overall}%, rgba(255,255,255,0.08) ${overall}% 100%)`;
    pieEl.style.setProperty("--pie-glow", `${range.color}70`);
    pieEl.style.setProperty("--pie-glow-far", `${range.color}28`);
    pieEl.innerHTML = `<strong>${overall}%</strong><span>${totalC.toLocaleString("pt-BR")}<br>concluídos</span>`;
    let info = $("#dashPieInfo");
    if (!info) { info = document.createElement("div"); info.id = "dashPieInfo"; info.className = "goal-pie-info"; pieEl.parentElement.appendChild(info); }
    info.innerHTML = `<strong style="color:${range.color}">${totalC.toLocaleString("pt-BR")}</strong><small>de ${totalT.toLocaleString("pt-BR")} na planilha</small>`;
  }
}

function renderDashboardCourseTable(filteredCourses, rows) {
  const headEl = $("#dashCourseHead");
  const bodyEl = $("#dashCourseBody");
  if (!headEl || !bodyEl) return;
  const pctColor = (v) => v >= 90 ? "#22c55e" : v >= 50 ? "#38bdf8" : v >= 30 ? "#f59e0b" : "#ef4444";
  const { pageItems } = paginateItems(filteredCourses, "dashboardCoursePage");
  headEl.innerHTML = `<th>Curso</th><th>Trilha</th><th class="th-num">Inscritos</th><th class="th-num">Concluídos</th><th class="th-num">Em andamento</th><th class="th-num">Não iniciados</th><th class="th-num">%</th>`;
  bodyEl.innerHTML = pageItems.map((c) => {
    const cr = rows.filter((r) => r.cursoId === c.id);
    const ins = cr.length;
    const con = cr.filter((r) => r.resultado === "Concluído").length;
    const and = cr.filter((r) => r.resultado === "Em andamento").length;
    const nao = ins - con - and;
    const p = ins > 0 ? Math.round((con / ins) * 100) : 0;
    const color = pctColor(p);
    const trilhaStyle = c.trilha ? TRILHA_COLORS[c.trilha] : null;
    const trilhaBadge = trilhaStyle ? `<span class="formation-tag" style="font-size:0.68rem;background:${trilhaStyle.bg};border-color:${trilhaStyle.border};color:${trilhaStyle.color}">${esc(c.trilha)}</span>` : `<span style="color:var(--muted);font-size:0.78rem">—</span>`;
    return `<tr>
      <td><strong>${esc(c.nome)}</strong>${c.cargaHoraria ? `<br><small class="muted">${esc(c.cargaHoraria)}</small>` : ""}</td>
      <td>${trilhaBadge}</td>
      <td class="td-num">${ins.toLocaleString("pt-BR")}</td>
      <td class="td-num">${con.toLocaleString("pt-BR")}</td>
      <td class="td-num">${and.toLocaleString("pt-BR")}</td>
      <td class="td-num">${nao.toLocaleString("pt-BR")}</td>
      <td><div class="pct-bar-wrap"><div class="pct-bar-track"><div class="pct-bar-fill" style="width:${Math.min(100,p)}%;background:${color}"></div></div><span class="pct-bar-label" style="color:${color}">${p}%</span></div></td>
    </tr>`;
  }).join("") || `<tr><td colspan="7" class="empty-row">Nenhum dado.</td></tr>`;
  renderPagination("#dashCoursePagination", "dashboardCoursePage", filteredCourses.length, () => renderDashboardCourseTable(filteredCourses, rows));
}

function renderDashboardSchoolTable() {
  if (state.formationMode !== "teacher-dashboard") return;
  const headEl = $("#dashSchoolHead");
  const bodyEl = $("#dashSchoolBody");
  if (!headEl || !bodyEl) return;
  const { rows } = getDashboardRows();
  const search = normalize(state.dashboardSchoolSearch);
  const pctColor = (v) => v >= 90 ? "#22c55e" : v >= 50 ? "#38bdf8" : v >= 30 ? "#f59e0b" : "#ef4444";
  const byInep = new Map();
  rows.forEach((r) => {
    if (!byInep.has(r.inep)) byInep.set(r.inep, { gre: r.gre, escola: r.escola || r.inep, total: 0, concluidos: 0 });
    const e = byInep.get(r.inep);
    e.total++;
    if (r.resultado === "Concluído") e.concluidos++;
  });
  let entries = [...byInep.values()].sort((a, b) => getGreNumber(a.gre) - getGreNumber(b.gre) || a.escola.localeCompare(b.escola));
  if (search) entries = entries.filter((e) => normalize(e.escola).includes(search) || normalize(e.gre).includes(search));
  const { pageItems } = paginateItems(entries, "dashboardSchoolPage");
  headEl.innerHTML = `<th>GRE</th><th>Escola</th><th class="th-num">Inscritos</th><th class="th-num">Concluídos</th><th class="th-num">%</th>`;
  bodyEl.innerHTML = pageItems.map((e) => {
    const p = e.total > 0 ? Math.round((e.concluidos / e.total) * 100) : 0;
    const color = pctColor(p);
    return `<tr>
      <td class="td-gre">${esc(e.gre)}</td>
      <td class="td-escola"><strong>${esc(e.escola)}</strong></td>
      <td class="td-num">${e.total.toLocaleString("pt-BR")}</td>
      <td class="td-num">${e.concluidos.toLocaleString("pt-BR")}</td>
      <td><div class="pct-bar-wrap"><div class="pct-bar-track"><div class="pct-bar-fill" style="width:${Math.min(100,p)}%;background:${color}"></div></div><span class="pct-bar-label" style="color:${color}">${p}%</span></div></td>
    </tr>`;
  }).join("") || `<tr><td colspan="5" class="empty-row">Nenhuma escola encontrada.</td></tr>`;
  renderPagination("#dashSchoolPagination", "dashboardSchoolPage", entries.length, renderDashboardSchoolTable);
}

function exportDashboardXlsx() {
  if (!window.XLSX) { notify("Erro", "Biblioteca XLSX não carregada.", "error"); return; }
  const { rows, filteredCourses } = getDashboardRows();
  const wb = window.XLSX.utils.book_new();
  // Sheet: por curso
  const courseHeaders = ["Curso", "Trilha", "Carga horária", "Inscritos", "Concluídos", "Em andamento", "Não iniciados", "%"];
  const courseData = filteredCourses.map((c) => {
    const cr = rows.filter((r) => r.cursoId === c.id);
    const ins = cr.length; const con = cr.filter((r) => r.resultado === "Concluído").length;
    const and = cr.filter((r) => r.resultado === "Em andamento").length;
    return [c.nome, c.trilha || "", c.cargaHoraria || "", ins, con, and, ins - con - and, ins > 0 ? Math.round(con / ins * 100) + "%" : "0%"];
  });
  window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet([courseHeaders, ...courseData]), "Por Curso");
  // Sheet: por escola
  const byInep = new Map();
  rows.forEach((r) => {
    if (!byInep.has(r.inep)) byInep.set(r.inep, { gre: r.gre, escola: r.escola || r.inep, total: 0, concluidos: 0 });
    const e = byInep.get(r.inep); e.total++; if (r.resultado === "Concluído") e.concluidos++;
  });
  const schoolHeaders = ["GRE", "Escola", "Inscritos", "Concluídos", "%"];
  const schoolData = [...byInep.values()].sort((a, b) => getGreNumber(a.gre) - getGreNumber(b.gre))
    .map((e) => [e.gre, e.escola, e.total, e.concluidos, e.total > 0 ? Math.round(e.concluidos / e.total * 100) + "%" : "0%"]);
  window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet([schoolHeaders, ...schoolData]), "Por Escola");
  // Sheet: por GRE
  const byGre = new Map();
  rows.forEach((r) => {
    if (!byGre.has(r.gre)) byGre.set(r.gre, { total: 0, concluidos: 0 });
    const e = byGre.get(r.gre); e.total++; if (r.resultado === "Concluído") e.concluidos++;
  });
  const greHeaders = ["GRE", "Inscritos", "Concluídos", "%"];
  const greData = [...byGre.entries()].sort((a, b) => getGreNumber(a[0]) - getGreNumber(b[0]))
    .map(([g, d]) => [g, d.total, d.concluidos, d.total > 0 ? Math.round(d.concluidos / d.total * 100) + "%" : "0%"]);
  window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet([greHeaders, ...greData]), "Por GRE");
  window.XLSX.writeFile(wb, "dashboard_formacao.xlsx");
  notify("Exportado", "Dashboard exportado em XLSX com 3 abas.", "success");
}

function renderCoursesList() {
  const container = $("#courseCards");
  if (!container || state.formationMode !== "courses") return;
  const isAdmin = hasAdminAccess();
  const formacaoId = state.teacherFormationId;
  const formation = state.formations.find((f) => f.id === formacaoId);
  const nameEl = $("#coursesFormationName");
  const isAllCourses = !formacaoId;
  if (nameEl) nameEl.textContent = isAllCourses ? "Cursos cadastrados" : (formation?.nome || "Cursos");

  const dashboardBtn = $("#dashboardBtn");
  if (dashboardBtn) dashboardBtn.classList.toggle("hidden", isAllCourses);

  const courses = (isAllCourses ? state.courses : state.courses.filter((c) => c.formacaoId === formacaoId))
    .slice()
    .sort((a, b) => {
      const fa = state.formations.find((f) => f.id === a.formacaoId)?.nome || "";
      const fb = state.formations.find((f) => f.id === b.formacaoId)?.nome || "";
      return fa.localeCompare(fb) || String(a.nome || "").localeCompare(String(b.nome || ""));
    });
  const iconClock = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

  container.innerHTML = courses.map((c) => {
    const rows = state.teacherRows.filter((r) => r.cursoId === c.id);
    const naplanilha = rows.length;
    const concluidos = rows.filter((r) => r.resultado === "Concluído").length;
    const pct = naplanilha > 0 ? Math.round((concluidos / naplanilha) * 100) : 0;
    const importedCount = Math.max(Number(c.importedCount || 0), naplanilha);
    const importInfo = importedCount
      ? `<small>Base inserida: ${importedCount.toLocaleString("pt-BR")} registros</small>${c.lastImportedAt ? `<small class="event-updated">Atualizado em ${esc(formatDateTime(c.lastImportedAt))}</small>` : ""}`
      : `<small>Sem dados importados</small>`;
    const courseFormation = state.formations.find((f) => f.id === c.formacaoId);
    const cargaTag = c.cargaHoraria ? `<span class="formation-tag">${iconClock}${esc(c.cargaHoraria)}</span>` : "";
    const trilhaStyle = c.trilha ? TRILHA_COLORS[c.trilha] : null;
    const trilhaTag = trilhaStyle
      ? `<span class="formation-tag" style="background:${trilhaStyle.bg};border-color:${trilhaStyle.border};color:${trilhaStyle.color}">${esc(c.trilha)}</span>`
      : "";
    const formationTag = isAllCourses && courseFormation ? `<span class="formation-tag">${esc(courseFormation.nome)}</span>` : "";
    const allTags = [formationTag, cargaTag, trilhaTag].filter(Boolean).join("");
    return `
      <article class="event-card">
        ${c.foto ? `<img class="event-photo" src="${esc(c.foto)}" alt="" />` : ""}
        <div class="event-card-top">
          <span class="event-type">Curso</span>
        </div>
        <strong>${esc(c.nome)}</strong>
        ${allTags ? `<div class="formation-tags">${allTags}</div>` : ""}
        ${importInfo}
        <small>${concluidos.toLocaleString("pt-BR")} concluídos</small>
        <div class="event-progress"><span style="width:${Math.min(100, pct)}%"></span></div>
        <div class="event-foot"><span>${pct}% conclusão</span></div>
        <div class="card-actions">
          ${isAdmin ? `<button class="mini-button" data-edit-course="${esc(c.id)}">Editar</button>` : ""}
          ${isAdmin ? `<button class="mini-button danger-button" data-delete-course="${esc(c.id)}">Excluir</button>` : ""}
        </div>
      </article>
    `;
  }).join("") || `<p class="muted" style="padding:24px">${isAllCourses ? "Nenhum curso cadastrado." : "Nenhum curso cadastrado para esta formação."}</p>`;
  container.querySelectorAll("[data-edit-course]").forEach((b) => {
    b.addEventListener("click", () => startEditCourse(b.dataset.editCourse));
  });
  container.querySelectorAll("[data-delete-course]").forEach((b) => {
    b.addEventListener("click", () => confirmDeleteCourse(b.dataset.deleteCourse));
  });
}

function resetCourseForm() {
  const form = $("#courseFormEl");
  if (!form) return;
  form.reset();
  populateCourseFormationSelect(state.teacherFormationId);
  const title = $("#courseFormTitle");
  if (title) title.textContent = "Cadastrar curso";
  const btn = $("#courseFormSubmitBtn");
  if (btn) btn.textContent = "Salvar curso";
  const hint = $("#courseFormPhotoHint");
  if (hint) hint.textContent = "";
}

function populateCourseFormationSelect(selectedId = "") {
  const select = $("#courseFormationSelect");
  if (!select) return;
  const formations = state.formations.filter((f) => f.id && f.nome && normalize(f.publico || "").includes("professor"));
  select.innerHTML = `<option value="">Selecione a formação</option>` +
    formations.map((f) => `<option value="${esc(f.id)}">${esc(f.nome)}</option>`).join("");
  const fallback = formations[0]?.id || "";
  select.value = formations.some((f) => f.id === selectedId) ? selectedId : fallback;
}

function fillCourseForm(course) {
  const form = $("#courseFormEl");
  if (!form) return;
  populateCourseFormationSelect(course.formacaoId);
  form.elements.nome.value = course.nome || "";
  form.elements.cargaHoraria.value = course.cargaHoraria || "";
  form.elements.trilha.value = course.trilha || "";
  form.elements.foto.value = "";
  if (form.elements.dados) form.elements.dados.value = "";
  const title = $("#courseFormTitle");
  if (title) title.textContent = "Editar curso";
  const btn = $("#courseFormSubmitBtn");
  if (btn) btn.textContent = "Salvar alterações";
  const hint = $("#courseFormPhotoHint");
  if (hint) hint.textContent = course.foto ? "Uma foto já está cadastrada. Escolha outra imagem apenas se quiser substituir." : "";
}

function startNewCourse(formacaoId = null) {
  state.courseFormReturnMode = state.formationMode === "courses" && !state.teacherFormationId ? "courses-all" : "teachers-list";
  state.formationMode = "teachers-list";
  state.teacherAdminFormView = "list";
  if (formacaoId) state.teacherFormationId = formacaoId;
  state.editingCourseId = null;
  state.courseAdminFormView = "form";
  resetCourseForm();
  render();
}

function startEditCourse(id) {
  const course = state.courses.find((c) => c.id === id);
  if (!course) return;
  state.courseFormReturnMode = state.formationMode === "courses" && !state.teacherFormationId ? "courses-all" : "courses-formation";
  state.formationMode = "teachers-list";
  state.teacherAdminFormView = "list";
  state.teacherFormationId = course.formacaoId;
  state.editingCourseId = id;
  state.courseAdminFormView = "form";
  fillCourseForm(course);
  render();
}

async function saveCourse(event) {
  event.preventDefault();
  await withButtonBusy(event.submitter, "Salvando...", async () => {
    const form = new FormData(event.target);
    const nome = String(form.get("nome") || "").trim();
    const formacaoId = String(form.get("formacaoId") || state.teacherFormationId || "").trim();
    if (!formacaoId) {
      notify("Selecione a formação", "Informe a qual formação este curso pertence.", "warning");
      return;
    }
    const editingCourse = state.courses.find((c) => c.id === state.editingCourseId);
    const foto = await readImageFile(form.get("foto"));
    const dadosFile = form.get("dados");
    const course = editingCourse || { id: makeId(), createdAt: new Date().toISOString() };

    course.formacaoId = formacaoId;
    course.nome = nome;
    course.cargaHoraria = String(form.get("cargaHoraria") || "").trim();
    course.trilha = String(form.get("trilha") || "").trim();
    if (foto) course.foto = foto;
    state.teacherFormationId = formacaoId;

    if (!editingCourse) state.courses.push(course);
    let courseSavedToDb = !db;
    try {
      await persistCourse(course);
      courseSavedToDb = true;
      notify("Curso salvo com sucesso", "Confirmado no banco de dados.");
    } catch (error) {
      saveStored("monitor-courses", state.courses);
      notify("Salvo localmente", `Erro: ${error?.message || "Sem conexão"}`, "warning");
    }
    if (dadosFile && dadosFile.size) {
      if (db && !courseSavedToDb) {
        notify(
          "Base não importada",
          "O curso não foi confirmado no banco. Salve o curso novamente antes de importar a base.",
          "error",
        );
        return;
      }
      state.teacherRows = await loadTeacherRowsFromDb(formacaoId);
      state.teacherFormationId = formacaoId;
      state.selectedCourseId = course.id;
      const imported = await importTeacherCsv(dadosFile);
      if (!imported) return;
    }
    const returnMode = state.courseFormReturnMode;
    state.editingCourseId = null;
    state.courseAdminFormView = "list";
    if (returnMode === "courses-all") {
      state.formationMode = "courses";
      state.teacherFormationId = null;
    } else if (returnMode === "courses-formation") {
      state.formationMode = "courses";
      state.teacherFormationId = formacaoId;
    }
    resetCourseForm();
    render();
    renderCoursesList();
  });
}

function confirmDeleteCourse(id) {
  const course = state.courses.find((c) => c.id === id);
  if (!course) return;
  if (!window.confirm(`Excluir o curso "${course.nome}"? Esta ação não pode ser desfeita.`)) return;
  state.courses = state.courses.filter((c) => c.id !== id);
  saveStored("monitor-courses", state.courses);
  deleteCourseFromDb(id).catch((err) => console.warn("Erro ao excluir curso:", err));
  notify("Curso excluído", `${course.nome} foi removido.`);
  render();
  renderCoursesList();
}

function teacherCourseSummaryHtml(formacaoId, formationRows = []) {
  const courses = state.courses.filter((c) => c.formacaoId === formacaoId);
  if (!courses.length) return `<div class="teacher-course-empty">Nenhum curso vinculado.</div>`;
  const iconBook = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/></svg>`;
  const iconClock = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
  return courses.slice(0, 10).map((course) => {
    const rows = formationRows.filter((r) => r.cursoId === course.id);
    const total = rows.length;
    const done = rows.filter((r) => r.resultado === "Concluído").length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    const trilhaStyle = course.trilha ? TRILHA_COLORS[course.trilha] : null;
    const trilha = course.trilha
      ? `<span class="teacher-course-pill" style="${trilhaStyle ? `background:${trilhaStyle.bg};border-color:${trilhaStyle.border};color:${trilhaStyle.color}` : ""}">${esc(course.trilha)}</span>`
      : "";
    return `
      <div class="teacher-course-mini" title="${esc(`${course.nome} - ${percent}% de conclusão`)}">
        ${course.foto
          ? `<img class="teacher-course-photo" src="${esc(course.foto)}" alt="" />`
          : `<div class="teacher-course-photo teacher-course-photo-fallback">${iconBook}</div>`}
        <div class="teacher-course-copy">
          <strong>${esc(course.nome)}</strong>
          <div class="teacher-course-meta">
            ${trilha}
            ${course.cargaHoraria ? `<span class="teacher-course-pill">${iconClock}${esc(course.cargaHoraria)}</span>` : ""}
          </div>
        </div>
        <span class="teacher-course-percent">${percent}%</span>
      </div>
    `;
  }).join("");
}

function renderTeacherListCards() {
  const container = $("#teacherFormationCards");
  if (!container || state.formationMode !== "teachers-list") return;
  const isAdmin = hasAdminAccess();
  const formations = state.formations.filter((f) => f.id && f.nome && normalize(f.publico || "").includes("professor"));
  const userGre = state.user?.gre;

  container.innerHTML = formations.map((f) => {
    const rows = state.teacherRows
      .filter((r) => (r.formacaoId || state.teacherFormationId) === f.id)
      .filter((r) => isAdmin || !userGre || r.gre === userGre);
    const naplanilha = rows.length;
    const concluidos = rows.filter((r) => r.resultado === "Concluído").length;
    const pct = naplanilha > 0 ? Math.round((concluidos / naplanilha) * 100) : 0;
    const ts = f.lastImportedAt ? `<small class="event-updated">Base atualizada em ${esc(formatDateTime(f.lastImportedAt))}</small>` : "";
    const iconClock = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    const iconCal = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
    const cargaTag = f.cargaHoraria ? `<span class="formation-tag">${iconClock}${esc(f.cargaHoraria)}</span>` : "";
    const periodoTag = (f.inicioFormacao || f.fimFormacao)
      ? `<span class="formation-tag">${iconCal}${f.inicioFormacao ? formatDate(f.inicioFormacao) : ""}${f.inicioFormacao && f.fimFormacao ? " — " : ""}${f.fimFormacao ? formatDate(f.fimFormacao) : ""}</span>`
      : "";
    return `
      <article class="event-card teacher-formation-card">
        ${f.foto ? `<img class="event-photo" src="${esc(f.foto)}" alt="" />` : ""}
        <div class="event-card-top">
          <span class="event-type">Professores</span>
        </div>
        <strong>${esc(f.nome)}</strong>
        ${cargaTag || periodoTag ? `<div class="formation-tags">${cargaTag}${periodoTag}</div>` : ""}
        ${ts}
        <small>${naplanilha.toLocaleString("pt-BR")} na planilha · ${concluidos.toLocaleString("pt-BR")} concluídos</small>
        <div class="event-progress"><span style="width:${Math.min(100,pct)}%"></span></div>
        <div class="event-foot">
          <span>${pct}% conclusão</span>
        </div>
        <div class="card-actions">
          ${isAdmin ? `<button class="mini-button" data-edit-teacher-formation="${esc(f.id)}">Editar</button>` : ""}
          ${isAdmin ? `<button class="mini-button danger-button" data-delete-teacher-formation="${esc(f.id)}">Excluir</button>` : ""}
          <button class="mini-button" data-open-teacher-formation="${esc(f.id)}">Abrir</button>
        </div>
      </article>
    `;
  }).join("") || `<p class="muted" style="padding:24px">Nenhuma formação de professores cadastrada.</p>`;

  container.querySelectorAll("[data-open-teacher-formation]").forEach((b) => {
    b.addEventListener("click", () => openTeacherFormationReport(b.dataset.openTeacherFormation));
  });
  container.querySelectorAll("[data-edit-teacher-formation]").forEach((b) => {
    b.addEventListener("click", () => startEditTeacherFormation(b.dataset.editTeacherFormation));
  });
  container.querySelectorAll("[data-delete-teacher-formation]").forEach((b) => {
    b.addEventListener("click", () => openDeleteFormationDialog(b.dataset.deleteTeacherFormation));
  });
}

function renderTeachersArea() {
  if (state.formationMode !== "teachers") return;

  const isAdmin = hasAdminAccess();
  const strictAdmin = state.user?.perfil === "admin";
  // Header stays at formation level; the course is selected in the filter.
  const headerNameEl = $("#teacherFormationName");
  if (headerNameEl) {
    const selectedFormationIds = getTeacherSelectedFormationIds();
    const formation = state.formations.find((f) => f.id === selectedFormationIds[0]);
    headerNameEl.textContent = selectedFormationIds.length === 1
      ? (formation?.nome || "Formação de Professores 2026")
      : "Relatório de formações";
  }
  const schoolRows = getTeacherSchoolRows();
  const selectedGre = isAdmin ? state.teachersGreFilter : state.user?.gre;
  const allPersonRows = (() => {
    let rows = getFilteredTeacherRowsByReportFilters();
    if (selectedGre && selectedGre !== "todos") rows = rows.filter((r) => r.gre === selectedGre);
    return rows;
  })();

  // Métricas — total esperado: admin = global, regional = só sua GRE
  const schools = state.base?.schools || [];
  const totalEsperado = isAdmin
    ? schools
      .filter((sc) => !selectedGre || selectedGre === "todos" || sc.gre === selectedGre)
      .reduce((s, sc) => s + (sc.professores || 0), 0)
    : schools.filter((sc) => sc.gre === state.user?.gre).reduce((s, sc) => s + (sc.professores || 0), 0);
  const totalInscritos = allPersonRows.length;
  const totalConcluidos = allPersonRows.filter((r) => r.resultado === "Concluído").length;
  const totalEmAndamento = allPersonRows.filter((r) => r.resultado === "Em andamento").length;
  const totalNaoIniciados = allPersonRows.filter((r) => !r.resultado || r.resultado === "Não iniciado").length;
  const pctNaoIniciados = totalInscritos > 0 ? Math.round((totalNaoIniciados / totalInscritos) * 100) : 0;
  const pctGeral = totalInscritos > 0 ? Math.round((totalConcluidos / totalInscritos) * 100) : 0;
  const totalEscolas = schoolRows.length;
  const escolasConcluidas = schoolRows.filter((s) => s.pct >= 75).length;

  const metricsEl = $("#teacherMetrics");
  if (metricsEl) {
    const allItems = [
      { label: "Professores esperados", value: totalEsperado.toLocaleString("pt-BR"), variant: "metric-primary", adminOnly: true, icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>` },
      { label: "Professores inscritos", value: totalInscritos.toLocaleString("pt-BR"), variant: "metric-accent", icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="8" x2="16" y1="13" y2="13"/><line x1="8" x2="16" y1="17" y2="17"/></svg>` },
      { label: "Não iniciados", value: totalNaoIniciados.toLocaleString("pt-BR"), sub: `${pctNaoIniciados}%`, variant: "metric-danger", icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>` },
      { label: "Em andamento", value: totalEmAndamento.toLocaleString("pt-BR"), variant: "metric-wait", icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>` },
      { label: "Concluídos", value: totalConcluidos.toLocaleString("pt-BR"), variant: "metric-ok", icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>` },
      { label: "Taxa de conclusão", value: `${pctGeral}%`, variant: "metric-ok", icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>` },
    ];
    const items = allItems.filter((m) => !m.adminOnly || strictAdmin);
    metricsEl.innerHTML = items.map((m) => `
      <div class="metric panel ${m.variant}">
        <div class="metric-icon">${m.icon}</div>
        <span>${m.label}</span>
        <strong>${m.value}${m.sub ? `<small class="metric-sub">${m.sub}</small>` : ""}</strong>
      </div>
    `).join("");
  }

  renderTeacherReportCourses();

  // Gráfico GRE (admin) / Insight regional
  if (isAdmin) {
    renderTeacherGreBars(schoolRows, strictAdmin);
    $("#teacherRegionalInsight")?.classList.add("hidden");
  } else {
    const insightEl = $("#teacherRegionalInsight");
    if (insightEl) {
      insightEl.classList.remove("hidden");
      const pct = pctGeral;
      const gauge = $("#teacherRegionalGauge");
      if (gauge) {
        const ranges = [
          { color: "#22c55e", test: (v) => v >= 90 },
          { color: "#38bdf8", test: (v) => v >= 50 },
          { color: "#f59e0b", test: (v) => v >= 30 },
          { color: "#ef4444", test: () => true },
        ];
        const color = (ranges.find((r) => r.test(pct)) || ranges.at(-1)).color;
        gauge.style.background = `conic-gradient(${color} 0 ${pct}%, rgba(255,255,255,0.08) ${pct}% 100%)`;
        gauge.style.setProperty("--pie-glow", `${color}70`);
        gauge.style.setProperty("--pie-glow-far", `${color}28`);
      }
      if ($("#teacherRegionalPercent")) $("#teacherRegionalPercent").textContent = `${pct}%`;
      if ($("#teacherRegionalSummary")) $("#teacherRegionalSummary").textContent = `${totalConcluidos.toLocaleString("pt-BR")} de ${totalInscritos.toLocaleString("pt-BR")} professores concluíram`;
      if ($("#teacherRegionalHint")) $("#teacherRegionalHint").textContent = pct >= 100 ? "Todos os professores concluíram!" : `${(totalInscritos - totalConcluidos).toLocaleString("pt-BR")} professores ainda não concluíram.`;
      if ($("#teacherRegionalDoneLabel")) $("#teacherRegionalDoneLabel").textContent = `Concluídos ${totalConcluidos.toLocaleString("pt-BR")}`;
      if ($("#teacherRegionalPendingLabel")) $("#teacherRegionalPendingLabel").textContent = `Pendentes ${(totalInscritos - totalConcluidos).toLocaleString("pt-BR")}`;
    }
  }

  // GRE filter options
  const greFilter = $("#teacherGreFilter");
  if (greFilter && isAdmin) {
    const gres = [...new Set(state.teacherRows.map((r) => r.gre).filter(Boolean))].sort((a, b) => getGreNumber(a) - getGreNumber(b));
    const prev = greFilter.value;
    greFilter.innerHTML = `<option value="todos">GRE: Todas</option>` + gres.map((g) => `<option value="${esc(g)}">${esc(g)}</option>`).join("");
    if (gres.includes(prev)) greFilter.value = prev;
  }

  // View toggle sync
  $$("[data-teacher-view]").forEach((b) => b.classList.toggle("active", b.dataset.teacherView === state.teachersView));

  // Table
  renderTeachersTable();
}

function reportFilterOption({ type, value, label, checked, count = "" }) {
  return `<label class="report-filter-option">
    <input type="checkbox" data-report-draft="${type}" data-value="${esc(value)}" ${checked ? "checked" : ""} />
    <span>${esc(label)}</span>${count !== "" ? `<small>${esc(count)}</small>` : ""}
  </label>`;
}

function filterMenuHtml({ key, label, summary, optionsHtml }) {
  const open = state.teacherReportFilterOpen === key;
  return `
    <div class="report-filter-menu ${open ? "open" : ""}">
      <button class="report-filter-trigger" type="button" data-report-menu="${key}">
        <span>${esc(label)}</span>
        <strong>${esc(summary)}</strong>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      <div class="report-filter-popover">
        <div class="report-filter-options">${optionsHtml}</div>
      </div>
    </div>
  `;
}

let _reportMsCleanup = null;

function renderTeacherReportCourses() {
  const container = $("#teacherReportCourses");
  if (!container || state.formationMode !== "teachers") return;

  if (_reportMsCleanup) { document.removeEventListener("click", _reportMsCleanup); _reportMsCleanup = null; }

  const teacherFormations = state.formations.filter((f) => f.id && normalize(f.publico || "").includes("professor"));
  const draftFormationIds = getTeacherDraftFormationIds();
  const draftFormationSet = new Set(draftFormationIds);
  const formationScopedCourses = state.courses.filter((c) => draftFormationSet.has(c.formacaoId));
  const trilhas = [...new Set(formationScopedCourses.map((c) => c.trilha).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const formationSummary = state.teacherDraftFormationIds.length === 0
    ? "Todas"
    : state.teacherDraftFormationIds.length === 1
      ? (teacherFormations.find((f) => f.id === state.teacherDraftFormationIds[0])?.nome || "1 selecionada")
      : `${state.teacherDraftFormationIds.length} formações`;

  const formationOptions = [
    reportFilterOption({ type: "formation-all", value: "all", label: "Todas", checked: !state.teacherDraftFormationIds.length }),
    ...teacherFormations.map((f) => reportFilterOption({ type: "formation", value: f.id, label: f.nome, checked: state.teacherDraftFormationIds.includes(f.id) })),
  ].join("");

  const courseSummary = state.teacherDraftCourseIds.length === 0
    ? "Todos"
    : state.teacherDraftCourseIds.length === 1
      ? (formationScopedCourses.find((c) => c.id === state.teacherDraftCourseIds[0])?.nome || "1 selecionado")
      : `${state.teacherDraftCourseIds.length} cursos`;

  const trilhaSummary = state.teacherDraftTrilhas.length === 0
    ? "Todas"
    : state.teacherDraftTrilhas.length === 1
      ? state.teacherDraftTrilhas[0]
      : `${state.teacherDraftTrilhas.length} trilhas`;

  const trilhaOptions = [
    reportFilterOption({ type: "trilha-all", value: "all", label: "Todas", checked: !state.teacherDraftTrilhas.length }),
    ...trilhas.map((t) => reportFilterOption({ type: "trilha", value: t, label: t, checked: state.teacherDraftTrilhas.includes(t) })),
  ].join("");

  const courseOptions = [
    reportFilterOption({ type: "course-all", value: "all", label: "Todos", checked: !state.teacherDraftCourseIds.length }),
    ...formationScopedCourses.map((c) => reportFilterOption({ type: "course", value: c.id, label: c.nome, checked: state.teacherDraftCourseIds.includes(c.id) })),
  ].join("");

  container.innerHTML = `
    <div class="report-filter-panel panel">
      <div class="report-filter-head">
        <div>
          <p class="eyebrow">Filtros</p>
          <h3>Recorte do relatório</h3>
        </div>
      </div>
      <div class="report-filter-toolbar">
        ${filterMenuHtml({ key: "formacao", label: "Formação", summary: formationSummary, optionsHtml: formationOptions })}
        ${filterMenuHtml({ key: "trilha", label: "Trilha", summary: trilhaSummary, optionsHtml: trilhaOptions })}
        ${filterMenuHtml({ key: "curso", label: "Curso", summary: courseSummary, optionsHtml: courseOptions })}
        <button class="report-filter-apply" type="button" id="applyTeacherReportFilters">Aplicar filtro</button>
      </div>
    </div>
  `;

  container.querySelectorAll("[data-report-menu]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const key = btn.dataset.reportMenu;
      state.teacherReportFilterOpen = state.teacherReportFilterOpen === key ? "" : key;
      renderTeacherReportCourses();
    });
  });

  container.querySelectorAll("[data-report-draft]").forEach((input) => {
    input.addEventListener("change", (e) => {
      e.stopPropagation();
      updateTeacherReportDraftFilter(input.dataset.reportDraft, input.dataset.value);
      renderTeacherReportCourses();
    });
  });

  _reportMsCleanup = (e) => {
    if (!e.target.closest(".report-filter-menu")) {
      if (state.teacherReportFilterOpen) {
        state.teacherReportFilterOpen = "";
        container.querySelectorAll(".report-filter-menu.open").forEach((m) => m.classList.remove("open"));
      }
    }
  };
  document.addEventListener("click", _reportMsCleanup);

  $("#applyTeacherReportFilters")?.addEventListener("click", applyTeacherReportFilter);
}

function updateTeacherReportDraftFilter(type, value) {
  const toggle = (list, item) => {
    const set = new Set(list || []);
    if (set.has(item)) set.delete(item);
    else set.add(item);
    return [...set];
  };

  if (type === "formation-all") state.teacherDraftFormationIds = [];
  if (type === "formation") {
    state.teacherDraftFormationIds = toggle(state.teacherDraftFormationIds, value);
    if (!state.teacherDraftFormationIds.length) state.teacherDraftFormationIds = [];
    state.teacherDraftCourseIds = state.teacherDraftCourseIds.filter((id) =>
      state.courses.some((course) => course.id === id && getTeacherDraftFormationIds().includes(course.formacaoId))
    );
  }
  if (type === "course-all") state.teacherDraftCourseIds = [];
  if (type === "course") state.teacherDraftCourseIds = toggle(state.teacherDraftCourseIds, value);
  if (type === "trilha-all") state.teacherDraftTrilhas = [];
  if (type === "trilha") state.teacherDraftTrilhas = toggle(state.teacherDraftTrilhas, value);
}

async function applyTeacherReportFilter() {
  state.teacherFilterFormationIds = [...(state.teacherDraftFormationIds || [])];
  state.teacherFilterCourseIds = [...(state.teacherDraftCourseIds || [])];
  state.teacherFilterTrilhas = [...(state.teacherDraftTrilhas || [])];
  state.teacherReportFilterOpen = "";
  state.teacherTablePage = 1;

  state.selectedCourseId = state.teacherFilterCourseIds.length === 1 ? state.teacherFilterCourseIds[0] : null;
  const formationIds = getTeacherSelectedFormationIds();
  state.teacherFormationId = formationIds[0] || state.teacherFormationId;
  showContentLoader();
  try {
    state.teacherRows = await loadTeacherRowsForFormations(formationIds);
  } finally {
    hideContentLoader();
  }
  renderTeachersArea();
}

function renderTeacherGreBars(schoolRows, strictAdmin = true) {
  const byGre = new Map();
  schoolRows.forEach((s) => {
    if (!byGre.has(s.gre)) byGre.set(s.gre, { base: 0, concluidos: 0 });
    const e = byGre.get(s.gre);
    e.base += s.total;
    e.concluidos += s.concluidos;
  });

  const entries = [...byGre.entries()]
    .filter(([gre]) => gre && /\d/.test(gre))
    .map(([gre, item]) => ({
      gre,
      base: item.base,
      concluidos: item.concluidos,
      percent: item.base > 0 ? Math.round((item.concluidos / item.base) * 100) : 0,
    }))
    .sort((a, b) => getGreNumber(a.gre) - getGreNumber(b.gre));

  const ranges = [
    { key: "high",    color: "#22c55e", label: "90% ou mais",   test: (v) => v >= 90 },
    { key: "midHigh", color: "#38bdf8", label: "50% a 89%",     test: (v) => v >= 50 && v < 90 },
    { key: "midLow",  color: "#f59e0b", label: "30% a 49%",     test: (v) => v >= 30 && v < 50 },
    { key: "low",     color: "#ef4444", label: "Abaixo de 30%", test: (v) => v < 30 },
  ];
  const rangeFor = (v) => ranges.find((r) => r.test(v)) || ranges.at(-1);
  const maxPercent = Math.max(100, ...entries.map((e) => e.percent));
  const totalConcluidos = entries.reduce((s, e) => s + e.concluidos, 0);
  const totalBase = entries.reduce((s, e) => s + e.base, 0);
  const overallPercent = totalBase > 0 ? Math.round((totalConcluidos / totalBase) * 100) : 0;
  const pieLabel = "inscritos";

  const barsEl = $("#teacherGreBars");
  if (barsEl) {
    const selectedGre = $("#teacherGreFilter")?.value || "todos";
    barsEl.classList.toggle("has-selection", selectedGre !== "todos");
    barsEl.innerHTML = entries.map((item) => {
      const range = rangeFor(item.percent);
      const fillH = Math.max(4, Math.round((item.percent / maxPercent) * 100));
      const sel = selectedGre === item.gre ? " selected" : "";
      return `
        <button class="goal-bar goal-${range.key}${sel}" type="button" data-teacher-gre="${esc(item.gre)}" title="${esc(`${item.gre}: ${item.concluidos}/${item.base} concluídos (${item.percent}%)`)}">
          <span class="goal-fill" style="height:${fillH}%" data-pct="${item.percent}%">
            <span class="goal-count">${item.concluidos}/${item.base}</span>
          </span>
          <span class="goal-label">${esc(item.gre.replace(" GRE", ""))}<small>GRE</small></span>
        </button>
      `;
    }).join("");

    $$("#teacherGreBars [data-teacher-gre]").forEach((bar) => {
      bar.addEventListener("click", () => {
        const greFilter = $("#teacherGreFilter");
        if (!greFilter) return;
        greFilter.value = greFilter.value === bar.dataset.teacherGre ? "todos" : bar.dataset.teacherGre;
        state.teachersGreFilter = greFilter.value;
        state.teacherTablePage = 1;
        renderTeachersArea();
      });
    });
  }

  const legendEl = $("#teacherGreBarLegend");
  if (legendEl) legendEl.innerHTML = ranges.map((r) => `<span><i style="background:${r.color};border-radius:3px"></i>${r.label}</span>`).join("");

  const pieEl = $("#teacherGrePie");
  if (pieEl) {
    const range = rangeFor(overallPercent);
    pieEl.style.background = `conic-gradient(${range.color} 0 ${overallPercent}%, rgba(255,255,255,0.08) ${overallPercent}% 100%)`;
    pieEl.style.setProperty("--pie-glow", `${range.color}70`);
    pieEl.style.setProperty("--pie-glow-far", `${range.color}28`);
    pieEl.innerHTML = `<strong>${overallPercent}%</strong><span>${totalConcluidos.toLocaleString("pt-BR")}<br>concluídos</span>`;

    let infoEl = $("#teacherGrePieInfo");
    if (!infoEl) {
      infoEl = document.createElement("div");
      infoEl.id = "teacherGrePieInfo";
      infoEl.className = "goal-pie-info";
      pieEl.parentElement.appendChild(infoEl);
    }
    infoEl.innerHTML = `<strong style="color:${range.color}">${totalConcluidos.toLocaleString("pt-BR")}</strong><small>de ${totalBase.toLocaleString("pt-BR")} ${pieLabel}</small>`;
  }
}

function renderTeachersTable() {
  const headEl = $("#teacherTableHead");
  const bodyEl = $("#teacherTable");
  const titleEl = $("#teacherTableTitle");
  const countEl = $("#teacherResultCount");
  if (!headEl || !bodyEl) return;

  const pctColor = (v) => {
    if (v >= 90) return "#22c55e";
    if (v >= 50) return "#38bdf8";
    if (v >= 30) return "#f59e0b";
    return "#ef4444";
  };
  const resultadoPill = (res) => {
    const map = { "Concluído": "ok", "Em andamento": "wait", "Não iniciado": "no" };
    return `<span class="pill ${map[res] || "no"}">${esc(res || "Não iniciado")}</span>`;
  };

  const strictAdmin = state.user?.perfil === "admin";
  const colgroupEl = $("#teacherColgroup");

  if (state.teachersView === "school") {
    const rows = filteredTeacherSchoolRows();
    const { pageItems } = paginateItems(rows, "teacherTablePage");
    if (titleEl) titleEl.textContent = "Por escola";
    if (countEl) countEl.textContent = `${rows.length} escola${rows.length !== 1 ? "s" : ""}`;

    if (colgroupEl) colgroupEl.innerHTML = strictAdmin ? `
      <col style="width:72px">
      <col style="width:96px">
      <col style="width:300px">
      <col style="width:88px">
      <col style="width:100px">
      <col style="width:100px">
      <col style="width:160px">` : `
      <col style="width:72px">
      <col style="width:96px">
      <col style="width:340px">
      <col style="width:100px">
      <col style="width:100px">
      <col style="width:160px">`;

    headEl.innerHTML = `<tr>
      <th>GRE</th><th>INEP</th><th>Escola</th>
      ${strictAdmin ? `<th class="th-num">Esperados</th>` : ""}
      <th class="th-num">Inscritos</th><th class="th-num">Concluídos</th><th class="th-num">Porcentagem</th>
    </tr>`;

    const colspan = strictAdmin ? 7 : 6;
    bodyEl.innerHTML = pageItems.map((s) => {
      const color = pctColor(s.pct);
      return `<tr>
        <td class="td-gre">${esc(s.gre)}</td>
        <td><code class="inep-code">${esc(s.inep)}</code></td>
        <td class="td-escola"><strong>${esc(s.escola)}</strong></td>
        ${strictAdmin ? `<td class="td-num">${s.esperado.toLocaleString("pt-BR")}</td>` : ""}
        <td class="td-num">${s.total.toLocaleString("pt-BR")}</td>
        <td class="td-num">${s.concluidos.toLocaleString("pt-BR")}</td>
        <td>
          <div class="pct-bar-wrap">
            <div class="pct-bar-track">
              <div class="pct-bar-fill" style="width:${Math.min(100, s.pct)}%;background:${color}"></div>
            </div>
            <span class="pct-bar-label" style="color:${color}">${s.pct}%</span>
          </div>
        </td>
      </tr>`;
    }).join("") || `<tr><td colspan="${colspan}" class="empty-row">Nenhuma escola encontrada.</td></tr>`;
    renderPagination("#teacherTablePagination", "teacherTablePage", rows.length, renderTeachersTable);

  } else {
    const rows = filteredTeacherPersonRows();
    const { pageItems } = paginateItems(rows, "teacherTablePage");
    if (titleEl) titleEl.textContent = "Por professor";
    if (countEl) countEl.textContent = `${rows.length} professor${rows.length !== 1 ? "es" : ""}`;

    if (colgroupEl) colgroupEl.innerHTML = `
      <col style="width:72px">
      <col style="width:96px">
      <col style="width:220px">
      <col style="width:240px">
      <col style="width:160px">
      <col style="width:70px">
      <col style="width:130px">`;

    headEl.innerHTML = `<tr>
      <th>GRE</th><th>INEP</th><th>Escola</th><th>Nome</th><th class="th-num">Conclusão</th><th class="th-num">Média</th><th>Resultado</th>
    </tr>`;

    bodyEl.innerHTML = pageItems.map((r) => {
      const color = pctColor(r.conclusao);
      return `<tr>
        <td class="td-gre">${esc(r.gre)}</td>
        <td><code class="inep-code">${esc(r.inep)}</code></td>
        <td class="td-escola" style="font-size:0.8rem">${esc(r.escola)}</td>
        <td><strong>${esc(r.nome)}</strong>${r.email ? `<br><small class="muted">${esc(r.email)}</small>` : ""}</td>
        <td>
          <div class="pct-bar-wrap">
            <div class="pct-bar-track">
              <div class="pct-bar-fill" style="width:${Math.min(100, r.conclusao)}%;background:${color}"></div>
            </div>
            <span class="pct-bar-label" style="color:${color}">${r.conclusao}%</span>
          </div>
        </td>
        <td class="td-num">${r.media > 0 ? r.media.toFixed(1) : "—"}</td>
        <td>${resultadoPill(r.resultado)}</td>
      </tr>`;
    }).join("") || `<tr><td colspan="7" class="empty-row">Nenhum professor encontrado.</td></tr>`;
    renderPagination("#teacherTablePagination", "teacherTablePage", rows.length, renderTeachersTable);
  }
}

function downloadTeacherSpreadsheet() {
  if (!window.XLSX) { notify("Erro", "Biblioteca XLSX não carregada.", "error"); return; }

  let data, headers;
  if (state.teachersView === "school") {
    const rows = filteredTeacherSchoolRows();
    headers = ["GRE", "INEP", "Escola", "Esperados", "Na planilha", "Concluídos", "Porcentagem (%)"];
    data = rows.map((s) => [s.gre, s.inep, s.escola, s.esperado, s.total, s.concluidos, s.pct]);
  } else {
    const rows = filteredTeacherPersonRows();
    headers = ["GRE", "INEP", "Escola", "Nome", "E-mail", "Conclusão (%)", "Média da Nota", "Resultado"];
    data = rows.map((r) => [r.gre, r.inep, r.escola, r.nome, r.email, r.conclusao, r.media, r.resultado]);
  }

  const ws = window.XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(wb, ws, "Professores");
  window.XLSX.writeFile(wb, "professores_export.xlsx");
}

// ─── FIM PROFESSORES ─────────────────────────────────────────────────────────

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
