# Spec: Histórico próprio e cancelamento de reserva

> feature: historico-cancelamento-reserva
> status: auditada

## Contexto

O usuário autenticado precisa acompanhar todas as suas reservas e cancelar uma reserva ainda agendada, sem consultar ou alterar reservas de outras pessoas.

## Histórias

### US-007 — Usuário consulta suas reservas

Como usuário autenticado, quero consultar minhas reservas e os dados dos equipamentos, para acompanhar agendamentos, empréstimos e histórico.

#### AC-030 — Histórico próprio exige autenticação

- **Dado** um visitante sem token válido
- **Quando** consulta `GET /api/reservations/my-reservations`
- **Então** a API devolve resposta 401 e não consulta reservas

#### AC-031 — Histórico contém somente reservas do usuário

- **Dado** um usuário autenticado com reservas cadastradas
- **Quando** consulta seu histórico
- **Então** a API devolve resposta 200 apenas com reservas cujo `user_id` pertence ao token e inclui item, categoria e empréstimo

#### AC-032 — Histórico vazio é uma resposta válida

- **Dado** um usuário autenticado sem reservas
- **Quando** consulta seu histórico
- **Então** a API devolve resposta 200 com a lista `reservations` vazia

#### AC-033 — Histórico tem ordem previsível

- **Dado** um usuário com reservas criadas em momentos diferentes
- **Quando** consulta seu histórico
- **Então** a API ordena as reservas da mais recente para a mais antiga por `created_at`

### US-008 — Usuário cancela uma reserva agendada

Como usuário autenticado, quero cancelar uma reserva própria ainda agendada, para liberar o equipamento quando não precisar mais dele.

#### AC-034 — Cancelamento exige autenticação

- **Dado** um visitante sem token válido
- **Quando** solicita `PATCH /api/reservations/:id/cancel`
- **Então** a API devolve resposta 401 e não consulta nem altera reservas

#### AC-035 — Identificador inválido é recusado

- **Dado** um identificador de reserva que não é UUID
- **Quando** o usuário solicita o cancelamento
- **Então** a API devolve resposta 400 e não altera reservas

#### AC-036 — Reserva própria agendada pode ser cancelada

- **Dado** uma reserva `SCHEDULED` pertencente ao usuário autenticado
- **Quando** solicita o cancelamento
- **Então** a API altera o status para `CANCELLED` e devolve resposta 200 com `{ reservation }`, incluindo item, categoria e empréstimo

#### AC-037 — Reserva retirada ou finalizada não pode ser cancelada

- **Dado** uma reserva própria cujo status não é `SCHEDULED`
- **Quando** o usuário solicita o cancelamento
- **Então** a API devolve resposta 400 e mantém o status existente

#### AC-038 — Reserva inexistente ou de outro usuário não é exposta

- **Dado** um identificador inexistente ou pertencente a outro usuário
- **Quando** o usuário solicita o cancelamento
- **Então** a API devolve a mesma resposta 404 nos dois casos e não altera a reserva

#### AC-039 — Cancelamento concorrente preserva o estado

- **Dado** duas tentativas de cancelamento da mesma reserva agendada
- **Quando** as solicitações ocorrem simultaneamente
- **Então** a alteração condicionada definida em ASM-009 permite somente uma transição de `SCHEDULED` para `CANCELLED`

## Fora de escopo

- Criação de reservas, concluída na TASK-A03.
- Alteração das datas ou do equipamento de uma reserva.
- Cancelamento administrativo, retirada, devolução ou marcação de não comparecimento.
- Paginação e filtros do histórico.
- Telas e componentes do frontend.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-007 | O histórico é ordenado da reserva mais recente para a mais antiga por `created_at`. | confirmada | Gustavo confirmou a recomendação em 05/11/2026. |
| ASM-008 | O cancelamento bem-sucedido retorna 200 com `{ reservation }`, incluindo item, categoria e loan. | confirmada | Gustavo confirmou a recomendação em 05/11/2026. |
| ASM-009 | O cancelamento usa uma atualização atômica condicionada por `id`, `user_id` e status `SCHEDULED`, impedindo duas transições concorrentes. | confirmada | Gustavo confirmou a recomendação em 05/11/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-003 | Reserva inexistente e reserva de outro usuário devem responder igualmente com 404 para não revelar dados alheios? | respondida | Gustavo confirmou a resposta 404 para os dois casos. |
