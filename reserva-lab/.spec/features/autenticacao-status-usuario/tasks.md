# Tasks: Autenticação e status dinâmico do usuário

> feature: autenticacao-status-usuario

## T-001 — Implementar e provar cadastro, login e consulta pessoal [concluida]
- Refs: US-001, US-002, US-003, AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009, AC-010
- Arquivos: ../server/src/controllers/auth.controller.ts, ../server/src/routes/auth.routes.ts, ../server/src/schemas/auth.schema.ts, ../server/src/app.ts, ../server/tests/integration/auth.test.ts
- Notas: Reutilizar Prisma, bcrypt, JWT, authMiddleware e errorMiddleware existentes. Nunca devolver password_hash. Uma única tarefa atômica, sem paralelismo.
