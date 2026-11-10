# Spec: Jornada integrada do usuário

> feature: jornada-integrada-usuario
> status: auditada

## Contexto

O backend da Trilha A precisa de uma prova integrada de que os endpoints já implementados funcionam em sequência como uma jornada real, preservando autenticação, estado do usuário e regras de reserva.

## Histórias

### US-009 — Jornada principal funciona de ponta a ponta

Como equipe do ReservaLab, queremos testar a jornada do usuário pela API, para detectar regressões entre autenticação, status, reservas e cancelamento.

#### AC-040 — Cadastro e login iniciam a jornada

- **Dado** um e-mail ainda não cadastrado
- **Quando** o usuário cria sua conta e entra com as mesmas credenciais
- **Então** a API devolve 201 no cadastro e 200 no login com um token válido

#### AC-041 — Status acompanha o limite de reservas

- **Dado** um usuário autenticado e um limite de um item simultâneo
- **Quando** consulta seu status antes e depois de criar uma reserva
- **Então** o status muda de `AVAILABLE` para `LIMIT_REACHED`

#### AC-042 — Reserva válida aparece no histórico

- **Dado** um usuário liberado e um equipamento ativo sem conflito
- **Quando** cria uma reserva válida e consulta seu histórico
- **Então** a reserva é criada com status `SCHEDULED` e aparece vinculada ao mesmo usuário

#### AC-043 — Conflito de período é bloqueado na jornada

- **Dado** uma reserva já criada para um equipamento e período
- **Quando** o usuário tenta reservar o mesmo equipamento em período sobreposto
- **Então** a segunda tentativa recebe resposta 409 e não cria duplicidade

#### AC-044 — Período acima do máximo é bloqueado na jornada

- **Dado** o limite configurado de 14 dias
- **Quando** o usuário solicita uma reserva de 15 dias
- **Então** a API devolve resposta 400 e não cria a reserva

#### AC-045 — Usuário cancela a própria reserva

- **Dado** uma reserva própria com status `SCHEDULED`
- **Quando** o usuário solicita o cancelamento e consulta novamente o histórico
- **Então** a API devolve 200 e o histórico passa a mostrar a reserva como `CANCELLED`

## Fora de escopo

- Novas regras de negócio ou alterações nos endpoints existentes.
- Escrita no banco real do Supabase.
- Testes do módulo administrativo da Trilha B.
- Testes automatizados do frontend.
- Testes de carga ou desempenho.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-010 | A jornada usa persistência em memória compartilhada entre as requisições, mantendo o padrão seguro das tarefas A01 a A04 e sem gravar no Supabase. | confirmada | Convenção técnica já aplicada e auditada nas quatro features anteriores. |
| ASM-011 | A configuração simulada usa 14 dias e um item simultâneo para tornar observável a mudança de `AVAILABLE` para `LIMIT_REACHED`. | confirmada | É uma configuração de teste dentro dos limites permitidos por `SystemSettings`. |

## Perguntas em aberto

Nenhuma.
