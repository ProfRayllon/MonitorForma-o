import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const defaultEnv = path.join(root, ".env");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [key, ...rest] = line.split("=");
    const value = rest.join("=").trim().replace(/^['"]|['"]$/g, "");
    if (key && !(key.trim() in process.env)) process.env[key.trim()] = value;
  }
}

function argValue(name, fallback = null) {
  const prefix = `${name}=`;
  const directIndex = process.argv.indexOf(name);
  if (directIndex >= 0 && process.argv[directIndex + 1]) return process.argv[directIndex + 1];
  const pair = process.argv.find((arg) => arg.startsWith(prefix));
  return pair ? pair.slice(prefix.length) : fallback;
}

function hasArg(name) {
  return process.argv.includes(name);
}

function requireEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value || /seu-email|sua-senha|YOUR-PASSWORD|\[YOUR-PASSWORD\]/i.test(value)) {
    throw new Error(`Configure ${name} no arquivo .env antes de rodar.`);
  }
  return value;
}

function normalizeMetabaseBaseUrl(value) {
  const url = new URL(value.trim());
  return `${url.protocol}//${url.host}`;
}

function metabaseUrl(baseUrl, route) {
  return new URL(route.replace(/^\//, ""), `${baseUrl.replace(/\/$/, "")}/`).toString();
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status} em ${url}: ${text.slice(0, 180)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Resposta inesperada de ${url}: ${text.slice(0, 180)}`);
  }
}

async function metabaseLogin(baseUrl, email, password) {
  const response = await requestJson(metabaseUrl(baseUrl, "/api/session"), {
    method: "POST",
    body: JSON.stringify({ username: email, password }),
  });
  if (!response.id) throw new Error("Login no Metabase nao retornou sessao.");
  return response.id;
}

async function downloadMetabaseCsv(baseUrl, sessionId, questionId, outputDir) {
  const response = await fetch(metabaseUrl(baseUrl, `/api/card/${questionId}/query/csv`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Metabase-Session": sessionId,
    },
    body: JSON.stringify({ parameters: [] }),
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!response.ok) throw new Error(`Erro ao baixar CSV do Metabase: HTTP ${response.status} ${buffer.toString("utf8", 0, 200)}`);
  if (!buffer.length) throw new Error("Metabase retornou um arquivo vazio.");
  if (buffer.toString("utf8", 0, Math.min(buffer.length, 500)).toLowerCase().includes("<html")) {
    throw new Error("Metabase retornou HTML em vez da base CSV.");
  }
  fs.mkdirSync(outputDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "_");
  const outputPath = path.join(outputDir, `BASE_PROFESSORES_ATIVOS_${timestamp}.csv`);
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

function countDelimiter(line, delimiter) {
  let count = 0;
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') i += 1;
      else quoted = !quoted;
    } else if (!quoted && char === delimiter) {
      count += 1;
    }
  }
  return count;
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) || "";
  const candidates = [",", ";", "\t"];
  return candidates.sort((a, b) => countDelimiter(firstLine, b) - countDelimiter(firstLine, a))[0];
}

function parseCsv(text) {
  const delimiter = detectDelimiter(text);
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  const cleanText = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < cleanText.length; i += 1) {
    const char = cleanText[i];
    if (char === '"') {
      if (quoted && cleanText[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && char === delimiter) {
      row.push(value);
      value = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && cleanText[i + 1] === "\n") i += 1;
      row.push(value);
      if (row.some((cell) => String(cell || "").trim())) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  row.push(value);
  if (row.some((cell) => String(cell || "").trim())) rows.push(row);
  return rows;
}

const normalize = (value) =>
  String(value || "")
    .replace(/^\uFEFF/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const normalizeKey = (value) => normalize(value).replace(/[^a-z0-9]/g, "");
const digitsOnly = (value) => String(value || "").replace(/\D/g, "");
const siageNameKey = (value) => normalize(value).replace(/\s+/g, " ");

function bestHeaderRow(rows) {
  let bestIndex = 0;
  let bestScore = -1;
  rows.slice(0, 20).forEach((row, index) => {
    const score = row.filter((cell) => String(cell || "").trim()).length;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function tableToObjects(rows) {
  if (!rows.length) return { headers: [], records: [] };
  const headerIndex = bestHeaderRow(rows);
  const headers = rows[headerIndex].map((cell, index) => ({
    label: String(cell || "").trim(),
    key: normalizeKey(cell),
    index,
  }));
  const records = rows.slice(headerIndex + 1).map((row) => {
    const record = {};
    headers.forEach((header) => {
      record[header.label] = String(row[header.index] ?? "").trim();
    });
    return record;
  }).filter((record) => Object.values(record).some((value) => String(value || "").trim()));
  return { headers, records };
}

function findHeader(headers, candidates) {
  const keys = candidates.map(normalizeKey);
  const exact = headers.find((header) => keys.includes(header.key));
  if (exact) return exact.label;
  const partial = headers.find((header) => keys.some((key) => header.key.includes(key) || key.includes(header.key)));
  return partial?.label || "";
}

function requiredHeader(headers, label, candidates) {
  const header = findHeader(headers, candidates);
  if (!header) throw new Error(`Coluna obrigatoria nao encontrada: ${label}.`);
  return header;
}

function parseProfessoresAtivos(rows2D) {
  const { headers, records } = tableToObjects(rows2D);
  const greCol = requiredHeader(headers, "GRE", ["gre", "gerenciaregional", "regional"]);
  const inepCol = requiredHeader(headers, "INEP", ["inep", "codigoinep", "codinep"]);
  const escolaCol = requiredHeader(headers, "ESCOLA", ["escola", "nomeescola", "unidadeescolar"]);
  const docenteCol = requiredHeader(headers, "DOCENTE", ["docente", "nome", "professor", "nomedocente", "nomeservidor"]);
  const cpfCol = findHeader(headers, ["cpf", "documento"]);
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

function getGreNumber(gre) {
  return Number(String(gre).match(/\d+/)?.[0] || 0);
}

function deriveEscolas(professores) {
  const byInep = new Map();
  for (const row of professores) {
    if (!row.inep) continue;
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
    item.numeroDocentes += 1;
    if (row.escola) item.escolas.add(row.escola);
    if (row.gre) item.gres.add(row.gre);
    if (!item.escola && row.escola) item.escola = row.escola;
    if (!item.gre && row.gre) item.gre = row.gre;
  }
  return [...byInep.values()]
    .map(({ escolas, gres, ...row }) => ({
      ...row,
      escolasDivergentes: escolas.size > 1 ? [...escolas] : [],
      gresDivergentes: gres.size > 1 ? [...gres] : [],
    }))
    .sort((a, b) => getGreNumber(a.gre) - getGreNumber(b.gre) || String(a.escola).localeCompare(String(b.escola)));
}

function siageSetKey(values) {
  return [...new Set(values.filter(Boolean))].sort().join("|");
}

function summarizeVinculos(professores) {
  const byCpf = new Map();
  for (const row of professores) {
    if (!row.cpfKey) continue;
    if (!byCpf.has(row.cpfKey)) byCpf.set(row.cpfKey, []);
    byCpf.get(row.cpfKey).push(row);
  }
  const repeated = [...byCpf.values()].filter((rows) => rows.length > 1);
  const buckets = new Map();
  for (const rows of repeated) buckets.set(rows.length, (buckets.get(rows.length) || 0) + 1);
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

function buildValidation({ escolas, professores }) {
  const issues = [];
  const escolaIneps = new Set(escolas.map((row) => row.inep).filter(Boolean));
  const professorIneps = new Set(professores.map((row) => row.inep).filter(Boolean));
  const professoresSemNome = professores.filter((row) => !row.nomeKey).length;
  const professoresSemInep = professores.filter((row) => !row.inep).length;
  if (professoresSemNome) issues.push({ type: "error", message: `${professoresSemNome} professor(es) sem nome na BASE_PROFESSORES_ATIVOS.` });
  if (professoresSemInep) issues.push({ type: "error", message: `${professoresSemInep} professor(es) sem INEP na BASE_PROFESSORES_ATIVOS.` });

  const escolasComNomeDivergente = escolas.filter((row) => row.escolasDivergentes?.length);
  const escolasComGreDivergente = escolas.filter((row) => row.gresDivergentes?.length);
  if (escolasComNomeDivergente.length) issues.push({ type: "warning", message: `${escolasComNomeDivergente.length} INEP(s) aparecem com mais de um nome de escola na base de professores.` });
  if (escolasComGreDivergente.length) issues.push({ type: "warning", message: `${escolasComGreDivergente.length} INEP(s) aparecem em mais de uma GRE na base de professores.` });

  const nomes = new Map();
  for (const row of professores) {
    if (!row.nomeKey) continue;
    if (!nomes.has(row.nomeKey)) nomes.set(row.nomeKey, { nome: row.nome, total: 0, ineps: new Set() });
    const item = nomes.get(row.nomeKey);
    item.total += 1;
    if (row.inep) item.ineps.add(row.inep);
  }
  const nomesDuplicados = [...nomes.values()].filter((item) => item.total > 1);
  const nomesMultiescola = nomesDuplicados.filter((item) => item.ineps.size > 1);
  const vinculos = summarizeVinculos(professores);
  if (nomesMultiescola.length) issues.push({ type: "warning", message: `${nomesMultiescola.length} nome(s) aparecem em mais de uma escola. Como o cruzamento sera por nome, esses casos podem ficar ambiguos.` });
  if (!vinculos.hasCpf) issues.push({ type: "warning", message: "A base nao trouxe CPF; a distribuicao de vinculos por professor nao pode ser calculada." });

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

async function loadLatestSnapshot(client) {
  const lot = await client.query(
    "select id, created_at from public.import_lotes where tipo = $1 and status = $2 order by created_at desc limit 1",
    ["siage_semanal", "concluido"],
  );
  if (!lot.rows[0]) return null;
  const lotId = lot.rows[0].id;
  const [escolas, professores] = await Promise.all([
    client.query("select gre, inep, escola, numero_docentes from public.siage_escolas where lote_id = $1", [lotId]),
    client.query("select gre, inep, escola, nome, nome_key from public.siage_professores_ativos where lote_id = $1", [lotId]),
  ]);
  return { lotId, createdAt: lot.rows[0].created_at, escolas: escolas.rows, professores: professores.rows };
}

function compareSnapshots(current, previous) {
  if (!previous?.lotId) return { available: false, message: "Nenhum lote anterior encontrado para comparacao." };
  const currentSchools = new Map(current.escolas.map((row) => [row.inep, row]));
  const previousSchools = new Map(previous.escolas.map((row) => [row.inep, { ...row, numeroDocentes: Number(row.numero_docentes || 0) }]));
  const currentIneps = new Set(currentSchools.keys());
  const previousIneps = new Set(previousSchools.keys());
  const escolasNovas = [...currentIneps].filter((inep) => !previousIneps.has(inep));
  const escolasRemovidas = [...previousIneps].filter((inep) => !currentIneps.has(inep));
  const escolasDocentesMudaram = [...currentIneps].filter((inep) => previousIneps.has(inep)).map((inep) => ({
    inep,
    anterior: Number(previousSchools.get(inep).numeroDocentes || 0),
    atual: Number(currentSchools.get(inep).numeroDocentes || 0),
  })).filter((item) => item.anterior !== item.atual);

  const currentByName = new Map();
  for (const row of current.professores) {
    if (!row.nomeKey) continue;
    if (!currentByName.has(row.nomeKey)) currentByName.set(row.nomeKey, { nome: row.nome, ineps: [] });
    currentByName.get(row.nomeKey).ineps.push(row.inep);
  }
  const previousByName = new Map();
  for (const row of previous.professores) {
    if (!row.nome_key) continue;
    if (!previousByName.has(row.nome_key)) previousByName.set(row.nome_key, { nome: row.nome, ineps: [] });
    previousByName.get(row.nome_key).ineps.push(row.inep);
  }
  const currentNames = new Set(currentByName.keys());
  const previousNames = new Set(previousByName.keys());
  const professoresNovos = [...currentNames].filter((key) => !previousNames.has(key));
  const professoresRemovidos = [...previousNames].filter((key) => !currentNames.has(key));
  const professoresMudaramVinculo = [...currentNames].filter((key) => previousNames.has(key)).map((key) => ({
    nome: currentByName.get(key).nome || previousByName.get(key).nome || "",
    anterior: siageSetKey(previousByName.get(key).ineps),
    atual: siageSetKey(currentByName.get(key).ineps),
  })).filter((item) => item.anterior !== item.atual);

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

async function insertRows(client, table, columns, rows, chunkSize = 1000) {
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);
    const values = [];
    const placeholders = chunk.map((row, rowIndex) => {
      const fields = columns.map((column, columnIndex) => {
        values.push(row[column]);
        return `$${rowIndex * columns.length + columnIndex + 1}`;
      });
      return `(${fields.join(", ")})`;
    });
    await client.query(
      `insert into public.${table} (${columns.join(", ")}) values ${placeholders.join(", ")}`,
      values,
    );
  }
}

async function cleanupOldLots(client, keepLots) {
  if (keepLots <= 0) return [];
  const oldLots = await client.query(
    `select id from public.import_lotes
     where tipo = $1 and status = $2
     order by created_at desc
     offset $3`,
    ["siage_semanal", "concluido", keepLots],
  );
  if (!oldLots.rows.length) return [];
  const ids = oldLots.rows.map((row) => row.id);
  await client.query("delete from public.import_lotes where id = any($1::uuid[])", [ids]);
  return ids;
}

async function saveLot(client, draft, filePath, keepLots) {
  const totalRows = draft.escolas.length + draft.professores.length;
  await client.query("begin");
  try {
    const inserted = await client.query(
      `insert into public.import_lotes
        (tipo, status, data_referencia, total_linhas, arquivos, resumo, erros)
       values ($1, $2, current_date, $3, $4::jsonb, $5::jsonb, $6::jsonb)
       returning id`,
      [
        "siage_semanal",
        "processando",
        totalRows,
        JSON.stringify({ professores: path.basename(filePath) }),
        JSON.stringify(draft.summary),
        JSON.stringify(draft.issues),
      ],
    );
    const loteId = inserted.rows[0].id;

    await insertRows(client, "siage_escolas", ["lote_id", "gre", "inep", "escola", "numero_docentes"], draft.escolas.map((row) => ({
      lote_id: loteId,
      gre: row.gre,
      inep: row.inep,
      escola: row.escola,
      numero_docentes: row.numeroDocentes,
    })));
    await insertRows(client, "siage_professores_ativos", ["lote_id", "gre", "inep", "escola", "nome", "nome_key"], draft.professores.map((row) => ({
      lote_id: loteId,
      gre: row.gre,
      inep: row.inep,
      escola: row.escola,
      nome: row.nome,
      nome_key: row.nomeKey,
    })));
    await client.query("update public.import_lotes set status = $1 where id = $2", ["concluido", loteId]);
    const removedLots = await cleanupOldLots(client, keepLots);
    await client.query("commit");
    return { loteId, totalRows, removedLots };
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

function printSummary({ filePath, draft, comparison, saveResult, dryRun }) {
  const distribution = draft.summary.vinculos.distribution;
  const bucket = (total) => distribution.find((item) => item.vinculos === total)?.professores || 0;
  console.log(`Base processada: ${filePath}`);
  console.log(`Escolas geradas: ${draft.summary.escolas}`);
  console.log(`Professores ativos: ${draft.summary.professores}`);
  console.log(`INEPs: ${draft.summary.inePsEscola}`);
  console.log(`Vinculos extras: ${draft.summary.vinculos.vinculosExtras}`);
  console.log(`2 vinculos: ${bucket(2)}`);
  console.log(`3 vinculos: ${bucket(3)}`);
  console.log(`4 vinculos: ${bucket(4)}`);
  for (const issue of draft.issues) console.log(`${issue.type === "error" ? "Erro" : "Aviso"}: ${issue.message}`);
  if (comparison.available) {
    console.log("Comparacao com lote anterior:");
    console.log(`- Escolas novas: ${comparison.summary.escolasNovas}`);
    console.log(`- Escolas removidas: ${comparison.summary.escolasRemovidas}`);
    console.log(`- Escolas com total de docentes alterado: ${comparison.summary.escolasDocentesMudaram}`);
    console.log(`- Professores novos: ${comparison.summary.professoresNovos}`);
    console.log(`- Professores removidos: ${comparison.summary.professoresRemovidos}`);
    console.log(`- Professores com vinculo alterado: ${comparison.summary.professoresMudaramVinculo}`);
  } else {
    console.log(comparison.message);
  }
  if (dryRun) {
    console.log("Dry-run concluido. Nada foi gravado no banco.");
  } else {
    console.log(`Lote salvo no Supabase: ${saveResult.loteId}`);
    if (saveResult.removedLots.length) console.log(`Lotes antigos removidos: ${saveResult.removedLots.length}`);
  }
}

function hasComparisonChanges(comparison) {
  if (!comparison?.available) return false;
  return Object.values(comparison.summary || {}).some((value) => Number(value || 0) > 0);
}

async function confirmChangedSync(comparison) {
  if (!hasComparisonChanges(comparison)) return true;
  if (hasArg("--yes") || process.env.SIAGE_AUTO_CONFIRM === "1") return true;
  if (!process.stdin.isTTY) {
    throw new Error("Foram encontradas mudancas no SIAGE. Rode com --dry-run para revisar e depois use --yes para confirmar.");
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question("Foram encontradas mudancas no SIAGE. Confirmar gravacao do novo lote? Digite SIM para confirmar: ");
    return normalize(answer) === "sim";
  } finally {
    rl.close();
  }
}

async function main() {
  loadEnv(argValue("--env", defaultEnv));
  const dryRun = hasArg("--dry-run");
  const allowErrors = hasArg("--allow-errors");
  const keepLots = Number(argValue("--keep-lots", process.env.SIAGE_KEEP_LOTS || "2"));
  const dbUrl = requireEnv("SUPABASE_DB_URL");
  const inputFile = argValue("--input-file", "");

  let filePath = inputFile;
  if (!filePath) {
    const baseUrl = normalizeMetabaseBaseUrl(requireEnv("METABASE_URL"));
    const email = requireEnv("METABASE_EMAIL");
    const password = requireEnv("METABASE_PASSWORD");
    const questionId = argValue("--question-id", process.env.METABASE_QUESTION_ID || "9777");
    const outputDir = path.resolve(argValue("--output-dir", process.env.DOWNLOAD_DIR || path.join(process.env.USERPROFILE || root, "Downloads")));
    const sessionId = await metabaseLogin(baseUrl, email, password);
    filePath = await downloadMetabaseCsv(baseUrl, sessionId, questionId, outputDir);
  }

  if (!/\.csv$/i.test(filePath)) throw new Error("O sync automatico processa CSV. Para XLSX, use a tela Bases SIAGE.");
  const text = fs.readFileSync(filePath, "utf8");
  const professores = parseProfessoresAtivos(parseCsv(text));
  const escolas = deriveEscolas(professores);
  const validation = buildValidation({ escolas, professores });

  if (validation.issues.some((issue) => issue.type === "error") && !allowErrors) {
    printSummary({
      filePath,
      draft: { professores, escolas, ...validation },
      comparison: { available: false, message: "Importacao bloqueada por erro de validacao." },
      dryRun: true,
    });
    throw new Error("Lote nao salvo porque existem erros de validacao. Use --allow-errors apenas se tiver certeza.");
  }

  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const comparison = compareSnapshots({ escolas, professores }, await loadLatestSnapshot(client));
    const draft = { professores, escolas, ...validation, comparison };
    if (!dryRun && !(await confirmChangedSync(comparison))) {
      printSummary({ filePath, draft, comparison, dryRun: true });
      throw new Error("Atualizacao cancelada pelo usuario. Nenhum dado foi gravado.");
    }
    const saveResult = dryRun ? null : await saveLot(client, draft, filePath, keepLots);
    printSummary({ filePath, draft, comparison, saveResult, dryRun });
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(`Erro: ${error.message}`);
  process.exit(1);
});
