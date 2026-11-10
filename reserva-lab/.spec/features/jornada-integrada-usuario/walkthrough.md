# Walkthrough: Jornada integrada do usuário

## Entrega

- `server/tests/integration/user-journey.test.ts` valida os módulos A01 a A04 em sequência pela API.
- O cadastro cria o usuário e o login usa a mesma identidade para obter o JWT.
- O status muda de `AVAILABLE` para `LIMIT_REACHED` após atingir o limite configurado.
- Uma reserva válida é criada como `SCHEDULED` e aparece no histórico próprio.
- Uma segunda reserva sobreposta recebe 409 sem gerar duplicidade.
- Uma reserva de 15 dias recebe 400 quando o máximo configurado é 14.
- O cancelamento próprio muda a reserva para `CANCELLED` e o histórico reflete o novo estado.
- A persistência compartilhada é simulada em memória e não abre conexão nem grava dados no Supabase.

## Arquivo principal

- `server/tests/integration/user-journey.test.ts`

## Provas

- Build TypeScript concluído sem erros.
- Suíte isolada da A05: 6 testes aprovados.
- ONP `verify jornada-integrada-usuario`: 6 de 6 critérios de aceite com prova PASS; 47 testes lidos; exit 0.
- As provas A01, A02, A03 e A04 foram renovadas após a inclusão da suíte global.
- ONP `audit --ci`: 5 features; 9 histórias de usuário; 45 critérios com teste; 45 critérios provados; 0 avisos; exit 0.

## Ajustes durante a execução

- A comparação dos estados ativos foi escrita explicitamente para respeitar o tipo completo `ReservationStatus`.
- As implementações simuladas de hash foram configuradas no `beforeEach`, pois o Jest limpa mocks entre testes.

## Lições

- L-001 confirmada: criar todos os arquivos mapeados na tarefa antes da auditoria final.
- L-002 confirmada: criar um teste anotado para cada critério de aceite e executar o `verify` antes de concluir a feature.

Nenhuma nova lição foi registrada; o motor não apontou um novo sinal recorrente para a A05.
