# Plano de bases, cruzamentos e automacao semanal

Este documento resume a leitura inicial das planilhas recebidas e recomenda um modelo de dados mais seguro para automatizar atualizacoes semanais sem aumentar a lentidao do painel.

## Principio

As planilhas baixadas do SIAGE/Metabase devem ser tratadas como entradas semanais. O Supabase deve guardar os dados normalizados, com historico por lote de importacao. O frontend deve consumir visoes/resumos prontos, em vez de baixar planilhas grandes ou um `base.json` completo.

## Bases analisadas

- `BASE_PROFESSORES_ATIVOS.xlsx`: 13.225 vinculos professor-escola, com `GRE`, `INEP`, `ESCOLA`, `CPF`, `Docente`.
- `BASE_FORMACAO_DIRETORES.xlsx`: 599 linhas, uma por escola/formacao, com `INEP`, `NOME`, `MATRICULA`, `INSCRITO`, `Credenciado`.
- `BASE_FORMACAO_PROFESSORES.xlsx`: 12.786 linhas, com `GRE`, `INEP`, `Escola`, `Nome`, `E-mail`, `Conclusao (%)`, `Media`, `Resultado`.

## Achados principais

- Para escola, o melhor identificador e `INEP`.
- A base oficial de escolas usada pelo painel passa a ser derivada da `BASE_PROFESSORES_ATIVOS.xlsx`, agrupando professores por `INEP`, `GRE` e `ESCOLA`.
- Para professores, `Nome + INEP` nao e suficiente para automacao segura.
- A base de formacao de professores nao contem `CPF`. Isso dificulta acompanhar professor que muda de escola.
- Existem professores com vinculos em mais de uma escola na base de ativos. Portanto, conclusao de curso deve pertencer ao professor, e a escola deve ser um vinculo por lote/periodo.

## Decisao atual sobre professores

Nesta etapa, o cruzamento de professores sera feito por `NOME` normalizado, sem usar CPF como chave. A planilha `BASE_PROFESSORES_ATIVOS` pode conter CPF, mas a rotina criada para o sistema nao persiste CPF no Supabase.

Essa decisao reduz exposicao de dado sensivel no modelo atual, mas exige uma validacao importante: nomes repetidos, principalmente em mais de uma escola, devem aparecer como alerta antes de salvar o lote.

## Colunas minimas recomendadas

### Formacao de diretores

Se a regra for monitorar escola por formacao, o arquivo pode ser reduzido para:

- `INEP`
- `INSCRITO`
- `CREDENCIADO`
- `NOME` opcional
- `MATRICULA` opcional

`GRE` e `ESCOLA` podem vir da tabela de escolas pelo `INEP`, evitando duplicidade e divergencia.

### Formacao de professores

Para a regra atual, o arquivo pode ser trabalhado com:

- `NOME`
- `INEP`
- `CURSO` ou `CURSO_ID`
- `CONCLUSAO (%)`
- `MEDIA`
- `RESULTADO`
- `EMAIL` opcional
- `NOME` opcional

O cruzamento sera feito por `NOME` normalizado. O `INEP` continua importante para diagnostico e exibicao do vinculo atual, mas nao deve ser a chave principal do resultado do professor.

### Base de escolas derivada

- `INEP`
- `GRE`
- `ESCOLA`
- `NUMERO_DOCENTES`

Essa base e gerada automaticamente a partir da `BASE_PROFESSORES_ATIVOS`, contando quantos professores estao vinculados a cada INEP.

### Base de professores ativos

- `CPF`
- `NOME`
- `INEP`
- `GRE`
- `ESCOLA`
- `LOTE_ID` ou `DATA_REFERENCIA`

## Modelo recomendado no Supabase

### `import_lotes`

- `id`
- `tipo`
- `data_referencia`
- `status`
- `criado_em`
- `total_linhas`
- `erros`

### `escolas`

- `inep`
- `gre`
- `nome`
- `codigo_municipio`
- `municipio`
- `numero_docentes_atual`
- `atualizado_em`

### `professores`

- `id`
- `nome`
- `nome_key`
- `email`
- `atualizado_em`

Observacao: CPF nao deve ser persistido nesta etapa.

### `professor_vinculos`

- `id`
- `professor_id`
- `inep`
- `lote_id`
- `data_referencia`
- `ativo`

### `formacoes`

- `id`
- `nome`
- `publico`
- `tipo`
- `created_at`

### `cursos`

- `id`
- `formacao_id`
- `nome`
- `trilha`
- `carga_horaria`

### `curso_resultados`

- `id`
- `professor_id`
- `curso_id`
- `conclusao`
- `media`
- `resultado`
- `lote_id`
- `imported_at`

### `diretor_resultados`

- `id`
- `formacao_id`
- `inep`
- `nome`
- `matricula`
- `inscrito`
- `credenciado`
- `lote_id`
- `imported_at`

## Automacao semanal recomendada

1. Baixar as planilhas do Metabase/SIAGE.
2. Registrar um novo lote em `import_lotes`.
3. Validar cabecalhos obrigatorios.
4. Normalizar INEP, CPF, GRE, nomes e status.
5. Gerar e atualizar `escolas` a partir dos professores ativos.
6. Atualizar professores e vinculos.
7. Atualizar resultados de cursos/formacoes.
8. Gerar relatorio de diferencas:
   - escolas novas;
   - escolas removidas;
   - mudanca de numero de docentes;
   - professores novos;
   - professores removidos;
   - professores que mudaram de escola;
   - linhas sem chave obrigatoria.

## Ordem segura de implementacao

1. Criar importador local/manual usando essas planilhas, sem automatizar login ainda.
2. Criar tabelas e views no Supabase.
3. Adaptar o frontend para consumir views/resumos.
4. Reduzir ou eliminar o `base.json`.
5. Automatizar download do Metabase por navegador, ja com validacao e logs.

Essa ordem reduz risco porque primeiro estabiliza o modelo de dados; depois automatiza a coleta.
