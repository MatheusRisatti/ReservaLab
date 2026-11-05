# Walkthrough: Catálogo e disponibilidade de equipamentos

## Entrega

- `GET /api/categories` lista todas as categorias em ordem alfabética.
- `GET /api/items` lista somente equipamentos ativos, inclui a categoria e aceita filtro por `category_id`.
- Quando `pickup_date` e `return_date` são informadas, a disponibilidade considera a sobreposição de reservas `SCHEDULED` ou `ACTIVE_LOAN` e de manutenções.
- Sem período, a disponibilidade representa a situação atual: empréstimo `ACTIVE_LOAN` ou manutenção aberta deixa o item indisponível.
- Períodos incompletos, inválidos ou invertidos retornam 400 antes de consultar os equipamentos.
- As consultas são somente leitura e os testes não gravam dados reais no Supabase.

## Arquivos principais

- `server/src/controllers/catalog.controller.ts`
- `server/src/routes/catalog.routes.ts`
- `server/src/app.ts`
- `server/tests/integration/catalog.test.ts`

## Provas

- Build TypeScript concluído sem erros.
- ONP `verify catalogo-disponibilidade`: 8 de 8 critérios de aceite com prova PASS; 19 testes lidos; exit 0.
- A prova da autenticação também foi renovada porque `server/src/app.ts` é compartilhado: 10 de 10 critérios com prova PASS; 19 testes lidos; exit 0.
- ONP `audit --ci`: 2 features; 5 histórias de usuário; 18 critérios com teste; 18 critérios provados; 0 avisos; exit 0.

## Lições

- L-001 (candidata): criar todos os arquivos mapeados na tarefa antes da auditoria final.
- L-002 (candidata): criar um teste anotado para cada critério de aceite e executar o `verify` antes de concluir a feature.

As duas lições possuem sinais mecânicos recorrentes, mas permanecem candidatas até o motor confirmar recorrência suficiente em features futuras.
