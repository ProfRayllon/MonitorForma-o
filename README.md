# Monitoramento de Formacoes

Sistema responsivo para acompanhar formacoes por escola, GRE e INEP.

## Como rodar

```powershell
cd "C:\Users\rayllonp\Desktop\Monitoramento de eventos"
python -m http.server 8000 --bind 127.0.0.1
```

Abra `http://127.0.0.1:8000`.

## Acessos de teste

- Admin: `admin@formacao.pb.gov.br` / `admin123`
- Regional exemplo: `gre01@formacao.pb.gov.br` / `gre012026`

## Escopo atual

- A barra lateral tem apenas `Formacao` e, para admin, `Gerenciamento de usuarios`.
- `Gerenciamento de usuarios` permite visualizar, editar, adicionar e remover usuarios.
- `Formacao` permite escolher entre `Diretores` e `Professores`.
- A area de professores fica reservada para uma proxima etapa.
- O foco atual e `Formacao de Diretores`, sempre com a perspectiva de um representante por escola.

## Planilha da formacao de diretores

A planilha online deve ser publicada como CSV e pode conter:

```csv
GRE,INEP,ESCOLA,NOME,MATRICULA,INSCRITO,CREDENCIADO
```

O sistema cruza os registros pelo `INEP` com a base oficial de escolas. Se uma escola
aparecer mais de uma vez, ela fica sinalizada como duplicidade para revisao.
