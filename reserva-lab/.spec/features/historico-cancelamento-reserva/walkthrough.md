# Walkthrough: Histórico próprio e cancelamento de reserva

## Entrega

- `GET /api/reservations/my-reservations` exige JWT e consulta somente reservas do usuário autenticado.
- O histórico inclui equipamento, categoria e empréstimo, ordenado do registro mais recente para o mais antigo.
- Usuário sem reservas recebe resposta 200 com `reservations` vazio.
- `PATCH /api/reservations/:id/cancel` exige JWT e UUID válido.
- Somente reserva própria com status `SCHEDULED` pode mudar para `CANCELLED`.
- Reserva inexistente e reserva de outro usuário respondem igualmente com 404, sem revelar propriedade alheia.
- Reserva já retirada, concluída, cancelada ou marcada como não comparecimento responde 400.
- O cancelamento usa transação serializável e atualização condicionada por identificador, usuário e status, permitindo apenas uma transição concorrente.
- O cancelamento bem-sucedido retorna 200 com a reserva atualizada, equipamento, categoria e empréstimo.

## Arquivos principais

- `server/src/controllers/reservation.controller.ts`
- `server/src/services/reservation.service.ts`
- `server/src/schemas/reservation.schema.ts`
- `server/src/routes/reservation.routes.ts`
- `server/tests/integration/reservation-history.test.ts`

## Provas

- Build TypeScript concluído sem erros.
- Suíte isolada da A04: 10 testes aprovados.
- ONP `verify historico-cancelamento-reserva`: 10 de 10 critérios de aceite com prova PASS; 41 testes lidos; exit 0.
- As provas A01, A02 e A03 foram renovadas após as alterações nos arquivos compartilhados de reservas.
- ONP `audit --ci`: 4 features; 8 histórias de usuário; 39 critérios com teste; 39 critérios provados; 0 avisos; exit 0.
- Os testes usam persistência simulada e não gravam dados reais no Supabase.

## Lições

- L-001 confirmada: criar todos os arquivos mapeados na tarefa antes da auditoria final.
- L-002 confirmada: criar um teste anotado para cada critério de aceite e executar o `verify` antes de concluir a feature.

Nenhuma nova lição foi necessária; os sinais desta feature já estão cobertos pelas lições confirmadas.
