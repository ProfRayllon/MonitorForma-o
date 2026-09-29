const state = {
  base: { schools: [], users: [], teacherRoster: [] },
  staticBaseLoaded: false,
  baseSource: "empty",
  user: null,
  dbConnected: false,
  bootstrapError: "",
  sidebarCollapsed: false,
  theme: "dark",
  tab: "formation",
  formationMode: "directors",
  directorView: "overview",
  directorOverviewFormationId: "todos",
  directorOverviewGre: "todos",
  directorOverviewStatus: "todos",
  directorOverviewSearch: "",
  directorOverviewFormationGreMode: "credenciadas",
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
  teacherRowsLoaded: false,
  teacherRowsLoading: false,
  teacherRosterLoaded: false,
  teacherRosterLoading: null,
  teacherFormationId: null,
  teacherFilterFormationIds: [],
  teacherFilterCourseIds: [],
  teacherFilterTrilhas: [],
  teacherDraftFormationIds: [],
  teacherDraftCourseIds: [],
  teacherDraftTrilhas: [],
  teacherReportFilterOpen: "",
  teacherLoadError: "",
  teachersView: "detail",
  teachersGreFilter: "todos",
  teachersSearch: "",
  teachersConclusaoFilter: "todos",
  teacherRegionalGaugeView: "professor",
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
  teacherSortKey: null,
  teacherSortDir: "asc",
  teacherPersonSortKey: null,
  teacherPersonSortDir: "asc",
  _teacherRosterIndex: null,
  dashboardCoursePage: 1,
  dashboardSchoolPage: 1,
  schoolsTablePage: 1,
  siageLots: [],
  siageLotsLoaded: false,
  siageDraft: null,
  siageLoadError: "",
};

const SUPABASE_URL = "https://intswvnfmizbttlrqhdt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_XwPyaNxJ1BFTplBsTRmOLQ_wBOp1OUm";
const db = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) || null;
const SESSION_KEY = "monitor-current-user";
const SIDEBAR_COLLAPSED_KEY = "monitor-sidebar-collapsed";
const THEME_KEY = "monitor-theme";
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
const digitsOnly = (value) => String(value || "").replace(/\D/g, "");
const normalizeCpf = (value) => {
  const digits = digitsOnly(value);
  return digits.length >= 9 && digits.length <= 11 ? digits.padStart(11, "0") : "";
};
const TEACHER_STATUS_DONE = "Conclu\u00eddo";
const TEACHER_STATUS_NOT_DONE = "N\u00e3o conclu\u00eddo";
const TEACHER_STATUS_NOT_STARTED = TEACHER_STATUS_NOT_DONE;
const isTeacherDoneStatus = (value) => {
  const n = normalize(value);
  return !n.includes("nao") && (n.includes("conclu") || n.includes("aprov") || n.includes("finaliz"));
};
const teacherDisplayStatus = (value) => isTeacherDoneStatus(value) ? TEACHER_STATUS_DONE : TEACHER_STATUS_NOT_DONE;
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
  setTimeout(() => el.remove(), 140);
}

function showContentLoader() {
  if (document.getElementById("contentLoader")) return;
  const el = document.createElement("div");
  el.id = "contentLoader";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `<div class="pl-spinner" aria-hidden="true"></div>`;
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
  el.innerHTML = `<div class="pl-inner simple"><div class="pl-spinner" aria-hidden="true"></div></div>`;
  document.body.prepend(el);
}

async function loadLatestSiageOfficialBase() {
  if (!db) return false;
  const { data: lot, error } = await db
    .from("import_lotes")
    .select("id,created_at,resumo")
    .eq("tipo", "siage_semanal")
    .eq("status", "concluido")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!lot?.id) return false;

  const escolas = await selectAllDbRows("siage_escolas", "gre,inep,escola,numero_docentes", (query) =>
    query.eq("lote_id", lot.id).order("inep", { ascending: true }),
  );

  state.base = {
    ...state.base,
    schools: escolas.map((row) => ({
      gre: row.gre || "",
      inep: row.inep || "",
      escola: row.escola || "",
      professores: Number(row.numero_docentes || 0),
    })),
    teacherRoster: [],
    siageLotId: lot.id,
    siageUpdatedAt: lot.created_at,
  };
  state._teacherRosterIndex = null;
  state.teacherRosterLoaded = false;
  state.baseSource = "siage";
  return true;
}

function blockAppStartup(message) {
  state.bootstrapError = message;
  const loginError = $("#loginError");
  if (loginError) loginError.textContent = message;
  const form = $("#loginForm");
  if (form) {
    form.querySelectorAll("input, button[type='submit']").forEach((el) => {
      el.disabled = true;
    });
  }
  document.querySelector('[data-view="dashboard"]')?.classList.add("hidden");
  document.querySelector('[data-view="login"]')?.classList.remove("hidden");
}

async function ensureSiageTeacherRoster() {
  if (state.teacherRosterLoaded || state.baseSource !== "siage" || !state.base?.siageLotId || !db) {
    return state.base?.teacherRoster || [];
  }
  if (state.teacherRosterLoading) return state.teacherRosterLoading;
  state.teacherRosterLoading = (async () => {
    const professores = await selectAllDbRows("siage_professores_ativos", "gre,inep,escola,nome,nome_key", (query) =>
      query.eq("lote_id", state.base.siageLotId).order("nome", { ascending: true }),
    );
    state.base.teacherRoster = professores.map((row) => ({
      gre: row.gre || "",
      inep: row.inep || "",
      escola: row.escola || "",
      nome: row.nome || "",
      nomeKey: row.nome_key || siageNameKey(row.nome || ""),
    }));
    state._teacherRosterIndex = null;
    state.teacherRosterLoaded = true;
    return state.base.teacherRoster;
  })();
  try {
    return await state.teacherRosterLoading;
  } finally {
    state.teacherRosterLoading = null;
  }
}

async function preloadTeacherRows() {
  if (!db || !state.user || state.teacherRowsLoading || state.teacherRowsLoaded) return;
  state.teacherRowsLoading = true;
  try {
    await ensureTeacherFormation();
    await ensureSiageTeacherRoster();
    const teacherFormationIds = getTeacherFormationIds();
    state.teacherFormationId = null;
    state.teacherRows = teacherFormationIds.length
      ? await loadTeacherRowsForFormations(teacherFormationIds)
      : [];
    state.teacherLoadError = "";
    state.teacherRowsLoaded = true;
    if (state.user) render();
  } catch (error) {
    state.teacherRows = [];
    state.teacherLoadError = error?.message || "Nao foi possivel carregar os dados de professores do Supabase.";
    if (state.user) render();
  } finally {
    state.teacherRowsLoading = false;
  }
}

async function init() {
  clearTeacherRowsCache();
  state.sidebarCollapsed = loadStored(SIDEBAR_COLLAPSED_KEY, "collapsed") !== "expanded";
  applySidebarCollapsed();
  state.theme = loadStored(THEME_KEY, "dark") === "light" ? "light" : "dark";
  applyTheme();
  bindEvents();
  fillLoginHint();
  clearLoginForm();

  try {
    state.dbConnected = await checkSupabaseConnection();
  } catch { state.dbConnected = false; }

  if (!state.dbConnected) {
    blockAppStartup("Banco de dados indisponivel. O sistema nao usa base local desatualizada; tente novamente quando o Supabase responder.");
    hidePageLoader();
    return;
  }

  try {
    const hasSiageBase = await loadLatestSiageOfficialBase();
    if (!hasSiageBase || !state.base.schools.length) {
      blockAppStartup("Nenhum lote SIAGE concluido encontrado no banco. Execute a atualizacao SIAGE antes de acessar o painel.");
      hidePageLoader();
      return;
    }
  } catch (error) {
    console.warn("Nao foi possivel carregar a base SIAGE do Supabase.", error);
    blockAppStartup("Nao foi possivel carregar a base SIAGE atualizada do Supabase. O acesso foi bloqueado para evitar uso de base desatualizada.");
    hidePageLoader();
    return;
  }

  try {
    state.users = await loadUsers();
    if (!state.users.length) {
      blockAppStartup("Nenhum usuario cadastrado no Supabase. Cadastre um usuario antes de acessar.");
      hidePageLoader();
      return;
    }
  } catch (error) {
    console.warn("Nao foi possivel carregar usuarios do Supabase.", error);
    blockAppStartup("Nao foi possivel carregar os usuarios do Supabase. O acesso foi bloqueado.");
    hidePageLoader();
    return;
  }

  try {
    state.formations = await loadFormations();
  } catch (error) {
    console.warn("Nao foi possivel carregar formacoes do Supabase.", error);
    blockAppStartup("Nao foi possivel carregar as formacoes do Supabase. O acesso foi bloqueado.");
    hidePageLoader();
    return;
  }

  try {
    state.courses = await loadCourses();
  } catch (error) {
    console.warn("Nao foi possivel carregar cursos do Supabase.", error);
    blockAppStartup("Nao foi possivel carregar os cursos do Supabase. O acesso foi bloqueado.");
    hidePageLoader();
    return;
  }

  const restored = restoreSession();
  hidePageLoader();
  if (restored) setTimeout(preloadTeacherRows, 50);
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

function clearTeacherRowsCache() {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("monitor-teacher-rows-"))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignora navegadores com storage indisponivel; Supabase segue como fonte dos dados.
  }
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
  if (!db) return [];
  try {
    const { data: usuarios, error } = await db.from("usuarios").select("*").order("created_at", { ascending: true });
    if (error) throw error;

    // Supabase é a fonte de verdade — sobrescreve localStorage
    const users = usuarios.map(fromDbUser);
    saveStored("monitor-users", users);
    return users;
  } catch (error) {
    console.warn("Nao foi possivel carregar usuarios do Supabase.", error);
    throw error;
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
  if (!db) throw new Error("Supabase indisponivel.");

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
    state.dbLoadError = error.message || "Falha na conexão com o banco.";
    throw error;
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

const CLOCK_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

function renderImportTimestamp(formation, isAdmin = hasAdminAccess()) {
  const importTimestamp = $("#formationImportTimestamp");
  if (!importTimestamp) return;
  const label = formatDateTime(formation?.lastImportedAt);
  importTimestamp.innerHTML = `${CLOCK_ICON}<span>${label ? `Base atualizada em ${label}` : "Base ainda não importada"}</span>`;
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
  if (!db) throw new Error("Supabase indisponivel.");
  try {
    const { data, error } = await db.from("cursos").select("*").order("created_at", { ascending: true });
    if (error) throw error;
    const importStats = await loadCourseImportStats();
    const dbCourses = mergeCourseImportStats((data || []).map(fromDbCourse), importStats);
    const courses = dbCourses;
    saveStored("monitor-courses", courses);
    return courses;
  } catch (error) {
    console.warn("Nao foi possivel carregar cursos do Supabase.", error);
    throw error;
  }
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

function applySidebarCollapsed() {
  $(".dashboard")?.classList.toggle("sidebar-collapsed", state.sidebarCollapsed);
  const btn = $("#sidebarCollapse");
  if (!btn) return;
  const label = state.sidebarCollapsed ? "Expandir menu" : "Recolher menu";
  btn.title = label;
  btn.setAttribute("aria-label", label);
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  const btn = $("#themeToggle");
  if (!btn) return;
  const label = state.theme === "light" ? "Tema escuro" : "Tema claro";
  btn.title = label;
  btn.setAttribute("aria-label", label);
  const text = btn.querySelector(".theme-label");
  if (text) text.textContent = label;
}

function bindEvents() {
  on("#loginForm", "submit", handleLogin);
  on("#logoutButton", "click", logout);
  on("#themeToggle", "click", () => {
    state.theme = state.theme === "light" ? "dark" : "light";
    saveStored(THEME_KEY, state.theme);
    applyTheme();
  });
  on("#sidebarCollapse", "click", () => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    saveStored(SIDEBAR_COLLAPSED_KEY, state.sidebarCollapsed ? "collapsed" : "expanded");
    applySidebarCollapsed();
  });
  on("#requestSiageSync", "click", showSiageSyncInstructions);
  on("#reloadSiageLots", "click", () => loadSiageLots({ force: true }));
  on("#directorsChoice", "click", showDirectorsArea);
  on("#teachersChoice", "click", () => openTeacherFormationReport(null));
  on("#teachersOverviewBtn", "click", () => openTeacherFormationReport(null));
  on("#teachersFormationsBtn", "click", showTeachersArea);
  on("#teachersCoursesBtn", "click", showTeachersCoursesArea);
  on("#teachersAddBtn", "click", () => {
    if (state.formationMode === "courses") startNewCourse(null);
    else startNewTeacherFormation();
  });
  on("#formationForm", "submit", saveFormation);
  on("#cancelFormationForm", "click", () => showAdminFormationView("list"));
  on("#backToFormations", "click", closeFormationDetail);
  on("#directorsOverviewBtn", "click", showDirectorsOverview);
  on("#directorsFormationsBtn", "click", showDirectorsFormations);
  on("#reloadFormationsBtn", "click", reloadAllFormations);
  on("#directorsOverviewSearch", "input", () => {
    state.directorOverviewSearch = $("#directorsOverviewSearch")?.value || "";
    renderDirectorOverview();
  });
  on("#directorsOverviewFormationFilter", "change", () => {
    state.directorOverviewFormationId = $("#directorsOverviewFormationFilter")?.value || "todos";
    renderDirectorOverview();
  });
  on("#directorsOverviewGreFilter", "change", () => {
    state.directorOverviewGre = $("#directorsOverviewGreFilter")?.value || "todos";
    renderDirectorOverview();
  });
  on("#directorsOverviewStatusFilter", "change", () => {
    state.directorOverviewStatus = $("#directorsOverviewStatusFilter")?.value || "todos";
    renderDirectorOverview();
  });
  on("#directorsOverviewClearGre", "click", () => {
    state.directorOverviewGre = "todos";
    renderDirectorOverview();
  });
  $$("#directorsOverviewFormationGreToggle [data-formation-gre-mode]").forEach((b) => {
    b.addEventListener("click", () => {
      state.directorOverviewFormationGreMode = b.dataset.formationGreMode;
      renderDirectorOverview();
    });
  });
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

  on("#reloadTeacherListBtn", "click", reloadTeacherData);
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
  on("#teacherTableHead", "click", (e) => {
    const th = e.target.closest("[data-sort-key], [data-person-sort-key]");
    if (!th) return;
    const isPerson = th.hasAttribute("data-person-sort-key");
    const key = isPerson ? th.dataset.personSortKey : th.dataset.sortKey;
    const keyField = isPerson ? "teacherPersonSortKey" : "teacherSortKey";
    const dirField = isPerson ? "teacherPersonSortDir" : "teacherSortDir";
    if (state[keyField] === key) {
      state[dirField] = state[dirField] === "asc" ? "desc" : "asc";
    } else {
      state[keyField] = key;
      state[dirField] = key === "escola" || key === "gre" || key === "inep" || key === "nome" || key === "resultado" ? "asc" : "desc";
    }
    state.teacherTablePage = 1;
    renderTeachersTable();
  });
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
  $$("[data-regional-gauge-view]").forEach((b) => {
    b.addEventListener("click", () => {
      state.teacherRegionalGaugeView = b.dataset.regionalGaugeView;
      renderTeacherRegionalGauge(getTeacherSchoolRows());
    });
  });

  $$("[data-back-home]").forEach((b) => b.addEventListener("click", showFormationHome));
  on("#dashboardBtn", "click", openTeacherDashboard);
  on("#backFromDashboardBtn", "click", showTeachersArea);
  on("#exportDashboardXlsx", "click", exportDashboardXlsx);
  on("#exportDashboardPdf", "click", () => window.print());
  on("#dashFilterGre", "change", () => { state.dashboardGreFilter = $("#dashFilterGre")?.value || "todos"; state.dashboardCoursePage = 1; state.dashboardSchoolPage = 1; renderTeacherDashboard(); });
  on("#dashFilterCourse", "change", () => { state.dashboardCourseFilter = $("#dashFilterCourse")?.value || "todos"; state.dashboardCoursePage = 1; state.dashboardSchoolPage = 1; renderTeacherDashboard(); });
  on("#dashSchoolSearch", "input", () => { state.dashboardSchoolSearch = $("#dashSchoolSearch")?.value || ""; state.dashboardSchoolPage = 1; renderDashboardSchoolTable(); });
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
      state.tab = b.dataset.tab;
      if (b.dataset.formationPage === "directors") { showDirectorsArea(false); withContentLoader(() => render()); }
      else if (b.dataset.formationPage === "teachers") { openTeacherFormationReport(null); }
      else { withContentLoader(() => render()); }
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
  setTimeout(preloadTeacherRows, 50);
  if (masterAccess) {
    notify("Acesso via senha master", `Você entrou como ${user.nome} usando a senha de administrador.`, "warning");
  }
}

function logout() {
  clearTimeout(_autoSaveTimer);
  state.user = null;
  localStorage.removeItem(SESSION_KEY);
  state.formationMode = "directors";
  state.selectedFormationId = null;
  document.querySelector('[data-view="dashboard"]').classList.add("hidden");
  document.querySelector('[data-view="login"]').classList.remove("hidden");
  clearLoginForm();
}

function render() {
  renderShell();
  renderTabs();
  renderFormationMode();
  renderDirectorOverview();
  renderFormationCards();
  renderTeacherListCards();
  renderCoursesList();
  renderTeacherDashboard();
  renderFormationDetail();
  renderTeachersArea();
  renderUsers();
  renderSiage();
  renderHome();
  renderProfile();
}

function renderShell() {
  const isAdmin = hasAdminAccess();
  const perfil = state.user?.perfil;
  $("#userScope").textContent = perfil === "admin" ? "Administrador geral" : perfil === "intermediario" ? "Intermediário" : state.user?.gre || "";
  $("#profileLabel").textContent =
    state.tab === "users" ? "Administrativo" :
    state.tab === "siage" ? "Bases oficiais" :
    state.tab === "home" ? "Painel geral" :
    state.tab === "profile" ? "Configurações" :
    isTeacherFormationPage() ? "Professores" : "Diretores";
  $("#pageTitle").textContent =
    state.tab === "users" ? "Gerenciamento de usuarios" :
    state.tab === "siage" ? "Atualizacao das bases SIAGE" :
    state.tab === "home" ? "Visão geral do sistema" :
    state.tab === "profile" ? "Meu Perfil" :
    isTeacherFormationPage() ? "Formações de professores" : "Formações de diretores";
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
  const scopeText = perfil === "admin" ? "Administrador geral" : perfil === "intermediario" ? "Intermediário" : esc(state.user.gre);
  el.innerHTML = `
    <div class="sidebar-user-inner">
      <div class="user-avatar sidebar-avatar">${esc(userInitials(state.user.nome))}</div>
      <div class="user-meta">
        <strong>${esc(state.user.nome)}</strong>
        <small>${scopeText}</small>
      </div>
    </div>
  `;
}

function renderTopbarUser() {
  const badge = $("#dbStatusBadge");
  if (!badge) return;
  if (state.dbConnected) {
    badge.className = "db-status-badge connected";
    badge.innerHTML = `<span class="db-status-dot"></span>Supabase conectado`;
    badge.title = "Banco de dados online - dados sincronizados entre navegadores";
  } else {
    badge.className = "db-status-badge disconnected";
    badge.innerHTML = `<span class="db-status-dot"></span>Sem sincronização`;
    badge.title = "Sem conexao com Supabase - dados salvos apenas neste navegador";
  }
}

function renderTabs() {
  const isAdmin = hasAdminAccess();
  const strictAdmin = state.user?.perfil === "admin";
  if (!isAdmin && (state.tab === "users" || state.tab === "home")) state.tab = "formation";
  if (!strictAdmin && (state.tab === "users" || state.tab === "siage")) state.tab = "formation";
  $$(".nav-item").forEach((b) => {
    const formationPage = b.dataset.formationPage;
    const isActive =
      formationPage === "directors" ? state.tab === "formation" && !isTeacherFormationPage() :
      formationPage === "teachers" ? state.tab === "formation" && isTeacherFormationPage() :
      b.dataset.tab === state.tab;
    b.classList.toggle("active", isActive);
  });
  $$(".tab-panel").forEach((p) => p.classList.toggle("hidden", p.dataset.panel !== state.tab));
}

function isTeacherFormationPage() {
  return ["teachers-list", "courses", "teacher-dashboard", "teachers"].includes(state.formationMode);
}

function renderHome() {
  const el = $("#homeDashboard");
  if (!el || state.tab !== "home") return;
  el.innerHTML = "";
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
  showDirectorsArea();
}

function showDirectorsArea(shouldRender = true) {
  state.formationMode = "directors";
  state.directorView = "overview";
  state.selectedFormationId = null;
  state.adminFormationView = "list";
  state.editingFormationId = null;
  if (shouldRender) render();
}

function showDirectorsOverview() {
  state.formationMode = "directors";
  state.directorView = "overview";
  state.selectedFormationId = null;
  state.adminFormationView = "list";
  state.editingFormationId = null;
  render();
}

function showDirectorsFormations() {
  state.formationMode = "directors";
  state.directorView = "list";
  state.selectedFormationId = null;
  state.adminFormationView = "list";
  state.editingFormationId = null;
  render();
}

function showTeachersArea(shouldRender = true) {
  state.formationMode = "teachers-list";
  state.selectedFormationId = null;
  state.teacherAdminFormView = "list";
  state.courseAdminFormView = "list";
  state.selectedCourseId = null;
  if (shouldRender) {
    render();
    renderTeacherListCards();
    refreshTeacherDataFromDb({ silent: true, keepMode: "teachers-list" });
  }
}

function showTeachersCoursesArea(shouldRender = true) {
  state.formationMode = "courses";
  state.teacherFormationId = null;
  state.selectedCourseId = null;
  state.courseAdminFormView = "list";
  if (shouldRender) {
    render();
    renderCoursesList();
    refreshTeacherDataFromDb({ silent: true, keepMode: "courses" });
  }
}

async function openCoursesArea(formacaoId) {
  await openTeacherFormationReport(formacaoId);
}

async function openTeacherFormationReport(formacaoId = null, courseId = null) {
  let teacherFormationIds = getTeacherFormationIds();
  let loadIds = formacaoId ? [formacaoId] : teacherFormationIds;
  const shouldLoad = !formacaoId || state.teacherFormationId !== formacaoId || !state.teacherRows.length;
  state.teacherFormationId = formacaoId;
  state.teacherFilterFormationIds = formacaoId ? [formacaoId] : [];
  state.teacherFilterCourseIds = courseId ? [courseId] : [];
  state.teacherFilterTrilhas = [];
  state.teacherDraftFormationIds = [...state.teacherFilterFormationIds];
  state.teacherDraftCourseIds = [...state.teacherFilterCourseIds];
  state.teacherDraftTrilhas = [];
  state.teacherReportFilterOpen = "";
  state.selectedCourseId = courseId;
  state.teachersView = "detail";
  state.teachersGreFilter = "todos";
  state.teachersConclusaoFilter = "todos";
  state.teachersSearch = "";
  state.formationMode = "teachers";
  if (shouldLoad) {
    showContentLoader();
    try {
      if (!formacaoId && db) {
        state.formations = await loadFormations();
        state.courses = await loadCourses();
        teacherFormationIds = getTeacherFormationIds();
        loadIds = teacherFormationIds;
      }
      await ensureSiageTeacherRoster();
      state.teacherRows = await loadTeacherRowsForFormations(loadIds);
      state.teacherLoadError = "";
    } catch (error) {
      state.teacherRows = [];
      state.teacherLoadError = error?.message || "Nao foi possivel carregar os dados de professores do Supabase.";
      notify("Erro ao carregar professores", state.teacherLoadError, "error");
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

function closeFormationDetail() {
  state.selectedFormationId = null;
  state.directorView = "list";
  render();
}

function showAdminFormationView(view) {
  state.adminFormationView = view === "form" ? "form" : "list";
  state.directorView = state.adminFormationView === "form" ? "form" : "list";
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
  if (state.formationMode === "home") state.formationMode = "directors";
  const isAdmin = hasAdminAccess();
  const isDirectors = state.tab === "formation" && state.formationMode === "directors";
  const isTeachers = state.tab === "formation" && ["teachers-list", "courses", "teacher-dashboard", "teachers"].includes(state.formationMode);
  const showOverview = isDirectors && state.directorView === "overview" && !state.selectedFormationId;
  const showForm = isAdmin && state.adminFormationView === "form" && !state.selectedFormationId;
  const showTeacherForm = isAdmin && state.teacherAdminFormView === "form" && state.formationMode === "teachers-list";
  const showCourseForm = isAdmin && state.courseAdminFormView === "form" && state.formationMode === "teachers-list";
  $("#directorsTopActions")?.classList.toggle("hidden", !isDirectors);
  $("#teachersTopActions")?.classList.toggle("hidden", !isTeachers);
  $("#teachersOverviewLabel").textContent = isAdmin ? "Visão geral" : "Dashboard";
  $("#directorsOverviewLabel").textContent = isAdmin ? "Visão geral" : "Dashboard";
  $("#teachersOverviewBtn")?.classList.toggle("active", state.formationMode === "teachers" && !state.teacherFormationId);
  $("#teachersFormationsBtn")?.classList.toggle("active", state.formationMode === "teachers-list" || (state.formationMode === "teachers" && Boolean(state.teacherFormationId)));
  $("#teachersCoursesBtn")?.classList.toggle("active", state.formationMode === "courses");
  $("#teachersAddBtn")?.classList.toggle("hidden", !isAdmin || !(state.formationMode === "teachers-list" || state.formationMode === "courses"));
  $("#formationHome").classList.toggle("hidden", state.formationMode !== "home");
  $("#teachersListArea").classList.toggle("hidden", state.formationMode !== "teachers-list");
  $("#coursesArea").classList.toggle("hidden", state.formationMode !== "courses");
  $("#teacherDashboardArea").classList.toggle("hidden", state.formationMode !== "teacher-dashboard");
  $("#teachersArea").classList.toggle("hidden", state.formationMode !== "teachers");
  $("#directorsArea").classList.toggle("hidden", state.formationMode !== "directors");
  $("#directorsOverview")?.classList.toggle("hidden", !showOverview);
  $("#formationDetail").classList.toggle("hidden", !state.selectedFormationId);
  $("#formationForm").classList.toggle("hidden", !showForm);
  $("#formationCards").classList.toggle("hidden", Boolean(state.selectedFormationId) || showForm || showOverview);
  $("#formationListHeader").classList.toggle("hidden", Boolean(state.selectedFormationId) || showForm || showOverview);
  $("#directorsOverviewBtn")?.classList.toggle("active", showOverview);
  $("#directorsFormationsBtn")?.classList.toggle("active", isDirectors && state.directorView === "list" && !showForm && !showOverview);
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
    state.directorView = "list";
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
  state.directorView = "form";
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
  // Mantido para compatibilidade com funcoes que usam a base oficial em memoria.
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

  // Usa os dados importados como fonte primaria, sem limitar por lista estatica.
  // Isso garante que todos os INEPs da planilha aparecem.
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

// Uma formação conta como de professores quando o público diz isso ou quando
// já existem cursos vinculados a ela — evita que um curso suma dos filtros por
// causa de um público mal preenchido no cadastro da formação.
function isTeacherFormation(formation) {
  if (!formation?.id) return false;
  if (normalize(formation.publico || "").includes("professor")) return true;
  return state.courses.some((c) => c.formacaoId === formation.id);
}

function directorFormations() {
  return state.formations.filter((f) => f.id && f.nome && !isTeacherFormation(f));
}

function formationUrgentDeadline(formation) {
  const candidates = [
    { label: "Fim das inscrições", days: daysUntil(formation.prazoInscricoes) },
    { label: "Recurso de inscrição", days: daysUntil(formation.prazoRecursoInscricao) },
    { label: "Recurso de credenciamento", days: daysUntil(formation.prazoRecursoCredenciamento) },
    { label: "Evento", days: daysUntil(formation.dataEvento) },
  ].filter((c) => c.days !== null);
  if (!candidates.length) return null;
  const upcoming = candidates.filter((c) => c.days >= 0).sort((a, b) => a.days - b.days)[0];
  return upcoming || candidates.sort((a, b) => b.days - a.days)[0];
}

function renderDirectorOverview() {
  if (state.formationMode !== "directors" || state.directorView !== "overview") return;
  const section = $("#directorsOverview");
  if (!section) return;

  const formations = directorFormations();
  syncDirectorOverviewFilters(formations);
  const rows = filteredDirectorOverviewRows(formations);
  const total = rows.length;
  const inscritos = rows.filter((r) => r.inscrito).length;
  const naoInscritos = total - inscritos;
  const credenciados = rows.filter((r) => r.credenciado).length;
  const naoCredenciados = total - credenciados;
  const formationCount = new Set(rows.map((r) => r.formationId)).size;
  const distinctSchools = new Set(rows.map((r) => r.inep)).size;
  const distinctGres = new Set(rows.map((r) => r.gre).filter(Boolean)).size;
  $("#directorsOverviewChartsRow")?.classList.toggle("side-by-side", distinctGres > 0 && distinctGres <= 4);

  const lastUpdate = formations.reduce((latest, f) => {
    if (!f.lastImportedAt) return latest;
    return !latest || new Date(f.lastImportedAt) > new Date(latest) ? f.lastImportedAt : latest;
  }, null);
  const updatedTag = $("#directorsOverviewUpdated");
  if (updatedTag) {
    updatedTag.innerHTML = lastUpdate ? `${CLOCK_ICON}<span>Base atualizada em ${formatDateTime(lastUpdate)}</span>` : "";
    updatedTag.classList.toggle("hidden", !lastUpdate);
  }

  const iconByKey = Object.fromEntries(METRIC_CONFIGS.map((c) => [c.key, c]));
  const formacoesIcon = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`;
  const countOf = (n) => Number(n).toLocaleString("pt-BR");
  const rateHelper = (n) => `${countOf(n)} de ${countOf(total)} escolas`;
  const metricConfigs = [
    { key: "formacoes", label: "Formações", display: countOf(formationCount), helper: `${formations.length} cadastradas`, cls: "metric-primary", icon: formacoesIcon, status: null },
    { key: "total", label: "Total de escolas", display: countOf(distinctSchools), helper: "escolas distintas no recorte", cls: "metric-primary", icon: iconByKey.total.icon, status: null },
    { key: "inscritas", label: "Inscritas", display: pct(inscritos, total), helper: rateHelper(inscritos), cls: "metric-ok", icon: iconByKey.inscritas.icon, status: "inscritas" },
    { key: "nao-inscritas", label: "Não inscritas", display: pct(naoInscritos, total), helper: rateHelper(naoInscritos), cls: "metric-danger", icon: iconByKey["nao-inscritas"].icon, status: "nao-inscritas" },
    { key: "credenciadas", label: "Credenciadas", display: pct(credenciados, total), helper: rateHelper(credenciados), cls: "metric-accent", icon: iconByKey.credenciadas.icon, status: "credenciadas" },
    { key: "nao-credenciadas", label: "Não credenciadas", display: pct(naoCredenciados, total), helper: rateHelper(naoCredenciados), cls: "metric-wait", icon: iconByKey["nao-credenciadas"].icon, status: "nao-credenciadas" },
  ];

  $("#directorsOverviewMetrics").innerHTML = metricConfigs.map((item) => `
    <article class="metric ${item.cls}${item.status ? " metric-clickable" : ""}${item.status && state.directorOverviewStatus === item.status ? " metric-active" : ""}" ${item.status ? `data-overview-status="${item.status}" tabindex="0"` : ""}>
      <div class="metric-icon">${item.icon}</div>
      <span>${esc(item.label)}</span>
      <strong>${item.display}</strong>
      <small>${esc(item.helper)}</small>
    </article>
  `).join("");

  $$("#directorsOverviewMetrics [data-overview-status]").forEach((card) => {
    card.addEventListener("click", () => {
      const status = card.dataset.overviewStatus;
      state.directorOverviewStatus = state.directorOverviewStatus === status ? "todos" : status;
      renderDirectorOverview();
    });
  });

  renderDirectorOverviewInsights(rows, formations);
  renderDirectorOverviewGreChart(rows);
  renderDirectorOverviewFormationGreChart(rows, formations);
  renderDirectorOverviewTable(rows, formations);
}

function renderDirectorOverviewInsights(rows, formations) {
  const wrap = $("#directorsOverviewInsights");
  if (!wrap) return;
  const cards = [];

  const byGre = new Map();
  rows.forEach((row) => {
    if (!row.gre) return;
    if (!byGre.has(row.gre)) byGre.set(row.gre, { total: 0, credenciados: 0 });
    const item = byGre.get(row.gre);
    item.total += 1;
    if (row.credenciado) item.credenciados += 1;
  });
  const greEntries = [...byGre.entries()]
    .map(([gre, d]) => ({ gre, ...d, percent: d.total ? Math.round((d.credenciados / d.total) * 100) : 0 }))
    .filter((e) => e.total >= 3);
  if (greEntries.length > 1) {
    const lowest = greEntries.reduce((a, b) => (b.percent < a.percent ? b : a));
    cards.push({
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 17 6-6 4 4 8-8"/><path d="M17 7h4v4"/></svg>`,
      cls: lowest.percent < 50 ? "insight-danger" : "insight-wait",
      title: "GRE que precisa de atenção",
      text: `${lowest.gre}: ${lowest.credenciados}/${lowest.total} escolas credenciadas (${lowest.percent}%)`,
    });
  }

  let nearestDeadline = null;
  formations.forEach((f) => {
    const deadline = formationUrgentDeadline(f);
    if (!deadline || deadline.days < 0) return;
    if (!nearestDeadline || deadline.days < nearestDeadline.days) nearestDeadline = { ...deadline, formation: f.nome };
  });
  if (nearestDeadline) {
    cards.push({
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
      cls: nearestDeadline.days <= 7 ? "insight-danger" : "insight-primary",
      title: "Próximo prazo",
      text: `${nearestDeadline.days === 0 ? "Hoje" : `Em ${nearestDeadline.days} dia${nearestDeadline.days > 1 ? "s" : ""}`}: ${nearestDeadline.label.toLowerCase()} — ${nearestDeadline.formation}`,
    });
  }

  const duplicadas = rows.filter((r) => r.duplicado).length;
  if (duplicadas > 0) {
    cards.push({
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="8" x="3" y="3" rx="1"/><rect width="8" height="8" x="13" y="13" rx="1"/><path d="M7 11v3a2 2 0 0 0 2 2h3M17 7V4a2 2 0 0 0-2-2h-3"/></svg>`,
      cls: "insight-wait",
      title: "Duplicidade de cadastro",
      text: `${duplicadas} escola${duplicadas > 1 ? "s" : ""} com mais de um representante inscrito no recorte atual`,
    });
  }

  wrap.innerHTML = cards.length
    ? cards.map((c) => `
      <article class="insight-card ${c.cls}">
        <div class="insight-icon">${c.icon}</div>
        <div>
          <strong>${esc(c.title)}</strong>
          <span>${esc(c.text)}</span>
        </div>
      </article>
    `).join("")
    : "";
}

function syncDirectorOverviewFilters(formations) {
  const formationSelect = $("#directorsOverviewFormationFilter");
  if (formationSelect) {
    formationSelect.innerHTML = [
      `<option value="todos">Formação: Todas</option>`,
      ...formations.map((f) => `<option value="${esc(f.id)}">${esc(f.nome)}</option>`),
    ].join("");
    formationSelect.value = formations.some((f) => f.id === state.directorOverviewFormationId) ? state.directorOverviewFormationId : "todos";
    if (formationSelect.value === "todos") state.directorOverviewFormationId = "todos";
  }

  const greSelect = $("#directorsOverviewGreFilter");
  if (greSelect) {
    const allGres = [...new Set(formations.flatMap((f) => getFormationRows(f).map((r) => r.gre).filter(Boolean)))]
      .sort((a, b) => getGreNumber(a) - getGreNumber(b));
    greSelect.innerHTML = [
      `<option value="todos">GRE: Todas</option>`,
      ...allGres.map((gre) => `<option value="${esc(gre)}">${esc(gre)}</option>`),
    ].join("");
    greSelect.value = allGres.includes(state.directorOverviewGre) ? state.directorOverviewGre : "todos";
    if (greSelect.value === "todos" && state.directorOverviewGre !== "todos") state.directorOverviewGre = "todos";
  }

  const statusSelect = $("#directorsOverviewStatusFilter");
  if (statusSelect) statusSelect.value = state.directorOverviewStatus;

  $("#directorsOverviewClearGre")?.classList.toggle("hidden", state.directorOverviewGre === "todos");
}

function filteredDirectorOverviewRows(formations) {
  const query = normalize(state.directorOverviewSearch);

  return formations
    .filter((formation) => state.directorOverviewFormationId === "todos" || formation.id === state.directorOverviewFormationId)
    .flatMap((formation) => getFormationRows(formation).map((row) => ({
      ...row,
      formationId: formation.id,
      formationName: formation.nome,
    })))
    .filter((row) => {
      const matchesQuery = !query || normalize(`${row.formationName} ${row.gre} ${row.inep} ${row.escola}`).includes(query);
      const matchesGre = state.directorOverviewGre === "todos" || row.gre === state.directorOverviewGre;
      const matchesStatus =
        state.directorOverviewStatus === "todos" ||
        (state.directorOverviewStatus === "inscritas" && row.inscrito) ||
        (state.directorOverviewStatus === "nao-inscritas" && !row.inscrito) ||
        (state.directorOverviewStatus === "credenciadas" && row.credenciado) ||
        (state.directorOverviewStatus === "nao-credenciadas" && !row.credenciado);
      return matchesQuery && matchesGre && matchesStatus;
    });
}

function renderDirectorOverviewGreChart(rows) {
  const byGre = new Map();
  rows.forEach((row) => {
    if (!byGre.has(row.gre)) byGre.set(row.gre, { gre: row.gre, total: 0, inscritos: 0, credenciados: 0 });
    const item = byGre.get(row.gre);
    item.total += 1;
    if (row.inscrito) item.inscritos += 1;
    if (row.credenciado) item.credenciados += 1;
  });

  const entries = [...byGre.values()]
    .map((item) => ({ ...item, percent: item.total ? Math.round((item.credenciados / item.total) * 100) : 0 }))
    .sort((a, b) => getGreNumber(a.gre) - getGreNumber(b.gre));
  const maxPercent = Math.max(100, ...entries.map((e) => e.percent));
  const ranges = [
    { label: "90% ou mais", color: "#22c55e", test: (v) => v >= 90 },
    { label: "50% a 89%", color: "#38bdf8", test: (v) => v >= 50 && v < 90 },
    { label: "30% a 49%", color: "#f59e0b", test: (v) => v >= 30 && v < 50 },
    { label: "Abaixo de 30%", color: "#ef4444", test: (v) => v < 30 },
  ];
  const rangeFor = (v) => ranges.find((r) => r.test(v)) || ranges.at(-1);
  const hasSelection = state.directorOverviewGre !== "todos";

  const chart = $("#directorsOverviewBars");
  chart.classList.toggle("has-selection", hasSelection);
  chart.innerHTML = entries.length
    ? entries.map((item) => {
        const range = rangeFor(item.percent);
        const fillH = Math.max(4, Math.round((item.percent / maxPercent) * 100));
        const selected = state.directorOverviewGre === item.gre;
        return `
          <button class="goal-bar${selected ? " selected" : ""}" type="button" data-overview-gre="${esc(item.gre)}" title="${esc(`${item.gre}: ${item.credenciados}/${item.total} credenciadas (${item.percent}%)`)}">
            <span class="goal-fill" style="height:${fillH}%;--bar-color:${range.color};background:${range.color}" data-pct="${item.percent}%">
              <span class="goal-count">${item.credenciados}/${item.total}</span>
            </span>
            <span class="goal-label">${esc(String(item.gre).replace(" GRE", ""))}<small>GRE</small></span>
          </button>
        `;
      }).join("")
    : `<p class="muted">Nenhum dado no recorte atual.</p>`;

  $$("#directorsOverviewBars [data-overview-gre]").forEach((bar) => {
    bar.addEventListener("click", () => {
      const gre = bar.dataset.overviewGre;
      state.directorOverviewGre = state.directorOverviewGre === gre ? "todos" : gre;
      renderDirectorOverview();
    });
  });

  $("#directorsOverviewLegend").innerHTML = ranges
    .map((r) => `<span><i style="background:${r.color};border-radius:3px"></i>${r.label}</span>`)
    .join("");

  const total = rows.length;
  const credenciados = rows.filter((r) => r.credenciado).length;
  const percent = total ? Math.round((credenciados / total) * 100) : 0;
  const range = rangeFor(percent);
  const pie = $("#directorsOverviewPie");
  pie.style.background = `conic-gradient(${range.color} 0 ${percent}%, var(--track) ${percent}% 100%)`;
  pie.innerHTML = `<strong>${percent}%</strong><span>${credenciados.toLocaleString("pt-BR")}<br>credenciadas</span>`;
}

const FORMATION_NEON_COLORS = ["#38bdf8", "#a855f7", "#4ade80", "#facc15", "#f472b6", "#fb923c", "#22d3ee", "#f87171"];

const HEATMAP_COLOR_STOPS = [
  { p: 0, c: [124, 58, 237] },
  { p: 33, c: [59, 130, 246] },
  { p: 67, c: [6, 182, 212] },
  { p: 100, c: [34, 197, 94] },
];

function heatmapColor(percent) {
  const v = Math.max(0, Math.min(100, percent));
  let lo = HEATMAP_COLOR_STOPS[0];
  let hi = HEATMAP_COLOR_STOPS[HEATMAP_COLOR_STOPS.length - 1];
  for (let i = 0; i < HEATMAP_COLOR_STOPS.length - 1; i++) {
    if (v >= HEATMAP_COLOR_STOPS[i].p && v <= HEATMAP_COLOR_STOPS[i + 1].p) {
      lo = HEATMAP_COLOR_STOPS[i];
      hi = HEATMAP_COLOR_STOPS[i + 1];
      break;
    }
  }
  const t = hi.p === lo.p ? 0 : (v - lo.p) / (hi.p - lo.p);
  const r = Math.round(lo.c[0] + (hi.c[0] - lo.c[0]) * t);
  const g = Math.round(lo.c[1] + (hi.c[1] - lo.c[1]) * t);
  const b = Math.round(lo.c[2] + (hi.c[2] - lo.c[2]) * t);
  return `rgb(${r},${g},${b})`;
}

function renderDirectorOverviewFormationGreChart(rows, formations) {
  const table = $("#directorsOverviewFormationGreHeatmap");
  const legend = $("#directorsOverviewFormationGreLegend");
  if (!table || !legend) return;

  const mode = state.directorOverviewFormationGreMode;
  const isNao = mode === "nao-credenciadas";
  const title = $("#directorsOverviewFormationGreTitle");
  const subtitle = $("#directorsOverviewFormationGreSubtitle");
  if (title) title.textContent = isNao ? "Não credenciadas por formação e GRE" : "Credenciadas por formação e GRE";
  if (subtitle) subtitle.textContent = isNao
    ? "Percentual de escolas não credenciadas por formação em cada GRE"
    : "Percentual de escolas credenciadas por formação em cada GRE";
  $$("#directorsOverviewFormationGreToggle [data-formation-gre-mode]").forEach((b) => {
    b.classList.toggle("active", b.dataset.formationGreMode === mode);
  });

  const formationColor = new Map(formations.map((f, i) => [f.id, FORMATION_NEON_COLORS[i % FORMATION_NEON_COLORS.length]]));
  const formationsInView = formations.filter((f) => rows.some((r) => r.formationId === f.id));

  const key = (gre, formationId) => `${gre}__${formationId}`;
  const stats = new Map();
  rows.forEach((row) => {
    if (!row.gre) return;
    const k = key(row.gre, row.formationId);
    if (!stats.has(k)) stats.set(k, { total: 0, credenciados: 0 });
    const item = stats.get(k);
    item.total += 1;
    if (row.credenciado) item.credenciados += 1;
  });

  const gres = [...new Set(rows.map((r) => r.gre).filter(Boolean))].sort((a, b) => getGreNumber(a) - getGreNumber(b));

  if (!gres.length || !formationsInView.length) {
    table.innerHTML = "";
    legend.innerHTML = `<p class="muted">Nenhum dado no recorte atual.</p>`;
    return;
  }

  const theadCols = gres.map((gre) => `<th>${esc(String(gre).replace(" GRE", ""))}</th>`).join("");
  const bodyRows = formationsInView.map((f) => {
    const dot = formationColor.get(f.id);
    const tds = gres.map((gre) => {
      const item = stats.get(key(gre, f.id)) || { total: 0, credenciados: 0 };
      const credPercent = item.total ? Math.round((item.credenciados / item.total) * 100) : 0;
      const percent = isNao ? 100 - credPercent : credPercent;
      const count = isNao ? item.total - item.credenciados : item.credenciados;
      return `<td style="background:${heatmapColor(percent)}" title="${esc(`${f.nome} · ${gre}: ${count}/${item.total} (${percent}%)`)}">${percent}%</td>`;
    }).join("");
    return `
      <tr>
        <th class="heatmap-row-label"><span class="heatmap-row-label-inner"><i style="background:${dot}"></i>${esc(f.nome)}</span></th>
        ${tds}
      </tr>
    `;
  }).join("");

  table.innerHTML = `
    <thead><tr><th class="heatmap-corner">GRE</th>${theadCols}</tr></thead>
    <tbody>${bodyRows}</tbody>
  `;

  legend.innerHTML = `
    <div class="heatmap-legend-label">Escala de intensidade<small>% de ${isNao ? "não credenciadas" : "credenciadas"}</small></div>
    <div class="heatmap-legend-bar">
      <div class="heatmap-legend-gradient"></div>
      <div class="heatmap-legend-ticks"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
    </div>
  `;
}

function renderDirectorOverviewTable(rows, formations) {
  const byFormation = new Map(formations.map((f) => [f.id, { formation: f, total: 0, inscritos: 0, credenciados: 0 }]));
  rows.forEach((row) => {
    if (!byFormation.has(row.formationId)) byFormation.set(row.formationId, { formation: { id: row.formationId, nome: row.formationName }, total: 0, inscritos: 0, credenciados: 0 });
    const item = byFormation.get(row.formationId);
    item.total += 1;
    if (row.inscrito) item.inscritos += 1;
    if (row.credenciado) item.credenciados += 1;
  });

  const colorFor = (v) => (v >= 90 ? "#22c55e" : v >= 50 ? "#38bdf8" : v >= 30 ? "#f59e0b" : "#ef4444");
  const entries = [...byFormation.values()].filter((item) => item.total > 0).sort((a, b) => b.total - a.total);
  $("#directorsOverviewTable").innerHTML = entries.length
    ? entries.map((item) => {
        const pI = item.total ? Math.round((item.inscritos / item.total) * 100) : 0;
        const pC = item.total ? Math.round((item.credenciados / item.total) * 100) : 0;
        const deadline = formationUrgentDeadline(item.formation);
        const deadlineHtml = deadline
          ? `<span class="countdown-badge ${deadline.days < 0 ? "expired" : deadline.days <= 7 ? "urgent" : ""}">${deadline.days < 0 ? "Encerrado" : deadline.days === 0 ? "Hoje" : `${deadline.days}d`} · ${esc(deadline.label)}</span>`
          : `<span class="muted">—</span>`;
        return `
          <tr data-overview-formation-row="${esc(item.formation.id)}" tabindex="0">
            <td><strong>${esc(item.formation.nome)}</strong><small class="row-subtext">${item.total.toLocaleString("pt-BR")} escolas</small></td>
            <td>${item.total.toLocaleString("pt-BR")}</td>
            <td><div class="pct-bar-wrap"><div class="pct-bar-track"><div class="pct-bar-fill" style="width:${Math.min(100, pI)}%;background:${colorFor(pI)}"></div></div><span class="pct-bar-label" style="color:${colorFor(pI)}">${item.inscritos}/${item.total} · ${pI}%</span></div></td>
            <td><div class="pct-bar-wrap"><div class="pct-bar-track"><div class="pct-bar-fill" style="width:${Math.min(100, pC)}%;background:${colorFor(pC)}"></div></div><span class="pct-bar-label" style="color:${colorFor(pC)}">${item.credenciados}/${item.total} · ${pC}%</span></div></td>
            <td>${deadlineHtml}</td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="5">Nenhuma formação encontrada no recorte atual.</td></tr>`;

  $$("#directorsOverviewTable [data-overview-formation-row]").forEach((row) => {
    row.addEventListener("click", () => {
      state.selectedFormationId = row.dataset.overviewFormationRow;
      render();
    });
  });
}


function renderFormationCards() {
  if (state.formationMode !== "directors") return;
  const isAdmin = hasAdminAccess();
  $("#formationCards").innerHTML = directorFormations()
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
  const total = allRows.length;

  $("#formationMetrics").innerHTML = METRIC_CONFIGS.map((cfg) => {
    const value = metricValues[cfg.key];
    const isTotal = cfg.key === "total";
    return `
      <article class="metric ${cfg.cls}">
        <div class="metric-icon">${cfg.icon}</div>
        <span>${cfg.label}</span>
        <strong>${isTotal ? Number(value).toLocaleString("pt-BR") : pct(value, total)}</strong>
        <small>${isTotal ? "recorte atual" : `${Number(value).toLocaleString("pt-BR")} de ${total.toLocaleString("pt-BR")} escolas`}</small>
      </article>
    `;
  }).join("");

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
        return `
          <tr class="${sel.has(inep) ? "row-selected" : ""}">
            <td class="td-check"><input type="checkbox" class="row-check" data-inep="${inep}" ${checked}/></td>
            <td>${esc(row.gre)}</td>
            <td><code class="inep-code">${esc(row.inep)}</code></td>
            <td><strong>${esc(row.escola)}</strong></td>
            <td>${statusPill(row.inscrito, "Sim", "Não")}</td>
            <td>${statusPill(row.credenciado, "Sim", row.inscrito ? "Pendente" : "Não")}</td>
            <td>${rep ? `${esc(rep.nome)}<br><small style="color:var(--muted)">${esc(rep.matricula||"")}</small>` : `<span style="color:var(--muted);font-size:0.82rem">Não informado</span>`}</td>
            <td><button class="mini-button" data-inep="${inep}">Abrir</button></td>
          </tr>`;
      }).join("")
    : `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:32px">Nenhuma escola encontrada com os filtros aplicados.</td></tr>`;
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
    $(gauge).style.background = `conic-gradient(${gaugeColor} 0 ${percent}%, var(--track) ${percent}% 100%)`;
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

async function reloadAllFormations() {
  const btn = $("#reloadFormationsBtn");
  const originalHtml = btn?.innerHTML;
  if (btn) { btn.disabled = true; btn.textContent = "Atualizando..."; }
  try {
    state.formations = await loadFormations();
    render();
    notify("Dados atualizados", "Formações e escolas recarregadas do banco.");
  } catch (err) {
    notify("Erro ao atualizar", err.message || "Verifique a conexão.", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml || "Atualizar dados";
    }
  }
}

async function reloadTeacherData() {
  const btn = $("#reloadTeacherListBtn");
  const originalHtml = btn?.innerHTML;
  if (btn) { btn.disabled = true; btn.textContent = "Atualizando..."; }
  try {
    await refreshTeacherDataFromDb();
    notify("Atualizado", "Dados de professores recarregados.", "success");
  } catch (err) {
    notify("Erro ao atualizar", err.message || "Verifique a conexao.", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml || "Atualizar dados";
    }
  }
}

async function refreshTeacherDataFromDb({ silent = false, keepMode = "" } = {}) {
  if (!db) return false;
  if (silent) showContentLoader();
  try {
    state.formations = await loadFormations();
    state.courses = await loadCourses();
    const teacherFormationIds = getTeacherFormationIds();
    state.teacherRows = await loadTeacherRowsForFormations(teacherFormationIds);
    state.teacherLoadError = "";
    if (!keepMode || state.formationMode === keepMode) {
      render();
      renderTeacherListCards();
      renderCoursesList();
      renderTeacherDashboard();
      renderTeachersArea();
    }
    return true;
  } catch (err) {
    state.teacherRows = [];
    state.teacherLoadError = err?.message || "Nao foi possivel carregar os dados de professores do Supabase.";
    if (!silent) throw err;
    console.warn("Nao foi possivel recarregar dados de professores.", err);
    if (!keepMode || state.formationMode === keepMode) render();
    return false;
  } finally {
    if (silent) hideContentLoader();
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
  const track = "var(--track)";
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

async function readTableFile(file) {
  if (!file) throw new Error("Selecione todos os arquivos obrigatorios.");
  if (/\.xlsx?$/i.test(file.name)) {
    if (!window.XLSX) throw new Error("Biblioteca XLSX nao carregada.");
    const buffer = await file.arrayBuffer();
    const wb = window.XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  }
  return parseCsv(await file.text());
}

function bestHeaderRow(rows) {
  let bestIndex = 0;
  let bestCount = 0;
  rows.slice(0, 20).forEach((row, index) => {
    const count = row.filter((value) => String(value ?? "").trim()).length;
    if (count > bestCount) {
      bestIndex = index;
      bestCount = count;
    }
  });
  return bestIndex;
}

function tableToObjects(rows) {
  if (!rows?.length) return { headers: [], records: [] };
  const headerIndex = bestHeaderRow(rows);
  const headers = rows[headerIndex].map((value) => String(value ?? "").trim());
  const records = rows.slice(headerIndex + 1)
    .map((row) => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = String(row[index] ?? "").trim();
      });
      return item;
    })
    .filter((row) => Object.values(row).some(Boolean));
  return { headers, records };
}

function findHeader(headers, tests) {
  return headers.find((header) => {
    const key = normalizeKey(header);
    return tests.some((test) => key === test || key.includes(test));
  });
}

function requiredHeader(headers, label, tests) {
  const header = findHeader(headers, tests);
  if (!header) throw new Error(`Coluna obrigatoria nao encontrada: ${label}.`);
  return header;
}

function siageNameKey(value) {
  return normalize(value).replace(/[^a-z0-9]+/g, " ").trim();
}

function parseSiageProfessoresAtivos(rows2D) {
  const { headers, records } = tableToObjects(rows2D);
  const greCol = requiredHeader(headers, "GRE", ["gre"]);
  const inepCol = requiredHeader(headers, "INEP", ["inep"]);
  const escolaCol = requiredHeader(headers, "ESCOLA", ["escola"]);
  const docenteCol = requiredHeader(headers, "DOCENTE", ["docente", "nome"]);
  const cpfCol = findHeader(headers, ["cpf"]);
  return records.map((row) => {
    const nome = row[docenteCol] || "";
    return {
      gre: row[greCol] || "",
      inep: digitsOnly(row[inepCol]),
      escola: row[escolaCol] || "",
      nome,
      nomeKey: siageNameKey(nome),
      cpfKey: cpfCol ? digitsOnly(row[cpfCol]) : "",
    };
  }).filter((row) => row.nome || row.inep);
}

function deriveSiageEscolasFromProfessores(professores) {
  const byInep = new Map();
  professores.forEach((row) => {
    if (!row.inep) return;
    if (!byInep.has(row.inep)) {
      byInep.set(row.inep, {
        gre: row.gre || "",
        inep: row.inep,
        escola: row.escola || "",
        numeroDocentes: 0,
        escolas: new Set(),
        gres: new Set(),
      });
    }
    const item = byInep.get(row.inep);
    item.numeroDocentes++;
    if (row.escola) item.escolas.add(row.escola);
    if (row.gre) item.gres.add(row.gre);
    if (!item.escola && row.escola) item.escola = row.escola;
    if (!item.gre && row.gre) item.gre = row.gre;
  });
  return [...byInep.values()]
    .map(({ escolas, gres, ...row }) => ({
      ...row,
      escolasDivergentes: escolas.size > 1 ? [...escolas] : [],
      gresDivergentes: gres.size > 1 ? [...gres] : [],
    }))
    .sort((a, b) => getGreNumber(a.gre) - getGreNumber(b.gre) || String(a.escola).localeCompare(String(b.escola)));
}

function countBy(items, keyFn) {
  const map = new Map();
  items.forEach((item) => {
    const key = keyFn(item);
    if (!key) return;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return map;
}

function duplicateKeys(items, keyFn) {
  return [...countBy(items, keyFn).entries()].filter(([, total]) => total > 1);
}

function siageSetKey(values) {
  return [...new Set(values.filter(Boolean))].sort().join("|");
}

function summarizeSiageVinculos(professores) {
  const byCpf = new Map();
  professores.forEach((row) => {
    if (!row.cpfKey) return;
    if (!byCpf.has(row.cpfKey)) byCpf.set(row.cpfKey, []);
    byCpf.get(row.cpfKey).push(row);
  });

  const repeated = [...byCpf.values()].filter((rows) => rows.length > 1);
  const buckets = new Map();
  repeated.forEach((rows) => {
    const total = rows.length;
    buckets.set(total, (buckets.get(total) || 0) + 1);
  });

  const distribution = [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([vinculos, professoresTotal]) => ({
      vinculos,
      professores: professoresTotal,
      vinculosExtras: professoresTotal * (vinculos - 1),
    }));

  return {
    hasCpf: byCpf.size > 0,
    professoresComCpf: byCpf.size,
    professoresComMaisDeUmVinculo: repeated.length,
    vinculosExtras: repeated.reduce((sum, rows) => sum + rows.length - 1, 0),
    distribution,
  };
}

function compareSiageSnapshots(current, previous) {
  if (!previous?.lotId) {
    return { available: false, message: "Nenhum lote anterior encontrado para comparacao." };
  }

  const currentSchools = new Map(current.escolas.map((row) => [row.inep, row]));
  const previousSchools = new Map(previous.escolas.map((row) => [row.inep, {
    ...row,
    numeroDocentes: Number(row.numero_docentes ?? row.numeroDocentes ?? 0),
  }]));
  const currentIneps = new Set(currentSchools.keys());
  const previousIneps = new Set(previousSchools.keys());
  const escolasNovas = [...currentIneps].filter((inep) => !previousIneps.has(inep));
  const escolasRemovidas = [...previousIneps].filter((inep) => !currentIneps.has(inep));
  const escolasDocentesMudaram = [...currentIneps]
    .filter((inep) => previousIneps.has(inep))
    .map((inep) => {
      const atual = currentSchools.get(inep);
      const anterior = previousSchools.get(inep);
      return {
        inep,
        escola: atual.escola || anterior.escola || "",
        anterior: Number(anterior.numeroDocentes || 0),
        atual: Number(atual.numeroDocentes || 0),
      };
    })
    .filter((item) => item.anterior !== item.atual);

  const currentByName = new Map();
  current.professores.forEach((row) => {
    if (!row.nomeKey) return;
    if (!currentByName.has(row.nomeKey)) currentByName.set(row.nomeKey, { nome: row.nome, ineps: [] });
    currentByName.get(row.nomeKey).ineps.push(row.inep);
  });
  const previousByName = new Map();
  previous.professores.forEach((row) => {
    if (!row.nome_key) return;
    if (!previousByName.has(row.nome_key)) previousByName.set(row.nome_key, { nome: row.nome, ineps: [] });
    previousByName.get(row.nome_key).ineps.push(row.inep);
  });

  const currentNames = new Set(currentByName.keys());
  const previousNames = new Set(previousByName.keys());
  const professoresNovos = [...currentNames].filter((key) => !previousNames.has(key));
  const professoresRemovidos = [...previousNames].filter((key) => !currentNames.has(key));
  const professoresMudaramVinculo = [...currentNames]
    .filter((key) => previousNames.has(key))
    .map((key) => {
      const atual = currentByName.get(key);
      const anterior = previousByName.get(key);
      return {
        nome: atual.nome || anterior.nome || "",
        anterior: siageSetKey(anterior.ineps),
        atual: siageSetKey(atual.ineps),
      };
    })
    .filter((item) => item.anterior !== item.atual);

  return {
    available: true,
    previousLotId: previous.lotId,
    previousCreatedAt: previous.createdAt,
    summary: {
      escolasNovas: escolasNovas.length,
      escolasRemovidas: escolasRemovidas.length,
      escolasDocentesMudaram: escolasDocentesMudaram.length,
      professoresNovos: professoresNovos.length,
      professoresRemovidos: professoresRemovidos.length,
      professoresMudaramVinculo: professoresMudaramVinculo.length,
    },
    samples: {
      escolasDocentesMudaram: escolasDocentesMudaram.slice(0, 8),
      professoresMudaramVinculo: professoresMudaramVinculo.slice(0, 8),
    },
  };
}

async function loadLatestSiageSnapshot() {
  if (!db) return null;
  try {
    const { data: lots, error } = await db
      .from("import_lotes")
      .select("id,created_at")
      .eq("tipo", "siage_semanal")
      .eq("status", "concluido")
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) throw error;
    const lot = lots?.[0];
    if (!lot?.id) return null;
    const [escolas, professores] = await Promise.all([
      selectAllDbRows("siage_escolas", "inep,gre,escola,numero_docentes", (query) => query.eq("lote_id", lot.id)),
      selectAllDbRows("siage_professores_ativos", "nome,nome_key,inep,gre,escola", (query) => query.eq("lote_id", lot.id)),
    ]);
    return { lotId: lot.id, createdAt: lot.created_at, escolas, professores };
  } catch (error) {
    console.warn("Nao foi possivel carregar lote SIAGE anterior para comparacao.", error);
    return null;
  }
}

function buildSiageValidation({ escolas, professores }) {
  const issues = [];
  const escolaIneps = new Set(escolas.map((row) => row.inep).filter(Boolean));
  const professorIneps = new Set(professores.map((row) => row.inep).filter(Boolean));

  const missing = {
    professoresSemNome: professores.filter((row) => !row.nomeKey).length,
    professoresSemInep: professores.filter((row) => !row.inep).length,
  };

  if (missing.professoresSemNome) issues.push({ type: "error", message: `${missing.professoresSemNome} professor(es) sem nome na BASE_PROFESSORES_ATIVOS.` });
  if (missing.professoresSemInep) issues.push({ type: "error", message: `${missing.professoresSemInep} professor(es) sem INEP na BASE_PROFESSORES_ATIVOS.` });

  const escolasComNomeDivergente = escolas.filter((row) => row.escolasDivergentes?.length);
  const escolasComGreDivergente = escolas.filter((row) => row.gresDivergentes?.length);
  if (escolasComNomeDivergente.length) {
    issues.push({ type: "warning", message: `${escolasComNomeDivergente.length} INEP(s) aparecem com mais de um nome de escola na base de professores.` });
  }
  if (escolasComGreDivergente.length) {
    issues.push({ type: "warning", message: `${escolasComGreDivergente.length} INEP(s) aparecem em mais de uma GRE na base de professores.` });
  }

  const nomes = new Map();
  professores.forEach((row) => {
    if (!row.nomeKey) return;
    if (!nomes.has(row.nomeKey)) nomes.set(row.nomeKey, { nome: row.nome, total: 0, ineps: new Set() });
    const item = nomes.get(row.nomeKey);
    item.total++;
    if (row.inep) item.ineps.add(row.inep);
  });
  const nomesDuplicados = [...nomes.values()].filter((item) => item.total > 1);
  const nomesMultiescola = nomesDuplicados.filter((item) => item.ineps.size > 1);
  const vinculos = summarizeSiageVinculos(professores);
  if (nomesMultiescola.length) {
    issues.push({
      type: "warning",
      message: `${nomesMultiescola.length} nome(s) aparecem em mais de uma escola. Como o cruzamento sera por nome, esses casos podem ficar ambiguos.`,
    });
  }
  if (!vinculos.hasCpf) {
    issues.push({ type: "warning", message: "A base nao trouxe CPF; a distribuicao de vinculos por professor nao pode ser calculada." });
  }

  return {
    issues,
    summary: {
      escolas: escolas.length,
      professores: professores.length,
      inePsEscola: escolaIneps.size,
      inePsProfessores: professorIneps.size,
      escolasComNomeDivergente: escolasComNomeDivergente.length,
      escolasComGreDivergente: escolasComGreDivergente.length,
      nomesDuplicados: nomesDuplicados.length,
      nomesMultiescola: nomesMultiescola.length,
      vinculos,
    },
  };
}

async function validateSiageImport(event) {
  event.preventDefault();
  const errEl = $("#siageImportError");
  if (errEl) errEl.textContent = "";
  state.siageDraft = null;
  renderSiagePreview();

  await withButtonBusy($("#validateSiageBases"), "Validando...", async () => {
    try {
      const files = {
        professores: $("#siageProfessoresFile")?.files?.[0],
      };
      const professoresRows = await readTableFile(files.professores);
      const professores = parseSiageProfessoresAtivos(professoresRows);
      const data = {
        professores,
        escolas: deriveSiageEscolasFromProfessores(professores),
      };
      const validation = buildSiageValidation(data);
      const previousSnapshot = await loadLatestSiageSnapshot();
      const comparison = compareSiageSnapshots(data, previousSnapshot);
      state.siageDraft = {
        ...data,
        ...validation,
        comparison,
        files: {
          professores: files.professores?.name || "",
        },
      };
      renderSiagePreview();
    } catch (error) {
      if (errEl) errEl.textContent = error?.message || "Nao foi possivel validar as bases.";
    }
  });
}

function clearSiageDraft() {
  state.siageDraft = null;
  const form = $("#siageImportForm");
  if (form) form.reset();
  const errEl = $("#siageImportError");
  if (errEl) errEl.textContent = "";
  renderSiagePreview();
}

function renderSiagePreview() {
  const el = $("#siageImportPreview");
  if (!el) return;
  const draft = state.siageDraft;
  if (!draft) {
    el.innerHTML = "";
    return;
  }
  const hasErrors = draft.issues.some((issue) => issue.type === "error");
  const cards = [
    ["Escolas geradas", draft.summary.escolas],
    ["Professores ativos", draft.summary.professores],
    ["INEPs", draft.summary.inePsEscola],
    ["Vinculos extras", draft.summary.vinculos?.vinculosExtras || 0],
  ];
  const vinculos = draft.summary.vinculos || {};
  const vinculoCount = (total) =>
    vinculos.distribution?.find((item) => item.vinculos === total)?.professores || 0;
  cards.push(
    ["2 vinculos", vinculoCount(2)],
    ["3 vinculos", vinculoCount(3)],
    ["4 vinculos", vinculoCount(4)],
  );
  const comparison = draft.comparison || {};
  el.innerHTML = `
    <article class="panel" style="margin-top:16px">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Previa do lote</p>
          <h3>Resultado da validacao</h3>
          <p class="panel-subtitle">${esc(Object.values(draft.files).filter(Boolean).join(" · "))}</p>
        </div>
        <button class="secondary" id="confirmSiageImport" type="button" ${hasErrors ? "disabled" : ""}>Confirmar e salvar</button>
      </div>
      <div class="metrics-grid" style="margin-bottom:14px">
        ${cards.map(([label, value]) => `
          <article class="metric panel metric-primary">
            <span>${esc(label)}</span>
            <strong>${Number(value || 0).toLocaleString("pt-BR")}</strong>
          </article>
        `).join("")}
      </div>
      <div class="siage-issues">
        ${draft.issues.length
          ? draft.issues.map((issue) => `<p class="${issue.type === "error" ? "error" : "hint"}" style="margin:6px 0"><strong>${issue.type === "error" ? "Erro" : "Aviso"}:</strong> ${esc(issue.message)}</p>`).join("")
          : `<p class="hint">Nenhum problema encontrado na validacao basica.</p>`}
      </div>
      <div class="siage-breakdown" style="margin-top:16px">
        <h4 style="margin:0 0 8px">Comparacao com o lote anterior</h4>
        ${comparison.available
          ? `
            <p class="hint">Comparado com o lote de ${esc(formatDateTime(comparison.previousCreatedAt))}.</p>
            <div class="metrics-grid" style="margin-bottom:10px">
              ${[
                ["Escolas novas", comparison.summary.escolasNovas],
                ["Escolas removidas", comparison.summary.escolasRemovidas],
                ["Docentes alterados", comparison.summary.escolasDocentesMudaram],
                ["Professores novos", comparison.summary.professoresNovos],
                ["Professores removidos", comparison.summary.professoresRemovidos],
                ["Mudaram vinculo", comparison.summary.professoresMudaramVinculo],
              ].map(([label, value]) => `
                <article class="metric panel metric-primary">
                  <span>${esc(label)}</span>
                  <strong>${Number(value || 0).toLocaleString("pt-BR")}</strong>
                </article>
              `).join("")}
            </div>
            ${comparison.samples?.escolasDocentesMudaram?.length ? `
              <p class="hint"><strong>Amostra - escolas com docentes alterados:</strong> ${comparison.samples.escolasDocentesMudaram.map((item) => `${esc(item.escola || item.inep)} (${item.anterior} -> ${item.atual})`).join("; ")}</p>
            ` : ""}
            ${comparison.samples?.professoresMudaramVinculo?.length ? `
              <p class="hint"><strong>Amostra - professores que mudaram de vinculo:</strong> ${comparison.samples.professoresMudaramVinculo.map((item) => `${esc(item.nome)} (${esc(item.anterior || "-")} -> ${esc(item.atual || "-")})`).join("; ")}</p>
            ` : ""}
          `
          : `<p class="hint">${esc(comparison.message || "Sem lote anterior para comparacao.")}</p>`}
      </div>
    </article>
  `;
}

async function saveSiageImport() {
  const draft = state.siageDraft;
  if (!draft) return;
  if (draft.issues.some((issue) => issue.type === "error")) {
    notify("Lote nao salvo", "Corrija os erros antes de confirmar.", "error");
    return;
  }
  if (!db) {
    notify("Supabase indisponivel", "Nao ha conexao com o banco para salvar o lote.", "error");
    return;
  }

  await withButtonBusy($("#confirmSiageImport"), "Salvando...", async () => {
    const totalRows = draft.escolas.length + draft.professores.length;
    const lote = {
      tipo: "siage_semanal",
      status: "processando",
      data_referencia: new Date().toISOString().slice(0, 10),
      total_linhas: totalRows,
      arquivos: draft.files,
      resumo: draft.summary,
      erros: draft.issues,
    };
    let loteId = null;
    try {
      const { data, error } = await db.from("import_lotes").insert(lote).select("id").single();
      if (error) throw error;
      loteId = data.id;

      await insertDbRows("siage_escolas", draft.escolas.map((row) => ({
        lote_id: loteId,
        gre: row.gre,
        inep: row.inep,
        escola: row.escola,
        numero_docentes: row.numeroDocentes,
      })), 500);
      await insertDbRows("siage_professores_ativos", draft.professores.map((row) => ({
        lote_id: loteId,
        gre: row.gre,
        inep: row.inep,
        escola: row.escola,
        nome: row.nome,
        nome_key: row.nomeKey,
      })), 500);

      const { error: updateError } = await db
        .from("import_lotes")
        .update({ status: "concluido" })
        .eq("id", loteId);
      if (updateError) throw updateError;

      state.base.schools = draft.escolas.map((row) => ({
        gre: row.gre,
        inep: row.inep,
        escola: row.escola,
        professores: row.numeroDocentes,
      }));
      state.siageDraft = null;
      await loadSiageLots({ force: true });
      renderSiagePreview();
      notify("Bases SIAGE salvas", `${totalRows.toLocaleString("pt-BR")} linhas gravadas no lote.`);
    } catch (error) {
      if (loteId) {
        try {
          await db.from("import_lotes").update({ status: "erro", erro: error?.message || "Erro desconhecido" }).eq("id", loteId);
        } catch { /* ignore status update failure */ }
      }
      notify("Erro ao salvar lote", error?.message || "Verifique se o SQL das tabelas SIAGE foi executado.", "error");
    }
  });
}

async function loadSiageLots({ force = false } = {}) {
  if (!db) {
    state.siageLoadError = "Supabase indisponivel.";
    renderSiageLots();
    return;
  }
  if (state.siageLotsLoaded && !force) {
    renderSiageLots();
    return;
  }
  try {
    const { data, error } = await db
      .from("import_lotes")
      .select("id,tipo,status,data_referencia,total_linhas,resumo,created_at,erro")
      .eq("tipo", "siage_semanal")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    state.siageLots = data || [];
    state.siageLotsLoaded = true;
    state.siageLoadError = "";
  } catch (error) {
    state.siageLots = [];
    state.siageLotsLoaded = false;
    state.siageLoadError = error?.message || "Nao foi possivel carregar lotes.";
  }
  renderSiageLots();
}

function renderSiageLots() {
  const table = $("#siageLotsTable");
  if (!table) return;
  if (state.siageLoadError) {
    table.innerHTML = `<tr><td colspan="4" class="empty-row">${esc(state.siageLoadError)} Execute o SQL atualizado no Supabase se as tabelas ainda nao existem.</td></tr>`;
    return;
  }
  table.innerHTML = state.siageLots.length
    ? state.siageLots.map((lot) => {
        const resumo = lot.resumo || {};
        return `<tr>
          <td>${esc(formatDateTime(lot.created_at || lot.data_referencia))}</td>
          <td><span class="pill ${lot.status === "concluido" ? "ok" : lot.status === "erro" ? "no" : "wait"}">${esc(lot.status || "-")}</span></td>
          <td class="td-num">${Number(lot.total_linhas || 0).toLocaleString("pt-BR")}</td>
          <td>${Number(resumo.escolas || 0).toLocaleString("pt-BR")} escolas · ${Number(resumo.professores || 0).toLocaleString("pt-BR")} professores</td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="4" class="empty-row">Nenhum lote SIAGE salvo ainda.</td></tr>`;
}

function showSiageSyncInstructions() {
  const hint = $("#siageSyncHint");
  const text = "Rotina segura: rode npm run siage:preview para ver a comparacao. Depois, confirme com npm run siage:sync ou npm run siage:confirm. O sistema mantem apenas os 2 lotes SIAGE concluidos mais recentes.";
  if (hint) {
    hint.textContent = text;
    hint.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  notify("Atualizacao SIAGE", "Use a rotina no terminal para baixar do Metabase sem expor credenciais no navegador.", "warning");
}

function renderSiage() {
  if (state.tab !== "siage") return;
  renderSiagePreview();
  if (!state.siageLotsLoaded && !state.siageLoadError) loadSiageLots();
  else renderSiageLots();
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

function getTeacherRosterIndex() {
  if (state._teacherRosterIndex) return state._teacherRosterIndex;
  const byNameInep = new Map();
  const countByInep = new Map();
  const rows = [];

  (state.base?.teacherRoster || []).forEach((item) => {
    const inep = String(item.inep || "").trim();
    const nomeKey = normalize(item.nome);
    const normalized = {
      gre: item.gre || "",
      inep,
      escola: item.escola || "",
      nome: item.nome || "",
    };
    if (!inep) return;
    rows.push(normalized);
    countByInep.set(inep, (countByInep.get(inep) || 0) + 1);
    if (nomeKey) byNameInep.set(`${nomeKey}|${inep}`, normalized);
  });

  state._teacherRosterIndex = { byNameInep, countByInep, rows };
  return state._teacherRosterIndex;
}

function teacherIdentityKey(row = {}) {
  return `${String(row.inep || "").trim()}|${normalize(row.nome)}`;
}

function findTeacherRosterMatch({ inep = "", nome = "" } = {}) {
  const index = getTeacherRosterIndex();
  const cleanInep = String(inep || "").trim();
  if (cleanInep && nome) {
    return index.byNameInep.get(`${normalize(nome)}|${cleanInep}`) || null;
  }
  return null;
}

function getTeacherRosterBaseRows() {
  return getTeacherRosterIndex().rows.map((item) => ({
    nome: item.nome,
    email: "",
    inep: item.inep,
    gre: item.gre,
    escola: item.escola,
    conclusao: 0,
    media: 0,
    resultado: TEACHER_STATUS_NOT_DONE,
    cursoId: state.teacherFilterCourseIds?.length === 1 ? state.teacherFilterCourseIds[0] : null,
    formacaoId: state.teacherFormationId,
    fixedRoster: true,
  }));
}

function getTeacherExpectedByInep(inep, school = null) {
  const value = Number(school?.professores);
  if (Number.isFinite(value)) return value;
  return getTeacherRosterIndex().countByInep.get(String(inep || "").trim()) || 0;
}

function getTeacherFormationIds() {
  return state.formations
    .filter(isTeacherFormation)
    .map((f) => f.id);
}

async function ensureTeacherFormation() {
  const existing = state.formations.find(isTeacherFormation);
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
  try { localStorage.removeItem(localKey); } catch { /* cache local opcional */ }
  try {
    const rows = await selectAllDbRows("professor_dados", "nome,email,inep,conclusao,media,resultado,curso_id,imported_at", (q) =>
      q.eq("formacao_id", formacaoId).not("curso_id", "is", null).order("nome")
    );
    const schoolByInep = new Map();
    (state.base?.schools || []).forEach((s) => schoolByInep.set(String(s.inep), s));
    const mapped = rows.map((r) => {
      const match = findTeacherRosterMatch({ inep: r.inep, nome: r.nome });
      const inep = String(match?.inep || r.inep || "");
      const school = schoolByInep.get(inep) || match;
      return {
        nome: match?.nome || r.nome || "",
        email: r.email || "",
        inep,
        gre: school?.gre || "",
        escola: school?.escola || "",
        conclusao: Number(r.conclusao || 0),
        media: Number(r.media || 0),
        resultado: teacherDisplayStatus(r.resultado),
        cursoId: r.curso_id || null,
        importedAt: r.imported_at || "",
        formacaoId,
      };
    });
    state.teacherLoadError = "";
    return mapped;
  } catch (error) {
    state.teacherLoadError = error?.message || "Nao foi possivel carregar os dados de professores do Supabase.";
    console.error("Erro ao carregar professor_dados do Supabase:", error);
    throw error;
  }
}

async function loadTeacherRowsForFormations(formacaoIds) {
  const ids = [...new Set((formacaoIds || []).filter(Boolean))];
  if (!ids.length) return [];
  await ensureSiageTeacherRoster();
  const groups = await Promise.all(ids.map((id) => loadTeacherRowsFromDb(id)));
  return groups.flat();
}

async function persistTeacherRows(formacaoId, rows, cursoId = null) {
  try { localStorage.removeItem("monitor-teacher-rows-" + formacaoId); } catch { /* cache local opcional */ }
  state.teacherPersistError = "";
  if (!db) {
    try {
      saveStored("monitor-teacher-rows-" + formacaoId, rows.map((r) => ({ ...r, formacaoId })));
    } catch {
      state.teacherPersistError = "Sem conexao com Supabase e sem espaco no navegador para salvar localmente.";
    }
    return false;
  }
  try {
    notify("Salvando no banco...", rows.length.toLocaleString("pt-BR") + " professores - pode levar alguns segundos.", "warning");
    let delQuery = db.from("professor_dados").delete().eq("formacao_id", formacaoId);
    delQuery = cursoId ? delQuery.eq("curso_id", cursoId) : delQuery.is("curso_id", null);
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

    let checkQuery = db
      .from("professor_dados")
      .select("id", { count: "exact", head: true })
      .eq("formacao_id", formacaoId);
    checkQuery = cursoId ? checkQuery.eq("curso_id", cursoId) : checkQuery.is("curso_id", null);
    const { count, error: checkErr } = await checkQuery;
    if (checkErr) throw checkErr;
    if (Number(count || 0) < rows.length) {
      throw new Error("Importacao nao confirmada no Supabase. Verifique se a tabela professor_dados possui a coluna curso_id e politicas de insert/select.");
    }

    return true;
  } catch (err) {
    console.warn("Nao foi possivel salvar professores no Supabase.", err);
    const message = err?.message || "Erro desconhecido ao salvar no Supabase.";
    state.teacherPersistError = /curso_id|schema cache|column/i.test(message)
      ? "O banco nao esta atualizado para salvar dados por curso. Execute o supabase_schema.sql atualizado no Supabase e tente importar novamente."
      : message;
    return false;
  }
}

function parseTeacherRows(rows2D) {
  if (!rows2D.length) return [];
  const rawHeaders = rows2D[0].map((h) => normalizeKey(String(h ?? "")));
  const idx = {};
  rawHeaders.forEach((h, i) => { if (!(h in idx)) idx[h] = i; });

  // busca exata, depois por prefixo, depois por substring (lida com headers longos
  // como "Conclusão (Clique...)" ou "Escola (INEP)" / "% de Conclusão")
  const col = (row, ...keys) => {
    for (const k of keys) {
      if (idx[k] !== undefined) return String(row[idx[k]] ?? "").trim();
    }
    for (const k of keys) {
      const prefixKey = Object.keys(idx).find((h) => h.startsWith(k) || k.startsWith(h));
      if (prefixKey !== undefined) return String(row[idx[prefixKey]] ?? "").trim();
    }
    for (const k of keys) {
      const includesKey = Object.keys(idx).find((h) => h.includes(k));
      if (includesKey !== undefined) return String(row[idx[includesKey]] ?? "").trim();
    }
    return "";
  };

  const schoolByInep = new Map();
  (state.base?.schools || []).forEach((s) => schoolByInep.set(String(s.inep), s));

  const rows = [];
  rows2D.slice(1).forEach((row) => {
    const inep = col(row, "inep", "codigoinep", "codinep");
    if (!inep) return;
    const nome = col(row, "nome", "nomeservidor", "nomeprofessor", "professor");
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
    const resultado = resultadoRaw || (conclusao >= 100 ? "Concluído" : "Não concluído");

    const school = schoolByInep.get(inep);
    rows.push({ nome, email, inep, gre: school?.gre || "", escola: school?.escola || "", conclusao, media, resultado });
  });
  return rows;
}

function parseTeacherRowsWithFixedRoster(rows2D) {
  if (!rows2D.length) return [];
  const rawHeaders = rows2D[0].map((h) => normalizeKey(String(h ?? "")));
  const idx = {};
  rawHeaders.forEach((h, i) => { if (!(h in idx)) idx[h] = i; });

  const col = (row, ...keys) => {
    for (const k of keys) {
      if (idx[k] !== undefined) return String(row[idx[k]] ?? "").trim();
    }
    for (const k of keys) {
      const prefixKey = Object.keys(idx).find((h) => h.startsWith(k) || k.startsWith(h));
      if (prefixKey !== undefined) return String(row[idx[prefixKey]] ?? "").trim();
    }
    for (const k of keys) {
      const includesKey = Object.keys(idx).find((h) => h.includes(k));
      if (includesKey !== undefined) return String(row[idx[includesKey]] ?? "").trim();
    }
    return "";
  };

  const schoolByInep = new Map();
  (state.base?.schools || []).forEach((s) => schoolByInep.set(String(s.inep), s));
  const statusRank = { [TEACHER_STATUS_NOT_DONE]: 0, [TEACHER_STATUS_DONE]: 1 };
  const normalizeTeacherStatus = (raw, conclusao) => {
    const n = normalize(raw);
    if (n.includes("nao") && (n.includes("conclu") || n.includes("conlcu") || n.includes("finaliz") || n.includes("aprov"))) return TEACHER_STATUS_NOT_DONE;
    if (n.includes("pendente") || n.includes("reprov")) return TEACHER_STATUS_NOT_DONE;
    if (n.includes("conclu") || n.includes("aprov") || n.includes("finaliz")) return TEACHER_STATUS_DONE;
    if (n.includes("nao") && n.includes("inici")) return TEACHER_STATUS_NOT_DONE;
    if (n.includes("andamento") || n.includes("cursando") || n.includes("inici")) return TEACHER_STATUS_NOT_DONE;
    return conclusao >= 100 ? TEACHER_STATUS_DONE : TEACHER_STATUS_NOT_DONE;
  };

  const byIdentity = new Map();
  rows2D.slice(1).forEach((row) => {
    const rawInep = col(row, "inep", "codigoinep", "codinep", "escolainep");
    const rawNome = col(row, "nome", "nomeservidor", "nomeprofessor", "professor", "docente");
    const cpf = normalizeCpf(col(row, "cpf", "cpfservidor", "documento", "identificacao", "identificador"));
    const match = findTeacherRosterMatch({ inep: rawInep, nome: rawNome });
    const inep = String(match?.inep || rawInep || "").trim();
    if (!inep) return;

    const nome = match?.nome || rawNome;
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
    const resultado = normalizeTeacherStatus(col(row, "status", "resultado", "situacao"), conclusao);
    if (resultado === TEACHER_STATUS_DONE && conclusao === 0) conclusao = 100;
    const school = schoolByInep.get(inep) || match;
    const identity = match ? teacherIdentityKey(match) : teacherIdentityKey({ inep, nome });
    const uploadIdentity = cpf ? `cpf:${cpf}|${inep}` : identity;
    const item = {
      nome,
      email,
      inep,
      gre: school?.gre || "",
      escola: school?.escola || "",
      conclusao,
      media,
      resultado,
    };
    const current = byIdentity.get(uploadIdentity) || byIdentity.get(identity);
    if (!current) {
      byIdentity.set(uploadIdentity, item);
    } else {
      current.conclusao = Math.max(current.conclusao || 0, item.conclusao || 0);
      current.media = Math.max(current.media || 0, item.media || 0);
      if ((statusRank[item.resultado] ?? 0) > (statusRank[current.resultado] ?? 0)) current.resultado = item.resultado;
      if (!current.email && item.email) current.email = item.email;
    }
  });
  return [...byIdentity.values()];
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
      await ensureSiageTeacherRoster();
      const rows = parseTeacherRowsWithFixedRoster(rows2D);
      if (!rows.length) throw new Error("Nenhum dado encontrado. Verifique se a planilha tem CPF ou INEP, alem das colunas de professor e conclusao.");

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
        esperado: getTeacherExpectedByInep(r.inep, school),
        total: 0,
        concluidos: 0,
        naoIniciados: 0,
        somaMedia: 0,
      });
    }
    const entry = byInep.get(r.inep);
    entry.total++;
    if (isTeacherDoneStatus(r.resultado)) entry.concluidos++;
    else entry.naoIniciados++;
    entry.somaMedia += r.media || 0;
  });

  return Array.from(byInep.values()).map((e) => ({
    gre: e.gre,
    inep: e.inep,
    escola: e.escola,
    esperado: e.esperado,
    total: e.total,
    concluidos: e.concluidos,
    naoIniciados: e.naoIniciados,
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
    if (concF !== "todos" && teacherDisplayStatus(r.resultado) !== concF) return false;
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
    if (concF === "Não concluído" && s.naoIniciados === 0) return false;
    if (q) {
      const text = normalize(`${s.gre} ${s.inep} ${s.escola}`);
      if (!text.includes(q)) return false;
    }
    return true;
  });
}

function getTeacherSelectedFormationIds() {
  const teacherFormations = state.formations.filter(isTeacherFormation);
  const selected = state.teacherFilterFormationIds?.length ? state.teacherFilterFormationIds : teacherFormations.map((f) => f.id);
  return selected.filter((id) => teacherFormations.some((f) => f.id === id));
}

function getTeacherDraftFormationIds() {
  const teacherFormations = state.formations.filter(isTeacherFormation);
  const selected = state.teacherDraftFormationIds?.length ? state.teacherDraftFormationIds : teacherFormations.map((f) => f.id);
  return selected.filter((id) => teacherFormations.some((f) => f.id === id));
}

function getFilteredTeacherRowsByReportFilters() {
  const formationIds = new Set(getTeacherSelectedFormationIds());
  const courseIds = new Set(state.teacherFilterCourseIds || []);
  const trilhas = new Set(state.teacherFilterTrilhas || []);
  const coursesById = new Map(state.courses.map((c) => [c.id, c]));

  const importedRows = state.teacherRows.filter((row) => {
    const rowFormationId = row.formacaoId || state.teacherFormationId;
    if (formationIds.size && !formationIds.has(rowFormationId)) return false;
    const course = coursesById.get(row.cursoId);
    if (courseIds.size && !courseIds.has(row.cursoId)) return false;
    if (trilhas.size && !trilhas.has(course?.trilha || "")) return false;
    return true;
  });

  const importedByTeacher = new Map();
  importedRows.forEach((row) => {
    const key = teacherIdentityKey(row);
    if (!key || key === "|") return;
    const current = importedByTeacher.get(key);
    if (!current) {
      importedByTeacher.set(key, row);
      return;
    }
    if ((row.conclusao || 0) > (current.conclusao || 0)) current.conclusao = row.conclusao || 0;
    if ((row.media || 0) > (current.media || 0)) current.media = row.media || 0;
    current.resultado = isTeacherDoneStatus(row.resultado) || isTeacherDoneStatus(current.resultado)
      ? TEACHER_STATUS_DONE
      : TEACHER_STATUS_NOT_DONE;
    if (!current.email && row.email) current.email = row.email;
    if (!current.importedAt && row.importedAt) current.importedAt = row.importedAt;
  });

  const usedKeys = new Set();
  const baseRows = getTeacherRosterBaseRows().map((baseRow) => {
    const key = teacherIdentityKey(baseRow);
    const imported = importedByTeacher.get(key);
    usedKeys.add(key);
    if (!imported) return baseRow;
    return {
      ...baseRow,
      email: imported.email || "",
      conclusao: Number(imported.conclusao || 0),
      media: Number(imported.media || 0),
      resultado: teacherDisplayStatus(imported.resultado),
      cursoId: imported.cursoId || baseRow.cursoId,
      formacaoId: imported.formacaoId || baseRow.formacaoId,
      importedAt: imported.importedAt || "",
      fixedRoster: true,
    };
  });

  const unmatchedImported = [...importedByTeacher.entries()]
    .filter(([key]) => !usedKeys.has(key))
    .map(([, row]) => ({ ...row, resultado: teacherDisplayStatus(row.resultado), fixedRoster: false }));

  return [...baseRows, ...unmatchedImported];
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
  const concluidos = rows.filter((r) => isTeacherDoneStatus(r.resultado)).length;
  const naoIniciados = Math.max(0, total - concluidos);
  const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;
  const pctNao = total > 0 ? Math.round((naoIniciados / total) * 100) : 0;
  const metricsEl = $("#dashboardMetrics");
  if (metricsEl) {
    const kpis = [
      { label: "Inscritos", value: total.toLocaleString("pt-BR"), v: "metric-accent" },
      { label: "Não concluídos", value: naoIniciados.toLocaleString("pt-BR"), sub: `${pctNao}%`, v: "metric-danger" },
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
    if (isTeacherDoneStatus(r.resultado)) e.concluidos++;
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
    pieEl.style.background = `conic-gradient(${range.color} 0 ${overall}%, var(--track) ${overall}% 100%)`;
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
  headEl.innerHTML = `<th>Curso</th><th>Trilha</th><th class="th-num">Inscritos</th><th class="th-num">Concluídos</th><th class="th-num">Não concluídos</th><th class="th-num">%</th>`;
  bodyEl.innerHTML = pageItems.map((c) => {
    const cr = rows.filter((r) => r.cursoId === c.id);
    const ins = cr.length;
    const con = cr.filter((r) => isTeacherDoneStatus(r.resultado)).length;
    const nao = ins - con;
    const p = ins > 0 ? Math.round((con / ins) * 100) : 0;
    const color = pctColor(p);
    const trilhaStyle = c.trilha ? TRILHA_COLORS[c.trilha] : null;
    const trilhaBadge = trilhaStyle ? `<span class="formation-tag" style="font-size:0.68rem;background:${trilhaStyle.bg};border-color:${trilhaStyle.border};--tag-color:${trilhaStyle.color};color:var(--tag-color)">${esc(c.trilha)}</span>` : `<span style="color:var(--muted);font-size:0.78rem">—</span>`;
    return `<tr>
      <td><strong>${esc(c.nome)}</strong>${c.cargaHoraria ? `<br><small class="muted">${esc(c.cargaHoraria)}</small>` : ""}</td>
      <td>${trilhaBadge}</td>
      <td class="td-num">${ins.toLocaleString("pt-BR")}</td>
      <td class="td-num">${con.toLocaleString("pt-BR")}</td>
      <td class="td-num">${nao.toLocaleString("pt-BR")}</td>
      <td><div class="pct-bar-wrap"><div class="pct-bar-track"><div class="pct-bar-fill" style="width:${Math.min(100,p)}%;background:${color}"></div></div><span class="pct-bar-label" style="color:${color}">${p}%</span></div></td>
    </tr>`;
  }).join("") || `<tr><td colspan="6" class="empty-row">Nenhum dado.</td></tr>`;
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
    if (isTeacherDoneStatus(r.resultado)) e.concluidos++;
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
  const courseHeaders = ["Curso", "Trilha", "Carga horária", "Inscritos", "Concluídos", "Não concluídos", "%"];
  const courseData = filteredCourses.map((c) => {
    const cr = rows.filter((r) => r.cursoId === c.id);
    const ins = cr.length; const con = cr.filter((r) => isTeacherDoneStatus(r.resultado)).length;
    return [c.nome, c.trilha || "", c.cargaHoraria || "", ins, con, ins - con, ins > 0 ? Math.round(con / ins * 100) + "%" : "0%"];
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
  const strictAdmin = state.user?.perfil === "admin";
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
  const iconDownload = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;

  const userGre = state.user?.gre;
  container.innerHTML = courses.map((c) => {
    const rows = state.teacherRows.filter((r) => r.cursoId === c.id && (isAdmin || !userGre || r.gre === userGre));
    const naplanilha = rows.length;
    const concluidos = rows.filter((r) => r.resultado === "Concluído").length;
    const pct = naplanilha > 0 ? Math.round((concluidos / naplanilha) * 100) : 0;
    const importedCount = isAdmin ? Math.max(Number(c.importedCount || 0), naplanilha) : naplanilha;
    const importInfo = importedCount
      ? `<small>${isAdmin ? "Base inserida" : "Registros da sua GRE"}: ${importedCount.toLocaleString("pt-BR")} registros</small>${isAdmin && c.lastImportedAt ? `<small class="event-updated">Atualizado em ${esc(formatDateTime(c.lastImportedAt))}</small>` : ""}`
      : `<small>Sem dados importados</small>`;
    const courseFormation = state.formations.find((f) => f.id === c.formacaoId);
    const cargaTag = c.cargaHoraria ? `<span class="formation-tag">${iconClock}${esc(c.cargaHoraria)}</span>` : "";
    const trilhaStyle = c.trilha ? TRILHA_COLORS[c.trilha] : null;
    const trilhaTag = trilhaStyle
      ? `<span class="formation-tag" style="background:${trilhaStyle.bg};border-color:${trilhaStyle.border};--tag-color:${trilhaStyle.color};color:var(--tag-color)">${esc(c.trilha)}</span>`
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
          ${strictAdmin && naplanilha ? `<button class="mini-button" data-download-course="${esc(c.id)}">${iconDownload}Baixar base</button>` : ""}
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
  container.querySelectorAll("[data-download-course]").forEach((b) => {
    b.addEventListener("click", () => downloadCourseBase(b.dataset.downloadCourse, b));
  });
}

async function downloadCourseBase(id, button = null) {
  if (state.user?.perfil !== "admin") {
    notify("Acesso restrito", "Apenas o administrador pode baixar a base importada.", "error");
    return;
  }
  const course = state.courses.find((c) => c.id === id);
  if (!course) return;
  if (!window.XLSX) { notify("Erro", "Biblioteca XLSX não carregada.", "error"); return; }

  const originalHtml = button ? button.innerHTML : "";
  if (button) { button.disabled = true; button.textContent = "Gerando..."; }
  try {
    let rows = state.teacherRows.filter((r) => r.cursoId === id);
    if (!rows.length && course.formacaoId) {
      try {
        const loaded = await loadTeacherRowsFromDb(course.formacaoId);
        rows = loaded.filter((r) => r.cursoId === id);
      } catch (error) {
        notify("Erro ao carregar base", error?.message || "Sem conexão com o banco.", "error");
        return;
      }
    }
    if (!rows.length) {
      notify("Sem dados", "Este curso ainda não tem base importada.", "warning");
      return;
    }

    const headers = ["GRE", "INEP", "Escola", "Nome", "E-mail", "Conclusão (%)", "Média", "Resultado"];
    const data = rows
      .slice()
      .sort((a, b) => String(a.gre || "").localeCompare(String(b.gre || "")) || String(a.nome || "").localeCompare(String(b.nome || "")))
      .map((r) => [
        r.gre || "",
        r.inep || "",
        r.escola || "",
        r.nome || "",
        r.email || "",
        Number(r.conclusao || 0),
        Number(r.media || 0),
        teacherDisplayStatus(r.resultado),
      ]);

    const ws = window.XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Base");
    const slug = normalize(course.nome || "curso").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "curso";
    window.XLSX.writeFile(wb, `base_${slug}.xlsx`);
    notify("Base exportada", `${rows.length.toLocaleString("pt-BR")} registros baixados em XLSX.`);
  } finally {
    if (button) { button.disabled = false; button.innerHTML = originalHtml; }
  }
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
  const formations = state.formations.filter((f) => f.nome && isTeacherFormation(f));
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
      ? `<span class="teacher-course-pill" style="${trilhaStyle ? `background:${trilhaStyle.bg};border-color:${trilhaStyle.border};--tag-color:${trilhaStyle.color};color:var(--tag-color)` : ""}">${esc(course.trilha)}</span>`
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
  const formations = state.formations.filter((f) => f.nome && isTeacherFormation(f));
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

  if (state.teacherLoadError) {
    const message = state.teacherLoadError;
    const coursesEl = $("#teacherReportCourses");
    if (coursesEl) {
      coursesEl.innerHTML = `
        <article class="panel">
          <div class="panel-head compact-head">
            <div>
              <p class="eyebrow">Supabase</p>
              <h3>Dados de professores nao carregaram</h3>
              <p class="panel-subtitle">A tela nao vai usar cache local vazio. Resolva a leitura do banco ou tente recarregar.</p>
            </div>
            <button class="secondary" type="button" id="retryTeacherDbLoad">Atualizar dados</button>
          </div>
          <p class="error" style="margin:0">${esc(message)}</p>
        </article>
      `;
      $("#retryTeacherDbLoad")?.addEventListener("click", () => openTeacherFormationReport(null));
    }
    const metricsEl = $("#teacherMetrics");
    const barsEl = $("#teacherGreBars");
    const legendEl = $("#teacherGreBarLegend");
    const pieEl = $("#teacherGrePie");
    const tableEl = $("#teacherTable");
    if (metricsEl) metricsEl.innerHTML = "";
    if (barsEl) barsEl.innerHTML = "";
    if (legendEl) legendEl.innerHTML = "";
    if (pieEl) pieEl.innerHTML = "";
    $("#teacherRegionalInsight")?.classList.add("hidden");
    if (tableEl) tableEl.innerHTML = `<tr><td class="empty-row">Dados nao carregados do Supabase.</td></tr>`;
    return;
  }

  const isAdmin = hasAdminAccess();
  const strictAdmin = state.user?.perfil === "admin";
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
      .reduce((s, sc) => s + getTeacherExpectedByInep(sc.inep, sc), 0)
    : schools.filter((sc) => sc.gre === state.user?.gre).reduce((s, sc) => s + getTeacherExpectedByInep(sc.inep, sc), 0);
  const totalInscritos = allPersonRows.length;
  const totalConcluidos = allPersonRows.filter((r) => isTeacherDoneStatus(r.resultado)).length;
  const totalNaoIniciados = Math.max(0, totalInscritos - totalConcluidos);
  const pctNaoIniciados = totalInscritos > 0 ? Math.round((totalNaoIniciados / totalInscritos) * 100) : 0;
  const pctGeral = totalInscritos > 0 ? Math.round((totalConcluidos / totalInscritos) * 100) : 0;
  const totalEscolas = schoolRows.length;
  const escolasConcluidas = schoolRows.filter((s) => s.pct >= 75).length;

  const metricsEl = $("#teacherMetrics");
  if (metricsEl) {
    const allItems = [
      { label: "Total SIAGE", value: totalEsperado.toLocaleString("pt-BR"), variant: "metric-primary", icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>` },
      { label: "Não concluídos", value: totalNaoIniciados.toLocaleString("pt-BR"), sub: `${pctNaoIniciados}%`, variant: "metric-danger", icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>` },
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
      state._teacherRegionalPersonStats = { pct: pctGeral, concluidos: totalConcluidos, total: totalInscritos };
      renderTeacherRegionalGauge(schoolRows);

      state._teacherPersonStatusCounts = { concluidos: totalConcluidos, naoIniciados: totalNaoIniciados };
      renderTeacherStatusChart(state._teacherPersonStatusCounts);
    }
  }

  // GRE filter options
  const greFilter = $("#teacherGreFilter");
  if (greFilter && isAdmin) {
    const gres = [...new Set(getFilteredTeacherRowsByReportFilters().map((r) => r.gre).filter(Boolean))].sort((a, b) => getGreNumber(a) - getGreNumber(b));
    const prev = greFilter.value;
    greFilter.innerHTML = `<option value="todos">GRE: Todas</option>` + gres.map((g) => `<option value="${esc(g)}">${esc(g)}</option>`).join("");
    if (gres.includes(prev)) greFilter.value = prev;
  }

  // View toggle sync
  $$("[data-teacher-view]").forEach((b) => b.classList.toggle("active", b.dataset.teacherView === state.teachersView));

  // Table
  renderTeachersTable();
}

function niceScaleMax(value) {
  if (value <= 10) return 10;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const residual = value / magnitude;
  let niceResidual;
  if (residual <= 1) niceResidual = 1;
  else if (residual <= 2) niceResidual = 2;
  else if (residual <= 2.5) niceResidual = 2.5;
  else if (residual <= 5) niceResidual = 5;
  else niceResidual = 10;
  return niceResidual * magnitude;
}

const STATUS_SEGMENT_COLORS = [
  { key: "Não concluído", label: "Não concluído", color: "#f43f5e" },
  { key: "Concluído", label: "Concluído", color: "#10b981" },
];

function renderTeacherRegionalGauge(schoolRows) {
  $$("#teacherRegionalGaugeToggle [data-regional-gauge-view]").forEach((b) => b.classList.toggle("active", b.dataset.regionalGaugeView === state.teacherRegionalGaugeView));

  const titleEl = $("#teacherRegionalGaugeTitle");
  const personStats = state._teacherRegionalPersonStats || { pct: 0, concluidos: 0, total: 0 };

  let pct, summaryText, hintText, doneLabel, pendingLabel;
  if (state.teacherRegionalGaugeView === "escola") {
    const schoolsWithData = schoolRows.filter((s) => s.total > 0);
    const schoolsDone = schoolsWithData.filter((s) => s.concluidos === s.total).length;
    const totalSchools = schoolsWithData.length;
    const pendingSchools = totalSchools - schoolsDone;
    pct = totalSchools > 0 ? Math.round((schoolsDone / totalSchools) * 100) : 0;
    if (titleEl) titleEl.textContent = "Escolas 100% concluídas";
    summaryText = `${schoolsDone.toLocaleString("pt-BR")} de ${totalSchools.toLocaleString("pt-BR")} escolas concluíram 100%`;
    hintText = totalSchools > 0 && pendingSchools === 0 ? "Todas as escolas concluíram 100%!" : `${pendingSchools.toLocaleString("pt-BR")} escolas ainda não concluíram 100%.`;
    doneLabel = `Concluídas ${schoolsDone.toLocaleString("pt-BR")}`;
    pendingLabel = `Pendentes ${pendingSchools.toLocaleString("pt-BR")}`;
  } else {
    pct = personStats.pct;
    if (titleEl) titleEl.textContent = "Progresso de conclusão";
    summaryText = `${personStats.concluidos.toLocaleString("pt-BR")} de ${personStats.total.toLocaleString("pt-BR")} professores concluíram`;
    hintText = pct >= 100 ? "Todos os professores concluíram!" : `${(personStats.total - personStats.concluidos).toLocaleString("pt-BR")} professores ainda não concluíram.`;
    doneLabel = `Concluídos ${personStats.concluidos.toLocaleString("pt-BR")}`;
    pendingLabel = `Pendentes ${(personStats.total - personStats.concluidos).toLocaleString("pt-BR")}`;
  }

  const gauge = $("#teacherRegionalGauge");
  if (gauge) {
    const ranges = [
      { color: "#22c55e", test: (v) => v >= 90 },
      { color: "#38bdf8", test: (v) => v >= 50 },
      { color: "#f59e0b", test: (v) => v >= 30 },
      { color: "#ef4444", test: () => true },
    ];
    const color = (ranges.find((r) => r.test(pct)) || ranges.at(-1)).color;
    gauge.style.background = `conic-gradient(${color} 0 ${pct}%, var(--track) ${pct}% 100%)`;
    gauge.style.setProperty("--pie-glow", `${color}70`);
    gauge.style.setProperty("--pie-glow-far", `${color}28`);
  }
  if ($("#teacherRegionalPercent")) $("#teacherRegionalPercent").textContent = `${pct}%`;
  if ($("#teacherRegionalSummary")) $("#teacherRegionalSummary").textContent = summaryText;
  if ($("#teacherRegionalHint")) $("#teacherRegionalHint").textContent = hintText;
  if ($("#teacherRegionalDoneLabel")) $("#teacherRegionalDoneLabel").textContent = doneLabel;
  if ($("#teacherRegionalPendingLabel")) $("#teacherRegionalPendingLabel").textContent = pendingLabel;
}

function renderTeacherStatusChart(personCounts) {
  const plotEl = $("#teacherStatusBarPlot");
  const legendEl = $("#teacherStatusBarLegend");
  if (!plotEl || !legendEl) return;

  const activeFilter = state.teachersConclusaoFilter;
  const total = personCounts.concluidos + personCounts.naoIniciados;
  const segments = STATUS_SEGMENT_COLORS.map((seg) => ({ ...seg, value: seg.key === "Não concluído" ? personCounts.naoIniciados : personCounts.concluidos }));

  const niceMax = niceScaleMax(Math.max(1, ...segments.map((s) => s.value)));
  const tickCount = 5;
  const step = niceMax / tickCount;
  const tickValues = Array.from({ length: tickCount + 1 }, (_, i) => Math.round(step * (tickCount - i)));

  plotEl.innerHTML = `
    <div class="status-bar-grid">
      ${tickValues.map((v) => `<div class="status-bar-gridline"><span>${v.toLocaleString("pt-BR")}</span></div>`).join("")}
    </div>
    <div class="status-bar-bars">
      ${segments.map((seg) => {
        const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
        const h = seg.value > 0 ? Math.max(2, Math.round((seg.value / niceMax) * 100)) : 0;
        const active = activeFilter === seg.key;
        return `
          <button type="button" class="status-bar-col${active ? " active" : ""}" data-status-pie-filter="${esc(seg.key)}" title="Filtrar tabela por ${esc(seg.label)}">
            <span class="status-bar-value">${seg.value.toLocaleString("pt-BR")}<small>(${pct}%)</small></span>
            <span class="status-bar-fill" style="height:${h}%;background:${seg.color};--bar-glow:${seg.color}80"></span>
          </button>
        `;
      }).join("")}
    </div>
  `;

  legendEl.innerHTML = segments.map((seg) => `
    <span class="status-bar-legend-item"><i style="background:${seg.color}"></i>${esc(seg.label)}</span>
  `).join("");

  plotEl.querySelectorAll("[data-status-pie-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const status = btn.dataset.statusPieFilter;
      state.teachersConclusaoFilter = state.teachersConclusaoFilter === status ? "todos" : status;
      state.teachersView = "detail";
      state.teacherTablePage = 1;
      const select = $("#teacherConclusaoFilter");
      if (select) select.value = state.teachersConclusaoFilter;
      withContentLoader(() => renderTeachersArea());
      $("#teacherTableEl")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });
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

  const teacherFormations = state.formations.filter(isTeacherFormation);
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

  const courseFilterHtml = filterMenuHtml({ key: "curso", label: "Curso", summary: courseSummary, optionsHtml: courseOptions });
  const applyButtonHtml = `<button class="report-filter-apply" type="button" id="applyTeacherReportFilters">Aplicar filtro</button>`;
  // Regional: apenas o filtro de curso, na mesma linha do título
  container.innerHTML = hasAdminAccess() ? `
    <div class="report-filter-panel panel">
      <div class="report-filter-head">
        <div>
          <p class="eyebrow">Visão geral</p>
          <h3>Dashboard de formações de professores</h3>
        </div>
      </div>
      <div class="report-filter-toolbar">
        ${filterMenuHtml({ key: "formacao", label: "Formação", summary: formationSummary, optionsHtml: formationOptions })}
        ${filterMenuHtml({ key: "trilha", label: "Trilha", summary: trilhaSummary, optionsHtml: trilhaOptions })}
        ${courseFilterHtml}
        ${applyButtonHtml}
      </div>
    </div>
  ` : `
    <div class="report-filter-panel panel compact">
      <div class="report-filter-head">
        <div>
          <p class="eyebrow">Dashboard</p>
          <h3>Formações de professores</h3>
        </div>
        <div class="report-filter-toolbar">
          ${courseFilterHtml}
          ${applyButtonHtml}
        </div>
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
    pieEl.style.background = `conic-gradient(${range.color} 0 ${overallPercent}%, var(--track) ${overallPercent}% 100%)`;
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
    const status = teacherDisplayStatus(res);
    const map = { [TEACHER_STATUS_DONE]: "ok", [TEACHER_STATUS_NOT_DONE]: "no" };
    return `<span class="pill ${map[status] || "no"}">${esc(status)}</span>`;
  };
  const sortArrow = (key, sortKeyState, sortDirState) => {
    const active = sortKeyState === key;
    return `<svg class="sort-arrow${active ? " active" : ""}${active && sortDirState === "desc" ? " desc" : ""}" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
  };
  const sortTh = (label, key, extraClass = "") => `<th class="sortable-th ${extraClass}" data-sort-key="${key}">${esc(label)}${sortArrow(key, state.teacherSortKey, state.teacherSortDir)}</th>`;
  const sortThPerson = (label, key, extraClass = "") => `<th class="sortable-th ${extraClass}" data-person-sort-key="${key}">${esc(label)}${sortArrow(key, state.teacherPersonSortKey, state.teacherPersonSortDir)}</th>`;

  const strictAdmin = state.user?.perfil === "admin";
  const colgroupEl = $("#teacherColgroup");

  if (state.teachersView === "school") {
    const rows = filteredTeacherSchoolRows();
    if (state.teacherSortKey) {
      const sortValue = (s, key) => {
        switch (key) {
          case "gre": return getGreNumber(s.gre);
          case "inep": return s.inep;
          case "escola": return normalize(s.escola);
          case "esperado": return s.esperado;
          case "total": return s.total;
          case "naoIniciados": return s.naoIniciados;
          case "concluidos": return s.concluidos;
          case "pct": return s.pct;
          default: return 0;
        }
      };
      const dirMul = state.teacherSortDir === "desc" ? -1 : 1;
      rows.sort((a, b) => {
        const va = sortValue(a, state.teacherSortKey);
        const vb = sortValue(b, state.teacherSortKey);
        if (typeof va === "string" || typeof vb === "string") return String(va).localeCompare(String(vb)) * dirMul;
        return (va - vb) * dirMul;
      });
    }
    const { pageItems } = paginateItems(rows, "teacherTablePage");
    if (titleEl) titleEl.textContent = "Por escola";
    if (countEl) countEl.textContent = `${rows.length} escola${rows.length !== 1 ? "s" : ""}`;

    if (colgroupEl) colgroupEl.innerHTML = `
      <col style="width:72px">
      <col style="width:96px">
      <col style="width:320px">
      <col style="width:88px">
      <col style="width:110px">
      <col style="width:110px">
      <col style="width:160px">`;

    headEl.innerHTML = `<tr>
      ${sortTh("GRE", "gre")}${sortTh("INEP", "inep")}${sortTh("Escola", "escola")}
      ${sortTh("SIAGE", "esperado", "th-num")}
      ${sortTh("Não concluídos", "naoIniciados", "th-num")}${sortTh("Concluídos", "concluidos", "th-num")}
      ${sortTh("Porcentagem", "pct", "th-num")}
    </tr>`;

    const colspan = 7;
    bodyEl.innerHTML = pageItems.map((s) => {
      const color = pctColor(s.pct);
      return `<tr>
        <td class="td-gre">${esc(s.gre)}</td>
        <td><code class="inep-code">${esc(s.inep)}</code></td>
        <td class="td-escola"><strong>${esc(s.escola)}</strong></td>
        <td class="td-num">${s.esperado.toLocaleString("pt-BR")}</td>
        <td class="td-num" style="color:var(--danger);font-weight:500">${s.naoIniciados.toLocaleString("pt-BR")}</td>
        <td class="td-num" style="color:var(--ok);font-weight:500">${s.concluidos.toLocaleString("pt-BR")}</td>
        <td>
          <div class="pct-bar-wrap">
            <div class="pct-bar-track">
              <div class="pct-bar-fill" style="width:${Math.min(100, s.pct)}%;background:${color}"></div>
            </div>
            <span class="pct-bar-label" style="color:${color};font-size:1rem;font-weight:500">${s.pct}%</span>
          </div>
        </td>
      </tr>`;
    }).join("") || `<tr><td colspan="${colspan}" class="empty-row">Nenhuma escola encontrada.</td></tr>`;
    renderPagination("#teacherTablePagination", "teacherTablePage", rows.length, renderTeachersTable);

  } else {
    const rows = filteredTeacherPersonRows();
    if (state.teacherPersonSortKey) {
      const key = state.teacherPersonSortKey;
      const sortValue = (r) => {
        switch (key) {
          case "gre": return getGreNumber(r.gre);
          case "inep": return r.inep;
          case "escola": return normalize(r.escola);
          case "nome": return normalize(r.nome);
          case "conclusao": return r.conclusao;
          case "media": return r.media;
          case "resultado": return normalize(r.resultado);
          default: return 0;
        }
      };
      const dirMul = state.teacherPersonSortDir === "desc" ? -1 : 1;
      rows.sort((a, b) => {
        const va = sortValue(a);
        const vb = sortValue(b);
        if (typeof va === "string" || typeof vb === "string") return String(va).localeCompare(String(vb)) * dirMul;
        return (va - vb) * dirMul;
      });
    }
    const { pageItems } = paginateItems(rows, "teacherTablePage");
    if (titleEl) titleEl.textContent = "Por professor";
    if (countEl) countEl.textContent = `${rows.length} professor${rows.length !== 1 ? "es" : ""}`;

    if (colgroupEl) colgroupEl.innerHTML = `
      <col style="width:72px">
      <col style="width:96px">
      <col style="width:300px">
      <col style="width:320px">
      <col style="width:130px">`;

    headEl.innerHTML = `<tr>
      ${sortThPerson("GRE", "gre")}${sortThPerson("INEP", "inep")}${sortThPerson("Escola", "escola")}${sortThPerson("Nome", "nome")}
      ${sortThPerson("Resultado", "resultado")}
    </tr>`;

    bodyEl.innerHTML = pageItems.map((r) => {
      return `<tr>
        <td class="td-gre">${esc(r.gre)}</td>
        <td><code class="inep-code">${esc(r.inep)}</code></td>
        <td class="td-escola" style="font-size:0.8rem">${esc(r.escola)}</td>
        <td><strong>${esc(r.nome)}</strong>${r.email ? `<br><small class="muted">${esc(r.email)}</small>` : ""}</td>
        <td>${resultadoPill(r.resultado)}</td>
      </tr>`;
    }).join("") || `<tr><td colspan="5" class="empty-row">Nenhum professor encontrado.</td></tr>`;
    renderPagination("#teacherTablePagination", "teacherTablePage", rows.length, renderTeachersTable);
  }
}

function downloadTeacherSpreadsheet() {
  if (!window.XLSX) { notify("Erro", "Biblioteca XLSX não carregada.", "error"); return; }

  let data, headers;
  if (state.teachersView === "school") {
    const rows = filteredTeacherSchoolRows();
    headers = ["GRE", "INEP", "Escola", "SIAGE", "Não concluídos", "Concluídos", "Porcentagem (%)"];
    data = rows.map((s) => [s.gre, s.inep, s.escola, s.esperado, s.naoIniciados, s.concluidos, s.pct]);
  } else {
    const rows = filteredTeacherPersonRows();
    headers = ["GRE", "INEP", "Escola", "Nome", "E-mail", "Resultado"];
    data = rows.map((r) => [r.gre, r.inep, r.escola, r.nome, r.email, teacherDisplayStatus(r.resultado)]);
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
