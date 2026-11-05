# Spec: Catálogo e disponibilidade de equipamentos

> feature: catalogo-disponibilidade
> status: auditada

## Contexto

O usuário precisa consultar as categorias e os equipamentos ativos, filtrar o catálogo e saber se cada item pode ser reservado no período desejado.

## Histórias

### US-004 — Usuário consulta o catálogo

Como usuário, quero consultar categorias e equipamentos ativos, para encontrar o recurso que preciso reservar.

#### AC-011 — Categorias são listadas

- **Dado** que existem categorias cadastradas
- **Quando** o usuário consulta `GET /api/categories`
- **Então** a API devolve resposta 200 com todas as categorias

#### AC-012 — Somente equipamentos ativos aparecem

- **Dado** que existem equipamentos ativos e inativos
- **Quando** o usuário consulta `GET /api/items`
- **Então** a API devolve resposta 200 somente com equipamentos cujo `is_active` é verdadeiro e inclui os dados da categoria

#### AC-013 — Catálogo pode ser filtrado por categoria

- **Dado** um identificador válido de categoria
- **Quando** o usuário consulta os equipamentos com `category_id`
- **Então** a API devolve apenas os equipamentos ativos daquela categoria

### US-005 — Usuário verifica a disponibilidade

Como usuário, quero informar retirada e devolução, para saber quais equipamentos estão livres no período.

#### AC-014 — Reserva sobreposta deixa o item indisponível

- **Dado** um equipamento com reserva `SCHEDULED` ou `ACTIVE_LOAN` que se sobrepõe ao período consultado
- **Quando** o usuário consulta a disponibilidade
- **Então** a API devolve o equipamento com `is_available` igual a falso

#### AC-015 — Manutenção sobreposta deixa o item indisponível

- **Dado** um equipamento com manutenção aberta ou sobreposta ao período consultado
- **Quando** o usuário consulta a disponibilidade
- **Então** a API devolve o equipamento com `is_available` igual a falso

#### AC-016 — Item sem conflito fica disponível

- **Dado** um equipamento ativo sem reserva ou manutenção sobreposta
- **Quando** o usuário consulta a disponibilidade
- **Então** a API devolve o equipamento com `is_available` igual a verdadeiro

#### AC-017 — Período incompleto ou invertido é recusado

- **Dado** apenas uma das datas, uma data inválida ou uma devolução anterior ou igual à retirada
- **Quando** o usuário consulta os equipamentos
- **Então** a API devolve resposta 400 e não consulta a disponibilidade

#### AC-018 — Consulta sem período mostra a situação atual

- **Dado** um equipamento ativo atualmente emprestado ou em manutenção sem conclusão
- **Quando** o usuário consulta os equipamentos sem informar datas
- **Então** a API devolve o equipamento com `is_available` igual a falso

## Fora de escopo

- Criação e cancelamento de reservas.
- Regras de limite e bloqueio do usuário.
- Cadastro, edição ou manutenção administrativa de equipamentos.
- Telas e componentes do frontend.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-002 | `pickup_date` e `return_date` devem ser enviadas juntas; período incompleto ou invertido retorna 400. | confirmada | Gustavo confirmou a recomendação em 05/11/2026. |
| ASM-003 | Sem período, `is_available` representa a situação atual: empréstimo `ACTIVE_LOAN` ou manutenção com `end_date` nulo torna o item indisponível. | confirmada | Gustavo confirmou a recomendação em 05/11/2026. |

## Perguntas em aberto

Nenhuma.
