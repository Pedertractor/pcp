# PCP — PMP (Plano Mestre de Produção)

> **Status:** em breve. Este documento reserva o escopo do módulo e será detalhado quando as regras forem definidas.

## 1. Objetivo

O PMP é o segundo módulo da home do PCP, ao lado do **Controle Produtivo por bloco**.

Enquanto o Controle Produtivo acompanha a **execução** (OFs do dia, atrasadas e processos em andamento nas máquinas), o PMP cuida do **planejamento**: o que deve ser produzido, quanto e quando, considerando a capacidade de cada bloco.

---

## 2. Relação com o Controle Produtivo

| | PMP | Controle Produtivo por bloco |
|---|---|---|
| Horizonte | Semanas / meses | Dia atual e atrasos |
| Pergunta | O que vamos produzir? | O que está sendo produzido? |
| Unidade | Produto / demanda | OF / máquina / linha |
| Origem dos dados | A definir | Consultas de planejamento e execução |

A ideia é que o PMP alimente a programação, e o Controle Produtivo mostre se o planejado está sendo cumprido em cada bloco.

---

## 3. Na home

- A home exibe dois cards lado a lado, cada um ocupando metade da tela, sem rolagem.
- O card **PMP** aparece com o selo **Em breve** e não é clicável.
- Quando o módulo for liberado, o card passa a ter imagem própria, descrição final e link para a tela do PMP, no mesmo padrão visual do Controle Produtivo.

---

## 4. Pontos a definir

- [ ] Fonte da demanda (pedidos, previsão de vendas, consulta interna).
- [ ] Horizonte e granularidade do plano (semanal, mensal).
- [ ] Como a capacidade dos blocos, linhas e máquinas será calculada.
- [ ] Relação entre o plano e as OFs geradas.
- [ ] Indicadores de aderência: planejado × realizado por bloco.
- [ ] Perfis de acesso (quem cria, aprova e consulta o plano).
- [ ] Models necessários no banco.
