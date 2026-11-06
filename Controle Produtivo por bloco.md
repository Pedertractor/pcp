# PCP — Integração e Monitoramento da Produção

## 1. Objetivo

Desenvolver uma plataforma para planejamento, acompanhamento e monitoramento dos processos produtivos da fábrica.

O sistema será integrado a duas consultas internas:

1. **Consulta de planejamento:** executada diariamente pela manhã, para identificar as OFs previstas para hoje e as OFs atrasadas.
2. **Consulta de execução:** executada a cada 5 minutos, para acompanhar processos iniciados e concluídos, atualizando as máquinas no mapa produtivo.

Cada ordem de fabricação deverá possuir um registro único **por bloco** no model `ProductionOrder`, independentemente da quantidade de processos associados a ela.

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
| `QTE` | Quantidade prevista (gravada em `ProductionOrder.quantity`; soma das OFs do bloco = peças esperadas hoje no bloco e por máquina) |
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
| `area` | Área de **uma peça** em m² (gravada em `ProductionOrder.area`; ver seção 2.7) |
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

A consulta também retorna OFs futuras (`NESTA SEMANA`, `PRÓXIMA SEMANA`, `NESTE MÊS`, `PRÓXIMO MÊS`, `MESES SEGUINTES`). O valor chega com pontos à esquerda (ex.: `......HOJE`, `.......NO ATRASO`), que são ignorados na comparação.

**Regra de importação:** somente OFs com `STATUS_DATA` igual a `HOJE` ou `NO ATRASO` são gravadas. As demais são descartadas na sincronização (o resultado informa a quantidade em `rowsSkippedByStatus`). A ideia é produzir tudo o que está previsto para hoje ou atrasado naquele processo do centro de custo.

| `STATUS_DATA` | `ProductionOrder.status` ao sincronizar |
|---|---|
| `HOJE` | `PENDING` |
| `NO ATRASO` | `OVERDUE` |

**Regra:** o sistema deverá preservar o valor original de `STATUS_DATA`, sem substituí-lo diretamente pelo enum interno.

### 2.4. Persistência dos registros

O model `ProductionOrder` armazenará as OFs recebidas da consulta.

Regras obrigatórias:

- **A OF nunca se repete dentro do mesmo bloco.** A chave única da `ProductionOrder` é o bloco + o número da OF (`blockId` + `ofNumber`, vindo de `OFAB`).
- **A mesma OF pode existir em blocos diferentes.** Por exemplo, a OF 123456 pode estar no bloco F e no bloco G; cada bloco tem o seu registro, com dados, status e data de sincronização próprios.
- Uma OF que ainda não existe no bloco deverá ser cadastrada nele.
- Uma OF que já existe no bloco não deverá gerar outro registro: ela é localizada pelo bloco + `ofNumber` e atualizada com o que veio na consulta (seção 2.5).
- Registros ausentes em uma consulta não deverão ser excluídos automaticamente.
- As datas deverão ser armazenadas como `DateTime` e exibidas no fuso horário da fábrica.
- Os registros deverão ser associados ao bloco correspondente por meio dos centros de custos configurados.

Caso a consulta retorne a mesma OF em diferentes operações, será necessário consolidar as informações mantendo uma única `ProductionOrder` e registros separados para seus processos.

### 2.5. Atualização da OF, data da sincronização e ciclo da OF

Cada `ProductionOrder` guarda em `syncDate` a data da última sincronização de planejamento que a trouxe (data de referência, início do dia local).

#### Como cada linha da consulta é tratada

1. A linha é descartada se o centro de custo não pertence ao bloco ou se o `STATUS_DATA` não é `HOJE` nem `NO ATRASO` (seção 2.3).
2. O sistema procura a OF pelo bloco da sincronização + `ofNumber`.
3. **OF nova no bloco:** é cadastrada no bloco com os dados da linha e `syncDate` = data da sincronização. Se a mesma OF existir em outro bloco, aquele registro não é afetado.
4. **OF já existente no bloco:** o mesmo registro é atualizado com os valores da linha. O que vier diferente passa a valer (máquina, `STATUS_DATA`, quantidade etc.), e a `syncDate` passa a ser a data desta sincronização.

#### Campos atualizados em uma OF existente

| Campo da consulta | Campo da `ProductionOrder` | Comportamento |
|---|---|---|
| `OFAB` | `ofNumber` | Chave única junto com o bloco. Nunca muda. |
| — | `blockId` | Bloco da sincronização. Chave única junto com `ofNumber`. Nunca muda. |
| `PRODUTO` | `partCode` | Atualizado com o valor recebido |
| `LINHA` | `line` | Atualizado com o valor recebido |
| `MAQUINA` | `machineId` | Atualizado. Se a máquina não existir, é criada sem posição (seção 5.2) |
| `COR` | `colorId` | Atualizado. A cor é vinculada ao catálogo `PaintColor` pelo nome |
| `AREA` | `area` | Atualizado com o valor recebido (m² por peça, número) |
| `OPERACAO` | `operation` | Atualizado com o valor recebido |
| `CCUSTO` | `costCenter` | Atualizado com o valor recebido (sempre um centro de custo do bloco) |
| `QTE` | `quantity` | Atualizado com o valor recebido |
| `STATUS_DATA` | `statusDate` | Atualizado com o valor original (ex.: de `HOJE` para `NO ATRASO`) |
| `STATUS_DATA` | `status` | Recalculado: `HOJE` → `PENDING`, `NO ATRASO` → `OVERDUE`. Exceção: OF `COMPLETED` continua `COMPLETED` |
| — | `syncDate` / `targetDate` | Data de referência da sincronização |

#### Exemplo: OF que não foi concluída no dia

| Sincronização | O que a consulta trouxe para a OF 123456 | Resultado no sistema |
|---|---|---|
| 05/11 | `HOJE`, máquina `M01` | Cria a OF: status `PENDING`, máquina `M01`, `syncDate` = 05/11 |
| 06/11 | Não foi concluída e volta como `NO ATRASO`, agora na máquina `M02` | Atualiza a mesma OF: `statusDate` = `NO ATRASO`, status `OVERDUE`, máquina `M02`, `syncDate` = 06/11 |
| 06/11 (de novo) | Mesmos dados | Nada é duplicado. A OF é regravada com os mesmos valores |
| — | Produção concluída no processo do centro de custo | A consulta de execução (seção 4) passa a OF para `COMPLETED` |

#### Regras

- A OF nunca é duplicada dentro do bloco, nem entre dias nem dentro da mesma sincronização.
- A sincronização de um bloco só cria e atualiza OFs daquele bloco. A mesma OF em outro bloco é um registro independente.
- A OF só passa para `COMPLETED` quando toda a produção dela naquele processo do centro de custo for concluída. A sincronização de planejamento nunca conclui uma OF.
- Se uma OF já `COMPLETED` voltar em uma sincronização, os dados de planejamento são atualizados, mas o status `COMPLETED` é mantido.
- Uma OF que não aparece em uma sincronização não é apagada nem alterada. Ela mantém a última `syncDate` em que apareceu.
- Se a mesma OF vier mais de uma vez na mesma consulta, vale a última linha lida.

### 2.6. Tela de OFs do bloco

Ao clicar no card **Produzido / esperado hoje** (ou equivalente na lateral do bloco), na tela do bloco, o sistema abre a lista das OFs do bloco (`/controle-produtivo/:blockId/ofs`), consumindo `GET /api/blocks/:id/production-orders`.

- O card mostra **produzido / esperado** em peças e em m². O **esperado** segue o planejamento: soma de `ProductionOrder.quantity` e de m² (seção 2.7), apenas OFs `HOJE` e `NO ATRASO`. O **produzido** vem dos **processos** (`ProductionProcess`) com **`DTH_FINAL` no dia civil atual** (servidor): soma da quantidade efetiva (`QTD_APT` se informado, senão `QTD`) e soma de m² = (m² por peça) × quantidade efetiva — m² por peça = `ProductionProcess.area` se existir, senão `ProductionOrder.area` da OF vinculada. A lista de OFs continua sendo só o esperado.
- Cada linha exibe OF, produto, máquina, cor, operação, centro de custo, quantidade, m² por peça, m² total da OF, `STATUS_DATA`, status interno e a data da sincronização.
- Abaixo dos totais, a mesma barra de filtros da tela de usuários (`CollapsibleFilters`): campos rotulados (OF, produto, máquina, cor, operação, centro de custo, status da data, status interno, sincronização) e botão de limpar. Em telas estreitas, use **Mostrar filtros**. O total de OFs, de peças e de m² acompanha o filtro.

### 2.7. Área esperada em m² (bloco de pintura)

A coluna `AREA` da consulta é a área de **uma peça**, em m². Para a pintura, o indicador principal é a área total a pintar.

Cálculo:

- **m² da OF** = `area` × `quantity`. Exemplo: OF com 8 peças de 0,333 m² = 8 × 0,333 = 2,664 m².
- **m² esperado da máquina** = soma do m² das OFs da máquina.
- **m² esperado do bloco** = soma do m² de todas as OFs do bloco (somente `HOJE` e `NO ATRASO`).

Regras:

- `area` é gravada como número (`Float`), arredondada em 4 casas decimais para eliminar resíduos de ponto flutuante do Excel (ex.: `0.29300000000000004` → `0.293`). Vírgula decimal também é aceita.
- OF sem `AREA` (vazia ou inválida) fica com `area` nula e entra com 0 m² na soma. As peças continuam sendo contadas normalmente.
- O m² não é gravado no banco: é sempre calculado a partir de `area` e `quantity`, para continuar correto quando a sincronização atualiza a quantidade ou a área da OF.
- Onde aparece o **esperado**: card lateral e lista de máquinas; a tela de OFs detalha por linha. O **produzido no dia** aparece no mesmo card e em cada máquina (formato `produzido / esperado`), desde que existam processos finalizados no dia e gravados em `ProductionProcess`.

Resultado com a planilha de teste do bloco F (28/10, centros de custo 02530 e 02540):

| Recorte | OFs | Peças | m² |
|---|---|---|---|
| Total do bloco | 1.650 | 5.803 | 12.444,26 |
| `NO ATRASO` | 1.399 | 4.599 | 10.140,42 |
| `HOJE` | 251 | 1.204 | 2.303,84 |
| CC 02530 | 722 | 1.961 | 6.429,79 |
| CC 02540 | 928 | 3.842 | 6.014,47 |

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

A OF atende aos critérios definidos de conclusão do **processo acompanhado no centro de custo** (consulta 2). No desenho atual: **para a OF monitorada no bloco, existe um processo correspondente**; quando esse processo aparece com **`DTH_INICIO` e `DTH_FINAL` preenchidos**, a execução daquele processo encerrou e a **`ProductionOrder` passa para `COMPLETED`** (seção 4.7).

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

### 4.2. Parâmetros (contrato da API)

A consulta recebe:

- **`date`:** data de referência no formato `AAAA-MM-DD`. Em produção, a rotina de 5 em 5 minutos usa **o dia corrente** (fuso da fábrica).
- **`costCenter`:** lista dos centros de custo dos processos monitorados — em geral a união dos centros de custo vinculados aos blocos ativos (normalizados com cinco dígitos, como `02805`).

Exemplo de corpo da requisição:

```json
{
  "date": "2026-10-21",
  "costCenter": ["02805", "08031"]
}
```

### 4.3. Formato do retorno

A API devolve um **array de processos**. Cada objeto espelha uma linha; os valores abaixo são exemplos (a API pode enviar `OFAB` como número ou string).

```json
[
  {
    "OFAB": 56719815,
    "OP": 5,
    "CC": "02805",
    "DTH_PLANEJADO": "2026-10-19T12:45:00.000Z",
    "QTD": 1,
    "QTD_APT": 0,
    "DTH_INICIO": "2026-10-21T12:45:00.000Z",
    "DTH_FINAL": null,
    "CRACHA": 202391,
    "COMP_COD": 409714,
    "COMP_QTE": 4,
    "MAQUINA": "MAQ-01",
    "COLOR": "AZUL",
    "AREA": "0,333"
  }
]
```

### 4.4. Regras da consulta (lado API)

Conforme especificação da consulta:

- Devolver processos cuja **`DTH_INICIO`** caia no **calendário da data informada** (considerar fuso da fábrica ao comparar instantes e dia civil).
- Devolver processos cuja **`DTH_FINAL`** caia nessa mesma data, **mesmo que `DTH_INICIO` seja de um dia anterior** (ex.: início dia 20, fim dia 21 — aparece na consulta do dia 21).
- Considerar todos os centros de custo enviados em `costCenter`.
- Processo **iniciado e concluído no mesmo dia** deve aparecer **apenas uma vez** na lista.
- Processo **ainda em execução** retorna com `DTH_FINAL: null`.

### 4.5. Campos retornados e persistência (`ProductionProcess`)

Cada linha é gravada no model `ProductionProcess` (seção 6), vinculada à `ProductionOrder` do bloco (`blockId` + `ofNumber`).

| Campo API | Significado | Campo no banco |
|---|---|---|
| `OFAB` | Número da OF | Resolve `ProductionOrder`; também `ofNumber` (texto) no processo |
| `OP` | Número da operação | `opNumber`. Uma OF tem **um processo por operação** no bloco: chave única `productionOrderId` + `opNumber` |
| `CC` | Centro de custo | `costCenter` |
| `DTH_PLANEJADO` | Data/hora planejada | `plannedAt` |
| `QTD` | Quantidade prevista no processo | `quantity` |
| `QTD_APT` | Quantidade apontada | `quantityReported` (usada na reconciliação com `QTE` da OF ao concluir — seção 4.7) |
| `DTH_INICIO` | Início da execução | `startedAt` |
| `DTH_FINAL` | Fim da execução | `finishedAt` (nulo = em andamento) |
| `CRACHA` | Crachá do colaborador | `badgeNumber` |
| `COMP_COD` | Código do componente | `componentCode` |
| `COMP_QTE` | Quantidade do componente | `componentQuantity` |
| `MAQUINA` | Código da máquina | `machineCode` + resolução de `machineId` (criar máquina sem posição se não existir, seção 5.2) |
| `COLOR` | Cor em execução | `colorName` + resolução de `colorId` em `PaintColor` (mesma regra do planejamento) |
| `AREA` | Área (string com vírgula no exemplo) | `area` como número (m² por peça), após parse |

A sincronização de processos faz **upsert** por OF + OP: atualiza horários, apontamentos e vínculos; não duplica linhas.

### 4.6. Regras de interpretação (aplicação)

**Processo pendente**

- Não possui início identificado.
- Não deverá ser exibido como uma execução ativa no mapa.

**Processo em andamento**

- `DTH_INICIO` preenchido.
- `DTH_FINAL` nulo ou vazio.
- O sistema deverá identificar a OF, a máquina e a cor produzida (consulta de processos).
- **Mapa do bloco de pintura:** o efeito visual (cor da peça na máquina) deve refletir o processo cuja **`DTH_INICIO` cair no dia da consulta** (`date`). Ou seja, é a cor **`COLOR` desse processo** que se aplica ao mapa quando há início naquele dia. Se houver mais de um processo ativo ou iniciado no dia para a mesma máquina, usar o de **início mais recente** (`DTH_INICIO` mais novo) até haver regra de negócio diferente.
- O mapa deverá exibir a execução na respectiva máquina com essa cor (via `PaintColor` e `BlockPaintColor.mapHex` quando configurado).

**Processo concluído**

- `DTH_INICIO` preenchido.
- `DTH_FINAL` preenchido.
- A execução deverá ser registrada como concluída.
- Os horários deverão ser preservados.
- O estado visual da máquina deverá ser atualizado.

**Processo atrasado**

O atraso deverá ser identificado considerando a data planejada e as regras de prazo do sistema.

Um processo pode estar simultaneamente atrasado e em andamento.

### 4.7. Atualização do status da OF, conclusão do processo e quantidade

Com os processos persistidos em `ProductionProcess`, a aplicação reconcilia com a **consulta 1** (planejamento) e a **consulta 2** (execução).

#### Status da OF em função do processo

- **`DTH_INICIO` preenchido e `DTH_FINAL` nulo:** processo em execução → a `ProductionOrder` deve ir para **`IN_PROGRESS`** (no escopo do CC monitorado).
- **`DTH_INICIO` e `DTH_FINAL` preenchidos:** o processo daquela OF **foi iniciado e encerrado** → houve processamento completo daquele registro de execução → a **`ProductionOrder` passa a `COMPLETED`**. Essa é a regra principal de conclusão: presença de início e fim no processo monitorado.

#### Quantidade planejada (`QTE`) vs quantidade do processo (`QTD` / `QTD_APT`)

Na consulta de **planejamento**, a quantidade esperada da OF vem em **`QTE`** e é gravada em `ProductionOrder.quantity`. Na consulta de **processos**, vêm **`QTD`** (prevista na execução) e **`QTD_APT`** (apontada).

Regra de negócio acordada com a fábrica:

- Ao concluir o processo (ambas as datas preenchidas), **comparar** a quantidade efetivamente tratada no processo com a quantidade da OF. Na prática: usar o valor que representar o **fechamento** do processo — em geral **`QTD_APT`** quando o processo está finalizado, ou o menor conjunto coerente com o apontamento final (confirmar com a API qual campo prevalece no encerramento).
- Se o processo **vier com quantidade menor** que a da OF (`ProductionOrder.quantity`, originada do `QTE`), **atualizar `ProductionOrder.quantity`** para essa quantidade **efetiva** (reflete o que realmente foi processado naquele fechamento).
- A **diferença** (peças planejadas e não processadas nessa OF) **não fica como saldo imaginário nesta OF**: o **ERP gera uma nova OF** com essa diferença. Essa nova OF **aparece na consulta de planejamento no dia seguinte** (ou no próximo ciclo), onde será importada como nova `ProductionOrder` — a aplicação **não precisa criar** essa OF localmente; apenas documenta que o planejamento trará o saldo.

Casos limite (a fechar com a fábrica):

- Processo concluído com `QTD_APT` igual ao `QTE`: apenas `COMPLETED`, sem alterar quantidade.
- Múltiplas operações (`OP`) para a mesma OF: se no futuro houver mais de um processo por OF, a regra de `COMPLETED` e de ajuste de quantidade deve considerar **qual OP** representa o processo do bloco ou se a OF só conclui quando **todos** os processos relevantes tiverem `DTH_FINAL`.

#### Processos que atravessam dias

- A consulta do dia traz **início hoje** ou **fim hoje**; um processo que começou ontem e **só termina hoje** aparece na consulta de hoje pelo `DTH_FINAL`, permitindo registrar a conclusão mesmo com início no dia anterior.
- Um processo que começou ontem e **continua aberto hoje** deve continuar retornando (por `DTH_INICIO` no dia anterior **ou** por política de “ainda abertos” — se a API só devolver o dia civil, o backend mantém cópias locais e não interpreta ausência pontual como fim da execução).

Exemplo:

- Início: 20/10/2026 às 15:00.
- Conclusão: 21/10/2026 às 09:00.

A consulta com `date: 2026-10-21` retorna esse processo pelo `DTH_FINAL`, alinhado às regras da seção 4.4.

### 4.8. Mapa: planejamento vs execução

- **Planejamento (consulta 1):** cor e máquina esperadas vêm da OF (`ProductionOrder` / última sincronização de planejamento).
- **Execução (consulta 2):** no **dia em que `DTH_INICIO` ocorre**, a cor exibida no mapa para aquele processo é a da linha de execução (`COLOR`), refletindo a cor da peça em produção naquele momento. Após conclusão (`DTH_FINAL`), o estado visual ativo some na máquina salvo se outro processo estiver em curso (seção 5).

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

### 5.1. Mapa do bloco (planta)

O mapa de cada bloco é a imagem da sua planta (`BlockPlanImage`).

- A planta é enviada dentro do bloco, pelo ícone de configuração no canto superior direito da tela (**Configurar mapa**).
- Formatos aceitos: PNG, JPG ou WEBP, até 15 MB.
- Cada bloco possui no máximo uma planta. Enviar uma nova imagem substitui a anterior, e o arquivo antigo é removido.
- A planta é apenas o fundo do mapa. As máquinas são desenhadas por cima dela, nas coordenadas `positionX` e `positionY`.

### 5.2. Cadastro automático de linhas e máquinas

Linhas e máquinas **não serão cadastradas manualmente**. Elas serão criadas pelo sistema a partir das consultas de OFs.

Fluxo previsto:

1. A consulta de planejamento (seção 2) retorna as OFs com os campos `linha` e `maquina`.
2. O bloco da OF é identificado pelo centro de custo, comparado com os `CostCenter` cadastrados nos blocos.
3. Se a linha informada ainda não existir no bloco, o sistema cria a `Line` (código único por bloco).
4. Se a máquina informada ainda não existir, o sistema cria a `Machine` ligada a essa linha, com o código recebido e o centro de custo da OF.
5. A máquina nasce **sem posição**: `positionX` e `positionY` ficam nulos.
6. A consulta de execução (seção 4) também pode trazer máquinas pelo campo `MAQUINA`. Se aparecer uma máquina ainda não cadastrada, ela é criada da mesma forma, sem posição.

Regras:

- O código da máquina é único. Uma máquina já existente nunca é duplicada: apenas é reutilizada.
- A criação deve ser idempotente: rodar a mesma sincronização novamente não gera linhas nem máquinas repetidas.
- Uma máquina não é apagada por deixar de aparecer nas consultas.
- Uma OF sem centro de custo vinculado a algum bloco não cria linha nem máquina. Ela deve ficar registrada para análise.

**Simulação (planilha / teste):** enquanto a consulta oficial não está integrada, é possível importar um `.xls` com o mesmo layout da consulta 1 via `POST /api/blocks/:id/planning-sync` (multipart: `file`, `referenceDate` AAAA-MM-DD, `costCenters` JSON ex. `["2530","2540"]`, opcional `assignDemoPositions=true` para posicionar máquinas em grade no mapa). Script local: `npm run sync:planning` no backend (usa a planilha do Downloads e o bloco cujo nome contém `F`). Centros de custo são normalizados com cinco dígitos (`2530` → `02530`, como na planilha).

### 5.3. Posicionamento das máquinas no mapa

O posicionamento acontece **depois** que as máquinas forem criadas pela sincronização.

1. No modo de configuração do mapa, o sistema lista as máquinas do bloco **ainda não posicionadas** (sem `positionX`/`positionY`).
2. O usuário arrasta cada máquina para o local correspondente na planta.
3. A posição é salva como percentual da imagem (0 a 100), para continuar correta em qualquer tamanho de tela e mesmo se a planta for substituída por uma versão com outra resolução.
4. Máquinas sem posição continuam recebendo OFs e processos normalmente. Elas apenas não aparecem no mapa até serem posicionadas.

Os detalhes da relação entre máquinas e mapa serão definidos na próxima etapa.

### Atualização visual

Quando um processo em andamento for identificado pela **consulta 2** (persistido em `ProductionProcess`):

1. Localizar a OF correspondente (`ProductionOrder`).
2. Identificar a máquina pelo código recebido em `MAQUINA`.
3. Verificar o bloco ao qual a máquina pertence.
4. Obter a cor informada em `COLOR` **desse processo** — no dia em que `DTH_INICIO` cair na data da consulta, é essa cor que vale para o efeito no mapa (seções 4.6 e 4.8).
5. Relacionar a cor com `PaintColor`, quando possível, e com `BlockPaintColor.mapHex` para o preenchimento visual.
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

Representa a OF **por bloco** cadastrada no sistema (chave `blockId` + `ofNumber`).

Armazena informações consolidadas de planejamento, produto, programação, prioridade temporal e status interno.

A chave única é `blockId` + `ofNumber`: a OF não se repete dentro do bloco, mas pode existir em outros blocos (seção 2.4).

O campo `syncDate` guarda a data da última sincronização que trouxe a OF (seção 2.5).

### ProductionProcess

Representa **um processo** retornado pela **consulta 2** (seção 4), ligado a uma `ProductionOrder` e a um `Block`. Uma OF pode ter **vários processos** (várias operações `OP`); cada combinação OF + OP no bloco é única.

Campos principais (espelho do JSON da API → nomes no Prisma):

| Conceito | Campo |
|---|---|
| OF | `productionOrderId`, `blockId`, `ofNumber` |
| Operação | `opNumber` (`OP`) |
| Centro de custo | `costCenter` (`CC`) |
| Planejado | `plannedAt` (`DTH_PLANEJADO`) |
| Quantidades | `quantity` (`QTD`), `quantityReported` (`QTD_APT`) |
| Execução | `startedAt` (`DTH_INICIO`), `finishedAt` (`DTH_FINAL`) |
| Colaborador / componente | `badgeNumber`, `componentCode`, `componentQuantity` |
| Máquina | `machineCode`, `machineId` |
| Cor (mapa quando início no dia) | `colorName`, `colorId` |
| Área | `area` (m² por peça, parse de string com vírgula se necessário) |

Chave única: **`productionOrderId` + `opNumber`**. A implementação do job a cada 5 minutos fará upsert a partir do retorno da API.

### Machine

Armazena o cadastro e a localização das máquinas no mapa.

É criada automaticamente pela sincronização das OFs, sem posição. A posição (`positionX`, `positionY`) é definida depois, manualmente, no mapa do bloco (seção 5.3).

### Line

Agrupa as máquinas de um bloco. É criada automaticamente pela sincronização a partir do campo `linha` das OFs, com código único dentro do bloco.

### BlockPlanImage

Armazena a imagem da planta do bloco, usada como fundo do mapa. Cada bloco possui no máximo uma.

### PaintColor

Armazena o catálogo de cores e marcas das tintas, permitindo associar as informações recebidas das consultas aos registros internos.

---

## 7. Sincronização automática

### Rotina matinal

1. Executar a consulta de planejamento.
2. Receber as OFs previstas para hoje e atrasadas.
3. Validar os dados.
4. Verificar os registros existentes.
5. Identificar o bloco pelo centro de custo e criar as linhas e máquinas ainda não cadastradas, sem posição no mapa (seção 5.2).
6. Criar as novas OFs.
7. Atualizar as OFs existentes pela chave bloco + `ofNumber`, aplicando os valores recebidos (máquina, `STATUS_DATA`, quantidade etc.) e a nova data de sincronização (seção 2.5).
8. Gravar a data da sincronização em `ProductionOrder.syncDate`, descartando as OFs que não estão como `HOJE` ou `NO ATRASO` (seções 2.3 e 2.5).
9. Preservar as classificações originais de `STATUS_DATA`.
10. Registrar o resultado da sincronização.

### Rotina de 5 em 5 minutos

1. Montar a lista de centros de custo a consultar (união dos centros dos blocos ativos, normalizados).
2. Chamar a consulta de processos com **`date` = dia corrente** (fuso da fábrica) e essa lista de `costCenter` (seção 4.2).
3. Para cada linha do retorno: localizar a `ProductionOrder` pelo bloco inferido de `CC` + `OFAB`; fazer **upsert** em `ProductionProcess` pela chave OF + `OP` (seção 4.5).
4. Resolver ou criar `Machine` pelo código `MAQUINA` e `PaintColor` por `COLOR` quando aplicável (seção 5.2).
5. Reconciliar processos abertos com o estado local: não tratar ausência isolada do retorno como fim de execução sem regra explícita (seção 4.7).
6. Atualizar `ProductionOrder.status`: `IN_PROGRESS` quando houver processo aberto; **`COMPLETED` quando o processo tiver `DTH_INICIO` e `DTH_FINAL`** (seção 4.7). Ajustar `ProductionOrder.quantity` se o apontado for menor que o `QTE` vigente (diferença volta como nova OF no planejamento do dia seguinte — seção 4.7).
7. Atualizar o mapa: para máquinas com processo em andamento ou iniciado no dia, usar a cor `COLOR` do processo conforme seções 4.6 e 4.8.
8. Notificar o frontend para refletir as alterações.
9. Registrar a última sincronização bem-sucedida.

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