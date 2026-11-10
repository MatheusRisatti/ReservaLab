# Walkthrough: Criação de reserva direta

## Entrega

- `POST /api/reservations` exige JWT válido e usa o usuário autenticado como dono da reserva.
- O corpo é validado com Zod: UUID do equipamento, datas ISO, retirada futura e devolução posterior.
- Bloqueio manual ou empréstimo atrasado retorna 403; limite de reservas e duração máxima retornam 400.
- Equipamento inexistente retorna 404; equipamento inativo retorna 409.
- Reservas `SCHEDULED` ou `ACTIVE_LOAN` e manutenções sobrepostas retornam 409.
- Uma solicitação válida cria diretamente uma reserva `SCHEDULED` e retorna 201.
- Se `SystemSettings` não existir, são usados os padrões confirmados de 14 dias e 3 itens simultâneos.
- Verificação de conflito e criação usam transação serializável, com até três tentativas controladas para conflitos de serialização.

## Arquivos principais

- `server/src/schemas/reservation.schema.ts`
- `server/src/services/reservation.service.ts`
- `server/src/controllers/reservation.controller.ts`
- `server/src/routes/reservation.routes.ts`
- `server/src/app.ts`
- `server/tests/integration/reservation.test.ts`

## Provas

- Build TypeScript concluído sem erros.
- Suíte isolada da A03: 12 testes aprovados.
- ONP `verify criacao-reserva-direta`: 11 de 11 critérios de aceite com prova PASS; 31 testes lidos; exit 0.
- As provas A01 e A02 foram renovadas após a alteração do `server/src/app.ts`.
- ONP `audit --ci`: 3 features; 6 histórias de usuário; 29 critérios com teste; 29 critérios provados; 0 avisos; exit 0.
- Os testes usam persistência simulada e não gravam dados reais no Supabase.

## Lições

- L-001 confirmada: criar todos os arquivos mapeados na tarefa antes da auditoria final.
- L-002 confirmada: criar um teste anotado para cada critério de aceite e executar o `verify` antes de concluir a feature.
