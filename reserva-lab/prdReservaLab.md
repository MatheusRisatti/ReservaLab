# Product Requirements Document (PRD) - ReservaLab

## FASE 1: Visão Geral e Problema
*   **Problema:** O controle de empréstimos de equipamentos em ambientes acadêmicos feito por planilhas gera conflitos de reserva, atrasos não rastreados, falta de histórico e falhas na disponibilidade.
*   **Proposta de Valor e Solução:** O *ReservaLab* é uma plataforma centralizada para reserva e controle de empréstimos. Ele garante a disponibilidade real, bloqueia conflitos de agenda e fornece rastreabilidade total (quem retirou, quando e estado da devolução).
*   **Objetivos do MVP:** Implementar um fluxo de ponta a ponta funcional de reserva automática (self-service), controle diário de separação, retirada e devolução, suportado por uma API robusta, banco relacional e autenticação segura, atendendo aos rigorosos requisitos acadêmicos.

## FASE 2: Limites de Escopo (Scope Boundaries)
*   **IN-SCOPE (Versão Obrigatória do MVP):**
    *   Cadastro e login de usuários com status dinâmico (Liberado, Bloqueado, Limite Atingido).
    *   Dois perfis de acesso (Comum e Administrador).
    *   CRUD completo de categorias e equipamentos.
    *   Sistema de reserva direta com verificação sistêmica de conflitos de data e limites (sem aprovação manual).
    *   Dashboard administrativo diário de "Ativos a serem separados" e "Devoluções do dia".
    *   Tela de gerenciamento de regras de negócio (limite de dias e de itens simultâneos) pelo Administrador.
    *   Consulta de histórico de empréstimos.
    *   Cobertura de testes automatizados na API e documentação via Swagger.
*   **OUT-OF-SCOPE (Versão Adicional - Restrito ao pós-MVP):**
    *   Testes automatizados no Front-end (React).
    *   Geração e leitura de QR Code para equipamentos.
    *   Envio de notificações ou e-mails automáticos.
    *   Avaliação física com upload de fotos (apenas campo de texto de observação está no escopo).

## FASE 3: Stack Tecnológica e Arquitetura
*   **Front-end:** React + Vite (Estilização via CSS comum ou CSS Modules).
*   **Back-end (API Própria):** Node.js com Express e TypeScript.
*   **Banco de Dados:** PostgreSQL hospedado no Supabase.
*   **ORM e Validação:** Prisma (ORM) e Zod.
*   **Autenticação:** JWT gerado pela própria API + bcrypt para hash de senhas.
*   **Testes Automatizados:** Exclusivamente no Back-end (API) utilizando Jest + Supertest.
*   **Documentação da API:** Swagger/OpenAPI.
*   **Arquitetura:** O Front-end consome a API Node.js exclusivamente via REST. A API concentra a validação de token, controle de permissões, regras de negócio e acesso ao banco de dados.

## FASE 4: Atores, Perfis e Permissões
*   **Usuário Comum:** Pode criar conta, fazer login, consultar o catálogo, realizar reservas de forma direta (respeitando limites e conflitos) e consultar seu histórico.
*   **Administrador:** Possui poder total de gestão. Cadastra equipamentos/categorias, opera o painel diário para consolidar entregas e devoluções (incluindo faltas e avarias) e altera os parâmetros globais de regras (tempo máximo e limite de itens).

## FASE 5: Modelo de Dados Estrito (Prisma Schema)
```prisma
enum Role { ADMIN, USER }
enum ReservationStatus { SCHEDULED, ACTIVE_LOAN, COMPLETED, NO_SHOW, CANCELLED }

model User {
  id                  String   @id @default(uuid())
  name                String
  email               String   @unique
  password_hash       String
  role                Role     @default(USER)
  is_manually_blocked Boolean  @default(false)
  
  reservations        Reservation[]
  created_at          DateTime @default(now())
}

model Category {
  id               String   @id @default(uuid())
  name             String   @unique
  description      String?
  items            Item[]
}

model Item {
  id               String   @id @default(uuid())
  name             String
  patrimony_code   String   @unique
  is_active        Boolean  @default(true)
  category_id      String
  category         Category @relation(fields: [category_id], references: [id])
  
  reservations     Reservation[]
  maintenance      MaintenanceRecord[]
}

model Reservation {
  id                   String   @id @default(uuid())
  user_id              String
  item_id              String
  expected_pickup_at   DateTime
  expected_return_at   DateTime
  status               ReservationStatus @default(SCHEDULED)
  
  user                 User     @relation(fields: [user_id], references: [id])
  item                 Item     @relation(fields: [item_id], references: [id])
  loan                 Loan?    
  
  created_at           DateTime @default(now())
}

model Loan {
  id                   String   @id @default(uuid())
  reservation_id       String   @unique
  actual_pickup_at     DateTime @default(now())
  actual_return_at     DateTime? 
  return_observation   String?   
  
  reservation          Reservation @relation(fields: [reservation_id], references: [id])
}

model MaintenanceRecord {
  id               String   @id @default(uuid())
  item_id          String
  start_date       DateTime @default(now())
  end_date         DateTime?
  description      String
  
  item             Item     @relation(fields: [item_id], references: [id])
}

model SystemSettings {
  id                   String   @id @default(uuid())
  max_rent_days        Int      @default(14)
  max_concurrent_items Int      @default(3)
  updated_at           DateTime @updatedAt
}