import argparse
import json
import os
from datetime import datetime
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse, urlunparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ENV = ROOT / ".env"


def load_env(path):
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def require_env(name):
    value = os.environ.get(name, "").strip()
    if not value or "sua-senha-aqui" in value or "seu-email" in value:
        raise SystemExit(f"Configure {name} no arquivo .env antes de rodar.")
    return value


def request_json(url, method="GET", payload=None, headers=None):
    data = None
    request_headers = {"Accept": "application/json", **(headers or {})}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        request_headers["Content-Type"] = "application/json"
    req = Request(url, data=data, headers=request_headers, method=method)
    with urlopen(req, timeout=120) as response:
        body = response.read().decode("utf-8", errors="replace")
        try:
            return json.loads(body)
        except json.JSONDecodeError as error:
            content_type = response.headers.get("Content-Type", "")
            preview = body[:160].replace("\n", " ").strip()
            raise RuntimeError(
                f"Resposta inesperada de {response.geturl()} ({content_type}). "
                f"Confira METABASE_URL; use apenas o dominio raiz. Previa: {preview!r}"
            ) from error


def request_bytes(url, method="GET", payload=None, headers=None):
    data = None
    request_headers = {**(headers or {})}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        request_headers["Content-Type"] = "application/json"
    req = Request(url, data=data, headers=request_headers, method=method)
    with urlopen(req, timeout=300) as response:
        body = response.read()
        content_type = response.headers.get("Content-Type", "")
        return body, content_type


def metabase_url(base_url, path):
    return urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))


def normalize_metabase_base_url(value):
    parsed = urlparse(value.strip())
    if not parsed.scheme or not parsed.netloc:
        raise SystemExit("METABASE_URL deve incluir protocolo e dominio, por exemplo http://metabase.seect.pb.gov.br")
    return urlunparse((parsed.scheme, parsed.netloc, "", "", "", ""))


def login(base_url, email, password):
    response = request_json(
        metabase_url(base_url, "/api/session"),
        method="POST",
        payload={"username": email, "password": password},
    )
    session_id = response.get("id")
    if not session_id:
        raise RuntimeError("Login no Metabase nao retornou sessao.")
    return session_id


def download_question(base_url, session_id, question_id, output_dir):
    headers = {"X-Metabase-Session": session_id}
    payload = {"parameters": []}
    attempts = [
        ("xlsx", f"/api/card/{question_id}/query/xlsx"),
        ("csv", f"/api/card/{question_id}/query/csv"),
    ]
    last_error = None
    for extension, path in attempts:
        try:
            body, content_type = request_bytes(
                metabase_url(base_url, path),
                method="POST",
                payload=payload,
                headers=headers,
            )
            if not body:
                raise RuntimeError("Arquivo vazio recebido do Metabase.")
            if b"<html" in body[:500].lower():
                raise RuntimeError("Metabase retornou HTML em vez da base.")
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = output_dir / f"BASE_PROFESSORES_ATIVOS_{timestamp}.{extension}"
            output_path.write_bytes(body)
            return output_path, content_type
        except (HTTPError, URLError, RuntimeError) as error:
            last_error = error
    raise RuntimeError(f"Nao foi possivel baixar a pergunta {question_id}: {last_error}")


def main():
    parser = argparse.ArgumentParser(description="Baixa a base de docentes por escola do Metabase/SIAGE.")
    parser.add_argument("--env", default=str(DEFAULT_ENV), help="Caminho do arquivo .env.")
    parser.add_argument("--question-id", default=None, help="ID da pergunta Metabase. Padrao: METABASE_QUESTION_ID ou 9777.")
    parser.add_argument("--output-dir", default=None, help="Pasta de saida. Padrao: DOWNLOAD_DIR ou Downloads do usuario.")
    args = parser.parse_args()

    load_env(Path(args.env))

    base_url = normalize_metabase_base_url(require_env("METABASE_URL"))
    email = require_env("METABASE_EMAIL")
    password = require_env("METABASE_PASSWORD")
    question_id = args.question_id or os.environ.get("METABASE_QUESTION_ID", "9777").strip()
    output_dir = Path(args.output_dir or os.environ.get("DOWNLOAD_DIR", str(Path.home() / "Downloads"))).expanduser()
    output_dir.mkdir(parents=True, exist_ok=True)

    session_id = login(base_url, email, password)
    output_path, content_type = download_question(base_url, session_id, question_id, output_dir)
    print(f"Base baixada: {output_path}")
    print(f"Content-Type: {content_type}")


if __name__ == "__main__":
    main()
