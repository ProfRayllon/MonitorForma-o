import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [key, ...rest] = line.split("=");
    const value = rest.join("=").trim().replace(/^['"]|['"]$/g, "");
    if (key && !(key in process.env)) process.env[key.trim()] = value;
  }
}

loadEnv(path.join(root, ".env"));

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl || dbUrl.includes("SUA-SENHA") || dbUrl.includes("PROJECT-REF")) {
  console.error([
    "Configure SUPABASE_DB_URL no arquivo .env antes de rodar.",
    "No Supabase: Project Settings > Database > Connection string > URI.",
    "Cole no .env como SUPABASE_DB_URL=postgresql://...",
  ].join("\n"));
  process.exit(1);
}

const schemaPath = path.join(root, "supabase_schema.sql");
const sql = fs.readFileSync(schemaPath, "utf8");
const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log("Schema aplicado com sucesso no Supabase.");
} catch (error) {
  console.error("Erro ao aplicar schema:", error.message);
  if (
    /ENOTFOUND|ENETUNREACH|ETIMEDOUT/i.test(error.message) &&
    dbUrl.includes("@db.") &&
    dbUrl.includes(".supabase.co")
  ) {
    console.error([
      "Dica: a conexao Direct do Supabase pode depender de IPv6.",
      "No painel do Supabase, abra Connect > Direct e selecione Transaction pooler.",
      "Copie a Connection string em formato URI para SUPABASE_DB_URL no .env e rode novamente.",
    ].join("\n"));
  }
  if (/password authentication failed/i.test(error.message)) {
    console.error([
      "Dica: o Supabase recebeu a conexao, mas recusou a senha.",
      "Confira se [YOUR-PASSWORD] foi substituido pela senha do banco.",
      "Se a senha tiver caracteres especiais, use a string copiada do Supabase ou percent-encode a senha.",
    ].join("\n"));
  }
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
