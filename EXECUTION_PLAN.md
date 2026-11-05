# Plano de Execução (Design Tasks Harness) — ReservaLab

> **Status Atual:** A **Fase 0 (CORE)** já foi 100% concluída e testada. As **Trilhas A e B** podem ser executadas em paralelo por desenvolvedores independentes.
>
> **Divisão confirmada em 04/11/2026:** Gustavo é responsável pela **Trilha A (Módulo do Usuário)**. O amigo desenvolvedor é responsável pela **Trilha B (Módulo Administrador)**.

---

## Divisão de Responsabilidades da Dupla

```
                ┌──────────────────────────────────────┐
                │        FASE 0 (CORE) [CONCLUÍDO]     │
                │ Base Express, Prisma/Supabase, Auth  │
                └──────────────────┬───────────────────┘
                                   │
                 ┌─────────────────┴─────────────────┐
                 ▼                                   ▼
┌─────────────────────────────────┐ ┌─────────────────────────────────┐
│     TRILHA A (Gustavo)          │ │     TRILHA B (Amigo dev)        │
│ Módulo Usuário                  │ │ Módulo Administrador            │
│                                 │ │                                 │
│ - Auth (Register / Login / Me)  │ │ - CRUD Categorias & Itens       │
│ - Status Dinâmico (Badge)       │ │ - Manutenção de Equipamentos    │
│ - Catálogo & Disponibilidade    │ │ - Painel Diário: Retiradas      │
│ - Reserva Direta (Sem aprovação)│ │ - Painel Diário: Devoluções     │
│ - Minhas Reservas & Cancelamento│ │ - Regras Globais (SystemSettings│
│ - Testes de Integração API      │ │ - Gestão & Bloqueio de Usuários │
│                                 │ │ - Testes de Integração API      │
└─────────────────────────────────┘ └─────────────────────────────────┘
```

---

## TRILHA A: Módulo do Usuário (Jornada do Usuário Comum)
> **Responsável:** Gustavo
> **Foco:** Autoatendimento de reservas, catálogo dinâmico, status dinâmico do usuário e histórico pessoal.

### Back-end (Endpoints & Regras de Negócio — Trilha A)

#### `TASK-A01` — Endpoints de Registro, Login e Status do Usuário
- **Arquivos:** `server/src/controllers/auth.controller.ts`, `server/src/routes/auth.routes.ts`, `server/src/schemas/auth.schema.ts`
- **Passos:**
  1. `POST /api/auth/register`:
     - Validação Zod: `name`, `email` válido, `password` (mín. 6 chars).
     - Verificar se e-mail já existe (retornar 409 se duplicado).
     - Gerar hash com bcrypt e salvar usuário (`role: USER`, `is_manually_blocked: false`).
  2. `POST /api/auth/login`:
     - Validar credenciais. Se inválido, retornar 401.
     - Retornar token JWT contendo `{ id, role, email }` e dados do usuário.
  3. `GET /api/auth/me`:
     - Rota autenticada (`authMiddleware`).
     - **Cálculo sistêmico do Status Dinâmico:**
       - **Bloqueado:** se `is_manually_blocked === true` OU possuir empréstimo ativo (`ACTIVE_LOAN`) com `expected_return_at < now` (atraso não devolvido).
       - **Limite Atingido:** se reservas ativas (`SCHEDULED` ou `ACTIVE_LOAN`) forem `>= SystemSettings.max_concurrent_items`.
       - **Liberado:** caso contrário.

#### `TASK-A02` — Endpoints de Consulta do Catálogo e Disponibilidade
- **Arquivos:** `server/src/controllers/catalog.controller.ts`, `server/src/routes/catalog.routes.ts`
- **Passos:**
  1. `GET /api/categories`: Listar todas as categorias cadastradas.
  2. `GET /api/items`:
     - Listar itens com `is_active: true`.
     - Suportar filtro por `category_id`.
     - Suportar filtro por período: query params `pickup_date` e `return_date`.
     - Marcar item como disponível verificando que não há reserva sobreposta (`SCHEDULED` ou `ACTIVE_LOAN`) nem `MaintenanceRecord` ativo no período.

#### `TASK-A03` — Endpoint de Criação de Reserva Direta (Sem aprovação manual)
- **Arquivos:** `server/src/controllers/reservation.controller.ts`, `server/src/services/reservation.service.ts`, `server/src/schemas/reservation.schema.ts`
- **Passos:**
  1. `POST /api/reservations`:
     - Validação Zod: `item_id`, `expected_pickup_at`, `expected_return_at`.
     - **Regra 1:** `expected_pickup_at` deve ser futura e `expected_return_at > expected_pickup_at`.
     - **Regra 2 (Tempo Máximo):** `(return - pickup)` em dias <= `SystemSettings.max_rent_days` (retornar 400 se exceder).
     - **Regra 3 (Status do Usuário):** Rejeitar com 403 se usuário estiver `Bloqueado` ou `Limite Atingido`.
     - **Regra 4 (Limite Concorrente):** Rejeitar com 400 se reservas ativas do usuário atingiram `max_concurrent_items`.
     - **Regra 5 (Conflito de Agenda):** Rejeitar com 409 se o item já estiver reservado no período ou em manutenção.
     - Criar com `status: SCHEDULED` e retornar HTTP 201.

#### `TASK-A04` — Histórico Próprio e Cancelamento de Reserva
- **Arquivos:** `server/src/controllers/reservation.controller.ts`, `server/src/routes/reservation.routes.ts`
- **Passos:**
  1. `GET /api/reservations/my-reservations`: Retornar reservas do usuário logado (`req.user.id`) incluindo dados do item, categoria e loan.
  2. `PATCH /api/reservations/:id/cancel`: Cancelar reserva própria apenas se o status for `SCHEDULED` (atualiza para `CANCELLED`). Retornar 400 se já retirada ou finalizada.

#### `TASK-A05` — Testes Automatizados da Trilha A (Jest + Supertest)
- **Arquivos:** `server/tests/integration/user-journey.test.ts`
- **Cenários obrigatórios:** Cadastro, login, cálculo de status dinâmico, criação de reserva com sucesso, bloqueio por conflito de data (409), bloqueio por exceder `max_rent_days`, cancelamento de reserva pelo próprio usuário.

### Front-end (Telas e Componentes — Trilha A)

#### `TASK-A06` — Telas de Autenticação (Login e Cadastro)
- **Arquivos:** `reserva-lab/src/pages/Login.tsx`, `reserva-lab/src/pages/Register.tsx`
- **Passos:** Formulários integrados com `POST /api/auth/login` e `POST /api/auth/register`, salvando token e atualizando `AuthContext`.

#### `TASK-A07` — Catálogo de Equipamentos e Modal de Reserva Direta
- **Arquivos:** `reserva-lab/src/pages/CatalogPage.tsx`, `reserva-lab/src/components/ItemCard.tsx`, `reserva-lab/src/components/ReservationModal.tsx`
- **Passos:** Seletor de período (datas de retirada e devolução), listagem com busca e filtro por categoria, card do item com badge de disponibilidade, modal de confirmação direta com feedback de erro em caso de conflito.

#### `TASK-A08` — Tela "Minhas Reservas e Histórico"
- **Arquivos:** `reserva-lab/src/pages/MyReservationsPage.tsx`
- **Passos:** Listagem com abas ("Agendadas", "Em Andamento", "Concluídas/Canceladas") e botão de "Cancelar Reserva" para itens com status `SCHEDULED`.

---

## TRILHA B: Módulo do Administrador (Gestão & Painel Diário)
> **Responsável:** Amigo desenvolvedor
> **Foco:** Painel diário operacional (retiradas e devoluções), CRUD de ativos/categorias, regras do sistema e penalidades.

### Back-end (Endpoints & Regras de Negócio — Trilha B)

#### `TASK-B01` — CRUD de Categorias e Equipamentos (Restrito a Admin)
- **Arquivos:** `server/src/controllers/admin/category.controller.ts`, `server/src/controllers/admin/item.controller.ts`, `server/src/routes/admin.routes.ts`
- **Passos:**
  1. `POST /api/admin/categories`, `PUT /api/admin/categories/:id`, `DELETE /api/admin/categories/:id`.
  2. `POST /api/admin/items`: criar item com `name`, `patrimony_code` (validar unicidade, 409 se duplicado) e `category_id`.
  3. `PUT /api/admin/items/:id`: atualizar dados cadastrais do item.
  4. `PATCH /api/admin/items/:id/status`: alternar `is_active` (ativar/desativar item).

#### `TASK-B02` — Gestão de Manutenção de Equipamentos
- **Arquivos:** `server/src/controllers/admin/maintenance.controller.ts`
- **Passos:**
  1. `POST /api/admin/items/:id/maintenance`: registrar envio criando `MaintenanceRecord` (`description`, `start_date`, `end_date` opcional). Bloquear se houver empréstimo ativo.
  2. `PATCH /api/admin/maintenance/:id/conclude`: preencher `end_date` com data atual, liberando o item.

#### `TASK-B03` — Painel Operacional Diário: Ativos a Separar e Retiradas
- **Arquivos:** `server/src/controllers/admin/dashboard.controller.ts`, `server/src/controllers/admin/loan.controller.ts`
- **Passos:**
  1. `GET /api/admin/dashboard/daily-pickups`: listar reservas `SCHEDULED` com retirada prevista para hoje (ou atrasadas).
  2. `POST /api/admin/loans/pickup`: receber `{ reservation_id }`, criar registro em `Loan` (`actual_pickup_at = now()`) e mudar status da `Reservation` para `ACTIVE_LOAN`.
  3. `PATCH /api/admin/reservations/:id/no-show`: atualizar status da reserva para `NO_SHOW` (não comparecimento).

#### `TASK-B04` — Painel Operacional Diário: Devoluções do Dia e Ocorrências
- **Arquivos:** `server/src/controllers/admin/loan.controller.ts`
- **Passos:**
  1. `GET /api/admin/dashboard/daily-returns`: listar reservas `ACTIVE_LOAN` com retorno previsto para hoje ou em atraso.
  2. `POST /api/admin/loans/:id/return`: receber `{ return_observation?: string }`, registrar `actual_return_at = now()`, gravar observação de avaria/estado em texto e mudar status para `COMPLETED`.

#### `TASK-B05` — Gestão de Regras do Sistema, Usuários e Histórico Geral
- **Arquivos:** `server/src/controllers/admin/settings.controller.ts`, `server/src/controllers/admin/user-admin.controller.ts`
- **Passos:**
  1. `GET /api/admin/settings` e `PUT /api/admin/settings`: consultar e alterar `max_rent_days` e `max_concurrent_items` de `SystemSettings` (validar inteiros > 0).
  2. `GET /api/admin/users`: listar usuários com status dinâmico e contagem de empréstimos.
  3. `PATCH /api/admin/users/:id/toggle-block`: alternar `is_manually_blocked` do usuário.
  4. `GET /api/admin/loans/history`: histórico completo com filtros por período, patrimônio e usuário.

#### `TASK-B06` — Testes Automatizados da Trilha B (Jest + Supertest)
- **Arquivos:** `server/tests/integration/admin-journey.test.ts`
- **Cenários obrigatórios:** Retorno 403 para não-admin, CRUD de categorias e itens (unicidade de patrimônio), fluxo de retirada (criação de `Loan` e status `ACTIVE_LOAN`), marcação de `NO_SHOW`, conclusão de devolução com observação e status `COMPLETED`, atualização de `SystemSettings`, alternância de bloqueio manual.

### Front-end (Telas e Componentes — Trilha B)

#### `TASK-B07` — Dashboard Operacional Diário (Retiradas e Devoluções)
- **Arquivos:** `reserva-lab/src/pages/admin/AdminDashboardPage.tsx`, componentes de abas.
- **Passos:** Aba de Retiradas do Dia (botões "Registrar Retirada" e "Marcar Não Comparecimento") e Aba de Devoluções do Dia (modal para registrar devolução com campo de texto para `return_observation`).

#### `TASK-B08` — Gestão de Equipamentos, Categorias e Manutenção
- **Arquivos:** `reserva-lab/src/pages/admin/ManageItemsPage.tsx`, modais de formulário.
- **Passos:** Tabela com busca, cadastro/edição de itens e categorias, ação para enviar/concluir manutenção.

#### `TASK-B09` — Configurações de Regras do Sistema e Gestão de Usuários
- **Arquivos:** `reserva-lab/src/pages/admin/ManageSettingsPage.tsx`, `reserva-lab/src/pages/admin/ManageUsersPage.tsx`.
- **Passos:** Formulário para alterar `max_rent_days` e `max_concurrent_items` e tabela de usuários com botão para alternar bloqueio manual (`is_manually_blocked`).
