# Spec: Criação de reserva direta

> feature: criacao-reserva-direta
> status: auditada

## Contexto

O usuário autenticado precisa reservar um equipamento diretamente, sem aprovação manual, enquanto a API protege os limites do usuário, o período permitido e a disponibilidade real do item.

## Histórias

### US-006 — Usuário reserva um equipamento

Como usuário autenticado, quero reservar um equipamento disponível para um período futuro, para garantir seu uso sem conflito com outra reserva ou manutenção.

#### AC-019 — Reserva exige autenticação

- **Dado** um visitante sem token válido
- **Quando** tenta criar uma reserva em `POST /api/reservations`
- **Então** a API recusa a operação com resposta 401 e não consulta nem altera reservas

#### AC-020 — Dados inválidos são recusados

- **Dado** um identificador de item inválido, datas inválidas, retirada não futura ou devolução anterior ou igual à retirada
- **Quando** o usuário tenta criar a reserva
- **Então** a API devolve resposta 400 e não cria a reserva

#### AC-021 — Usuário bloqueado não pode reservar

- **Dado** um usuário bloqueado manualmente ou com empréstimo ativo atrasado
- **Quando** tenta criar uma reserva
- **Então** a API devolve resposta 403 e não cria a reserva

#### AC-022 — Limite de reservas ativas impede nova reserva

- **Dado** um usuário cuja quantidade de reservas `SCHEDULED` ou `ACTIVE_LOAN` atingiu `max_concurrent_items`
- **Quando** tenta criar uma nova reserva
- **Então** a API devolve resposta 400 e não cria a reserva

#### AC-023 — Período não pode exceder o limite de dias

- **Dado** um período cuja duração excede `SystemSettings.max_rent_days`
- **Quando** o usuário tenta criar a reserva
- **Então** a API devolve resposta 400 e não cria a reserva

#### AC-024 — Equipamento precisa existir e estar ativo

- **Dado** um identificador de equipamento inexistente ou referente a um equipamento inativo
- **Quando** o usuário tenta criar a reserva
- **Então** a API devolve resposta 404 para item inexistente ou 409 para item inativo e não cria a reserva

#### AC-025 — Reserva sobreposta impede conflito de agenda

- **Dado** um equipamento com reserva `SCHEDULED` ou `ACTIVE_LOAN` sobreposta ao período solicitado
- **Quando** o usuário tenta criar a reserva
- **Então** a API devolve resposta 409 e não cria outra reserva

#### AC-026 — Manutenção sobreposta impede a reserva

- **Dado** um equipamento com manutenção aberta ou sobreposta ao período solicitado
- **Quando** o usuário tenta criar a reserva
- **Então** a API devolve resposta 409 e não cria a reserva

#### AC-027 — Reserva válida é criada diretamente

- **Dado** um usuário liberado, dentro dos limites, e um equipamento ativo sem conflitos
- **Quando** o usuário solicita um período futuro válido
- **Então** a API cria a reserva vinculada ao usuário autenticado com status `SCHEDULED` e devolve resposta 201

#### AC-028 — Criações simultâneas não geram reserva dupla

- **Dado** duas tentativas simultâneas para o mesmo equipamento e período
- **Quando** ambas verificam a disponibilidade
- **Então** a persistência serializa a verificação e a criação conforme a decisão ASM-006, permitindo no máximo uma reserva

#### AC-029 — Ausência de configuração usa limites padrão

- **Dado** que ainda não existe registro em `SystemSettings`
- **Quando** o usuário tenta criar uma reserva
- **Então** a API aplica os padrões de 14 dias e 3 itens simultâneos definidos no schema Prisma

## Fora de escopo

- Aprovação manual de reservas.
- Consulta do histórico e cancelamento de reservas, que pertencem à TASK-A04.
- Operações administrativas de retirada, devolução e manutenção.
- Telas e componentes do frontend.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-004 | A sobreposição usa a mesma regra já confirmada na A02: início existente menor que a devolução solicitada e fim existente maior que a retirada solicitada. | confirmada | Reutiliza a decisão e a prova da TASK-A02. |
| ASM-005 | Se `SystemSettings` ainda não existir, a API usa os padrões do schema Prisma: 14 dias e 3 itens simultâneos. | confirmada | Gustavo confirmou a recomendação em 05/11/2026. |
| ASM-006 | A checagem de conflito e a criação ocorrerão em transação serializável com nova tentativa controlada em caso de concorrência. | confirmada | Gustavo confirmou a recomendação em 05/11/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-001 | Quando o limite concorrente for atingido, a resposta deve ser 403 ou 400? | respondida | Gustavo confirmou 400; 403 fica reservado para bloqueio manual ou empréstimo atrasado. |
| Q-002 | Quais respostas usar para equipamento inexistente e equipamento inativo? | respondida | Gustavo confirmou 404 para inexistente e 409 para inativo. |
