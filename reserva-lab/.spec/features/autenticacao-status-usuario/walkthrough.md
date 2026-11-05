# Walkthrough: Autenticação e status dinâmico do usuário

## Entrega

- `POST /api/auth/register` valida os dados, impede e-mail duplicado, aplica hash à senha e cria usuário comum sem bloqueio.
- `POST /api/auth/login` valida as credenciais e devolve JWT com `id`, `role` e `email`.
- `GET /api/auth/me` exige autenticação e calcula `BLOCKED`, `LIMIT_REACHED` ou `AVAILABLE`.
- O bloqueio manual tem prioridade; em seguida são verificados empréstimo atrasado e limite de reservas ativas.
- Nenhuma resposta expõe `password_hash`.

## Arquivos principais

- `server/src/schemas/auth.schema.ts`
- `server/src/controllers/auth.controller.ts`
- `server/src/routes/auth.routes.ts`
- `server/src/app.ts`
- `server/tests/integration/auth.test.ts`

## Provas

- Build TypeScript concluído sem erros.
- ONP `verify`: 10 de 10 critérios de aceite com prova PASS; 11 testes lidos; exit 0.
- ONP `audit --ci`: 3 histórias de usuário; 10 critérios com teste; 10 critérios provados; 0 avisos; exit 0.
- Os testes usam persistência simulada e não gravam dados reais no Supabase.

## Lições

Nenhuma lição foi registrada. O motor não encontrou sinal recorrente em duas ou mais features.
