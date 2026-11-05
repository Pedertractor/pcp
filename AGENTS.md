# PCP — Integração e Monitoramento da Produção

## 1. Objetivo

Desenvolver uma plataforma para planejamento, acompanhamento e monitoramento dos processos produtivos da fábrica.

O sistema será integrado a duas consultas internas:

1. **Consulta de planejamento:** executada diariamente pela manhã, para identificar as OFs previstas para hoje e as OFs atrasadas.
2. **Consulta de execução:** executada a cada 5 minutos, para acompanhar processos iniciados e concluídos, atualizando as máquinas no mapa produtivo.

Cada ordem de fabricação deverá possuir um registro único no model `ProductionOrder`, independentemente da quantidade de processos associados a ela.

---

## 2. Consulta 1 — Planejamento diário das OFs

### 2.1. Funcionamento

Esta consulta será executada automaticamente todos os dias pela manhã, em um horário configurável.

Seu objetivo é consultar a programação de produção e identificar:

- OFs previstas para o dia atual.
- OFs que estão em atraso.

Os registros recebidos deverão ser cadastrados ou atualizados no banco de dados, respeitando a unicidade do número da OF.

### 2.2. Campos retornados

| Campo | Descrição |
|---|---|
| `OFAB` | Número da ordem de fabricação |
| `PRODUTO` | Código do produto |
| `DESCRICAO` | Descrição do produto |
| `GRUPO` | Grupo do produto |
| `SA` | Campo SA da consulta |
| `QTE` | Quantidade prevista |
| `CCUSTO` | Centro de custo |
| `DTINI_PROC` | Data/hora de início do processo |
| `DTFIM_PROC` | Data/hora de finalização do processo |
| `CC_POS` | Campo CC_POS da consulta |
| `COMP_PENDENTE` | Componente pendente |
| `ESTOQUE_EXT` | Estoque externo |
| `STATUS_DATA` | Classificação da OF por data |
| `MSG` | Mensagem retornada pela consulta |
| `maquina` | Código da máquina |
| `linha` | Linha de produção |
| `cor` | Cor da produção |
| `tinta` | Tinta utilizada |
| `area` | Área produtiva |
| `dtcriacao` | Data de criação |
| `operacao` | Operação da OF |

Os significados exatos de `SA`, `CC_POS` e alguns campos específicos deverão ser confirmados na documentação da consulta interna.

Os nomes dos sete campos adicionais deverão seguir o contrato definitivo da API.

### 2.3. Status retornados pela consulta

O campo `STATUS_DATA` possui os seguintes valores identificados:

| Status | Significado |
|---|---|
| `HOJE` | OF prevista para o dia atual |
| `NO ATRASO` | OF classificada como atrasada |

Esses são os dois valores identificados até o momento. Caso a consulta retorne outros valores, eles deverão ser documentados e tratados explicitamente.

**Regra:** o sistema deverá preservar o valor original de `STATUS_DATA`, sem substituí-lo diretamente pelo enum interno.

### 2.4. Persistência dos registros

O model `ProductionOrder` armazenará as OFs recebidas da consulta.

Regras obrigatórias:

- `ofNumber` deverá ser único.
- Uma OF que ainda não existe deverá ser cadastrada.
- Uma OF existente não deverá gerar outro registro.
- Informações de planejamento poderão ser atualizadas conforme as regras de sincronização.
- Registros ausentes em uma consulta não deverão ser excluídos automaticamente.
- As datas deverão ser armazenadas como `DateTime` e exibidas no fuso horário da fábrica.
- Os registros deverão ser associados ao bloco correspondente por meio dos centros de custos configurados.

Caso a consulta retorne a mesma OF em diferentes operações, será necessário consolidar as informações mantendo uma única `ProductionOrder` e registros separados para seus processos.

---

## 3. Status internos da ordem de fabricação

O model `ProductionOrder` utilizará o enum:

```prisma
enum ProductionOrderStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  OVERDUE
}
```

### Regras de cada status

**PENDING — Pendente**

A OF está cadastrada e ainda não possui execução identificada para o processo acompanhado.

**IN_PROGRESS — Em andamento**

Existe uma operação ativa associada à OF, identificada por um início registrado sem uma conclusão correspondente.

**COMPLETED — Concluída**

A OF atende aos critérios definidos de conclusão das operações acompanhadas. A conclusão de uma única operação não deverá concluir toda a OF automaticamente.

**OVERDUE — Atrasada**

A OF ultrapassou sua data prevista e ainda não foi concluída.

O status `OVERDUE` deverá ser calculado considerando a data prevista e a situação da OF, com cuidado para não perder a informação de que uma operação atrasada continua em execução.

### Distinção entre os status

`STATUS_DATA` corresponde à classificação enviada pela consulta de planejamento.

`ProductionOrder.status` corresponde ao estado gerenciado pela aplicação.

Por exemplo, uma OF pode ter `STATUS_DATA = "NO ATRASO"` e, ao mesmo tempo, estar em execução.

Nessa situação, o sistema deverá conseguir representar tanto o atraso quanto a execução ativa.

---

## 4. Consulta 2 — Acompanhamento dos processos

### 4.1. Frequência

A consulta será executada automaticamente a cada **5 minutos**.

### 4.2. Parâmetros

A consulta receberá:

- Data de referência.
- Lista de centros de custos associados aos blocos cadastrados.

Exemplo:

```json
{
  "date": "2026-10-21",
  "costCenter": ["02805", "08031"]
}
```

### 4.3. Campos retornados

| Campo | Significado |
|---|---|
| `OFAB` | Número da OF |
| `OP` | Número da operação |
| `CC` | Centro de custo |
| `DTH_PLANEJADO` | Data/hora planejada |
| `QTD` | Quantidade prevista |
| `QTD_APT` | Quantidade apontada |
| `DTH_INICIO` | Início da execução |
| `DTH_FINAL` | Fim da execução |
| `CRACHA` | Crachá do colaborador |
| `COMP_COD` | Código do componente |
| `COMP_QTE` | Quantidade do componente |
| `MAQUINA` | Máquina responsável |
| `COLOR` | Cor da produção |
| `AREA` | Área produtiva |

### 4.4. Regras de interpretação

**Processo pendente**

- Não possui início identificado.
- Não deverá ser exibido como uma execução ativa no mapa.

**Processo em andamento**

- `DTH_INICIO` preenchido.
- `DTH_FINAL` nulo ou vazio.
- O sistema deverá identificar a OF, a máquina e a cor produzida.
- O mapa deverá exibir a execução na respectiva máquina.

**Processo concluído**

- `DTH_INICIO` preenchido.
- `DTH_FINAL` preenchido.
- A execução deverá ser registrada como concluída.
- Os horários deverão ser preservados.
- O estado visual da máquina deverá ser atualizado.

**Processo atrasado**

O atraso deverá ser identificado considerando a data planejada e as regras de prazo do sistema.

Um processo pode estar simultaneamente atrasado e em andamento.

### 4.5. Processos que atravessam dias

Exemplo:

- Início: 20/10/2026 às 15:00.
- Conclusão: 21/10/2026 às 09:00.

Se a consulta estiver filtrando o dia 21/10/2026, deverá reconhecer a conclusão mesmo que o início tenha ocorrido no dia anterior.

Também pode existir um processo que começou ontem e continua em andamento hoje.

Nesse caso, ele poderá não aparecer em uma consulta limitada a eventos iniciados ou concluídos hoje.

Por isso, o sistema deverá preservar as execuções abertas e reconciliá-las posteriormente com a consulta, sem interpretar ausência de retorno como conclusão.

---

## 5. Monitoramento das máquinas no mapa

Cada bloco possuirá sua imagem de planta e suas máquinas cadastradas.

O model `Machine` armazenará:

- Identificador da máquina.
- Código da máquina.
- Centro de custo.
- Coordenada horizontal (`positionX`).
- Coordenada vertical (`positionY`).
- Relacionamento com a linha produtiva.

### Atualização visual

Quando um processo em andamento for identificado:

1. Localizar a OF correspondente.
2. Identificar a máquina pelo código recebido em `MAQUINA`.
3. Verificar o bloco ao qual a máquina pertence.
4. Obter a cor informada em `COLOR`.
5. Relacionar a cor com `PaintColor`, quando possível.
6. Atualizar a representação visual da máquina no mapa.

Informações exibidas:

- Código da máquina.
- Número da OF.
- Cor em produção.
- Operação.
- Horário de início.
- Estado da execução.

Caso a cor recebida não exista no cadastro `PaintColor`, o nome original deverá continuar disponível, sem atribuir automaticamente uma cor visual incorreta.

Quando a execução for concluída, a indicação ativa deverá ser removida ou substituída, desde que não exista outra execução em andamento naquela máquina.

**A ausência de uma máquina no resultado da consulta não significa que ela está disponível.**

---

## 6. Estrutura de persistência

### ProductionOrder

Representa a OF única cadastrada no sistema.

Armazena informações consolidadas de planejamento, produto, programação, prioridade temporal e status interno.

O identificador `ofNumber` será único.

### ProductionProcess

Representa os processos ou execuções associados às OFs.

Cada registro poderá armazenar:

- OF relacionada.
- Número da operação.
- Centro de custo.
- Código da máquina.
- Quantidade prevista e apontada.
- Data planejada.
- Data de início.
- Data de finalização.
- Cor da produção.
- Crachá do colaborador.
- Código e quantidade do componente.
- Data da última sincronização.

A identidade de uma execução deverá ser definida conforme as garantias fornecidas pela API, considerando que a mesma OF pode passar por diferentes operações e que uma operação pode possuir múltiplos apontamentos.

### Machine

Armazena o cadastro e a localização das máquinas no mapa.

### PaintColor

Armazena o catálogo de cores e marcas das tintas, permitindo associar as informações recebidas das consultas aos registros internos.

---

## 7. Sincronização automática

### Rotina matinal

1. Executar a consulta de planejamento.
2. Receber as OFs previstas para hoje e atrasadas.
3. Validar os dados.
4. Verificar os registros existentes.
5. Criar as novas OFs.
6. Atualizar os registros existentes.
7. Preservar as classificações originais de `STATUS_DATA`.
8. Registrar o resultado da sincronização.

### Rotina de 5 em 5 minutos

1. Identificar os centros de custos cadastrados nos blocos.
2. Executar a consulta de processos para a data de referência.
3. Identificar os processos iniciados e concluídos.
4. Localizar ou atualizar os registros de execução.
5. Manter os processos ainda abertos.
6. Atualizar o status das OFs conforme as regras definidas.
7. Atualizar as informações de produção nas máquinas.
8. Notificar o frontend para refletir as alterações.
9. Registrar a última sincronização realizada.

As rotinas deverão ser idempotentes, ou seja, executar a mesma sincronização novamente não poderá gerar duplicidades nem corromper os dados existentes.

### Regras de segurança da sincronização

- Não apagar OFs por ausência de retorno.
- Não concluir processos sem evidência de finalização.
- Não substituir dados mais recentes por dados antigos.
- Evitar execuções simultâneas conflitantes da mesma rotina.
- Registrar falhas de comunicação com a API.
- Preservar o último estado conhecido durante indisponibilidade da consulta.
- Exibir ao usuário o horário da última atualização bem-sucedida.

---

## 8. Resultado esperado

O sistema deverá permitir que o PCP acompanhe, em um único ambiente:

- OFs previstas para hoje.
- OFs atrasadas.
- OFs pendentes.
- OFs em andamento.
- OFs concluídas.
- Processos iniciados e finalizados.
- Quantidades previstas e apontadas.
- Máquinas com execução ativa.
- Cores e tintas em produção.
- Histórico produtivo por OF, máquina e centro de custo.

O objetivo é centralizar o planejamento e a execução produtiva, com informações atualizadas periodicamente e representadas visualmente no mapa da fábrica.