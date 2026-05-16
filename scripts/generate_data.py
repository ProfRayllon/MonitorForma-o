import csv
import json
import random
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"C:\Users\rayllonp\Downloads\PROFESSORES PODE ESCOLA.xlsx")


def gre_order(value):
    digits = "".join(ch for ch in value if ch.isdigit())
    return int(digits or 0)


wb = openpyxl.load_workbook(SOURCE, data_only=True)
ws = wb.active

schools = []
for gre, inep, escola, professores in list(ws.iter_rows(values_only=True))[1:]:
    if gre and inep and escola:
        schools.append(
            {
                "gre": str(gre).strip(),
                "inep": str(inep).strip(),
                "escola": str(escola).strip(),
                "professores": int(professores or 0),
            }
        )

gres = sorted({school["gre"] for school in schools}, key=gre_order)
responsaveis = {gre: f"Gerente {gre.split('ª')[0].strip()}" for gre in gres}

events = [
    {
        "id": "formacao-avaliacao-2026",
        "nome": "Formacao Avaliacao e Aprendizagem",
        "publico": "professores",
        "data": "2026-06-12",
    },
    {
        "id": "encontro-representantes-2026",
        "nome": "Encontro de Representantes Escolares",
        "publico": "representantes",
        "data": "2026-06-28",
    },
]

random.seed(42)
inscricoes = []
for event in events:
    for school in schools:
        rate = 0.70 if event["publico"] == "professores" else 0.58
        inscrito = random.random() < rate
        credenciado = inscrito and random.random() < (
            0.72 if event["publico"] == "professores" else 0.64
        )
        participantes = 0

        if event["publico"] == "professores" and inscrito:
            participantes = max(
                1,
                min(
                    school["professores"],
                    int(school["professores"] * (0.18 + random.random() * 0.42)),
                ),
            )
        elif inscrito:
            participantes = 1

        inscricoes.append(
            {
                "eventoId": event["id"],
                "gre": school["gre"],
                "inep": school["inep"],
                "escola": school["escola"],
                "inscrito": inscrito,
                "credenciado": credenciado,
                "participantes": participantes,
            }
        )

participantes = []
seq = 10000
for item in inscricoes:
    event = next(event for event in events if event["id"] == item["eventoId"])
    for index in range(item["participantes"]):
        seq += 1
        participantes.append(
            {
                "eventoId": item["eventoId"],
                "gre": item["gre"],
                "inep": item["inep"],
                "escola": item["escola"],
                "matricula": f"MAT{seq}",
                "nome": f"Participante {seq}",
                "tipo": "Professor" if event["publico"] == "professores" else "Representante",
                "credenciado": item["credenciado"] and (index == 0 or random.random() < 0.88),
            }
        )

users = [
    {
        "nome": "Administrador",
        "email": "admin@formacao.pb.gov.br",
        "senha": "admin123",
        "perfil": "admin",
        "gre": "TODAS",
    }
]

for index, gre in enumerate(gres, 1):
    users.append(
        {
            "nome": responsaveis[gre],
            "email": f"gre{index:02d}@formacao.pb.gov.br",
            "senha": f"gre{index:02d}2026",
            "perfil": "regional",
            "gre": gre,
        }
    )

data_dir = ROOT / "data"
data_dir.mkdir(exist_ok=True)
(data_dir / "base.json").write_text(
    json.dumps(
        {
            "schools": schools,
            "events": events,
            "inscricoes": inscricoes,
            "participantes": participantes,
            "users": users,
            "responsaveis": responsaveis,
        },
        ensure_ascii=False,
        indent=2,
    ),
    encoding="utf-8",
)

templates_dir = ROOT / "templates"
templates_dir.mkdir(exist_ok=True)
with (templates_dir / "modelo_evento.csv").open("w", encoding="utf-8-sig", newline="") as file:
    writer = csv.writer(file)
    writer.writerow(
        [
            "eventoId",
            "eventoNome",
            "publico",
            "gre",
            "inep",
            "escola",
            "matricula",
            "nome",
            "inscrito",
            "credenciado",
        ]
    )
    for school in schools[:30]:
        writer.writerow(
            [
                "novo-evento-2026",
                "Nome do Evento",
                "professores",
                school["gre"],
                school["inep"],
                school["escola"],
                "MAT00001",
                "Nome do Participante",
                "SIM",
                "NAO",
            ]
        )

print(f"Geradas {len(schools)} escolas, {len(gres)} GREs e {len(participantes)} participantes.")
