# Spec: Autenticação e status dinâmico do usuário

> feature: autenticacao-status-usuario
> status: auditada

## Contexto

O usuário do ReservaLab precisa criar uma conta, entrar com segurança e consultar seus próprios dados com um status calculado pelas regras atuais do sistema.

## Histórias

### US-001 — Usuário cria uma conta

Como novo usuário, quero me cadastrar com nome, e-mail e senha, para acessar o ReservaLab.

#### AC-001 — Cadastro válido cria usuário comum

- **Dado** um nome, um e-mail válido ainda não cadastrado e uma senha com pelo menos 6 caracteres
- **Quando** o visitante envia o cadastro
- **Então** a API cria a conta com perfil `USER`, sem bloqueio manual, devolve resposta 201 e nunca expõe o hash da senha

#### AC-002 — Cadastro inválido é recusado

- **Dado** um cadastro com nome vazio, e-mail inválido ou senha com menos de 6 caracteres
- **Quando** o visitante envia o cadastro
- **Então** a API não cria a conta e devolve resposta 400 com os campos inválidos

#### AC-003 — E-mail já cadastrado não gera duplicidade

- **Dado** um e-mail que já pertence a outro usuário
- **Quando** o visitante tenta cadastrá-lo novamente
- **Então** a API preserva a conta existente e devolve conflito 409

### US-002 — Usuário entra no sistema

Como usuário cadastrado, quero entrar com e-mail e senha, para receber uma sessão autenticada.

#### AC-004 — Credenciais válidas geram token

- **Dado** um usuário cadastrado e uma senha correta
- **Quando** ele solicita o login
- **Então** a API devolve resposta 200, os dados públicos do usuário e um token JWT com `id`, `role` e `email`

#### AC-005 — Credenciais inválidas são recusadas

- **Dado** um e-mail inexistente ou uma senha incorreta
- **Quando** o visitante solicita o login
- **Então** a API não gera token e devolve resposta 401 sem revelar qual credencial estava errada

### US-003 — Usuário consulta seu estado atual

Como usuário autenticado, quero consultar meus dados e meu status, para saber se posso realizar novas reservas.

#### AC-006 — Consulta pessoal exige autenticação

- **Dado** um visitante sem token válido
- **Quando** ele consulta `/api/auth/me`
- **Então** a API recusa a consulta com resposta 401

#### AC-007 — Bloqueio manual tem prioridade

- **Dado** um usuário autenticado marcado com bloqueio manual
- **Quando** ele consulta seus dados
- **Então** a API devolve seus dados públicos com status `BLOCKED`

#### AC-008 — Empréstimo atrasado bloqueia o usuário

- **Dado** um usuário autenticado sem bloqueio manual e com reserva `ACTIVE_LOAN` cujo retorno esperado já venceu
- **Quando** ele consulta seus dados
- **Então** a API devolve status `BLOCKED`

#### AC-009 — Limite de reservas ativas é sinalizado

- **Dado** um usuário autenticado sem bloqueio e com quantidade de reservas `SCHEDULED` ou `ACTIVE_LOAN` igual ou superior ao limite global
- **Quando** ele consulta seus dados
- **Então** a API devolve status `LIMIT_REACHED`

#### AC-010 — Usuário sem impedimentos está liberado

- **Dado** um usuário autenticado sem bloqueio, atraso ou limite atingido
- **Quando** ele consulta seus dados
- **Então** a API devolve status `AVAILABLE`

## Fora de escopo

- Catálogo, disponibilidade e criação de reservas da `TASK-A02` e da `TASK-A03`.
- Telas de login e cadastro da `TASK-A06`.
- Recuperação ou redefinição de senha.
- Autenticação direta pelo Supabase Auth.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-001 | A API usará os códigos estáveis `BLOCKED`, `LIMIT_REACHED` e `AVAILABLE`; o frontend traduzirá esses códigos para Bloqueado, Limite Atingido e Liberado. | confirmada | Gustavo confirmou a recomendação em 05/11/2026. |

## Perguntas em aberto

Nenhuma.
