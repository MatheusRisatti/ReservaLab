# ReservaLab

Plataforma web para consultar, reservar e controlar o empréstimo de equipamentos em um ambiente acadêmico (notebooks, projetores, câmeras, microfones etc.). Substitui o controle por planilhas por um catálogo com disponibilidade real, reservas sem conflito de agenda, histórico e acompanhamento de retiradas, devoluções e ocorrências.

Projeto da disciplina desenvolvido por Gustavo Santos Buzacarini e Matheus Clementino Risatti (Ciência da Computação – UNISAGRADO).

## Funcionalidades

**Usuário comum**

- Cadastro, login e status dinâmico da conta (Liberado, Bloqueado ou Limite Atingido).
- Catálogo de equipamentos com filtro por categoria, busca e período, mostrando a disponibilidade e a quantidade de unidades.
- Reserva direta, sem aprovação manual, validando conflito de agenda, prazo máximo e limite de reservas simultâneas.
- Solicitação de prazo estendido, com justificativa, quando o período passa do máximo permitido.
- Histórico pessoal de reservas e cancelamento de reservas agendadas.

**Administrador**

- CRUD de categorias e equipamentos (patrimônio único e quantidade de unidades).
- Registro e conclusão de manutenção.
- Painel diário de retiradas e devoluções, com marcação de não comparecimento e observação de devolução (avarias).
- Análise dos pedidos de prazo estendido (aprovar ou reprovar com justificativa).
- Regras globais (prazo máximo e itens simultâneos), gestão e bloqueio manual de usuários e histórico geral.

## Tecnologias

| Camada | Tecnologias |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router, Axios |
| Backend | Node.js, Express 4, TypeScript |
| Banco de dados | PostgreSQL (Supabase) com Prisma ORM |
| Validação e segurança | Zod, JWT, bcrypt, helmet, CORS, limite de tentativas de login |
| Testes | Jest e Supertest (backend) |
| Documentação da API | OpenAPI/Swagger (`/api-docs`) |

Arquitetura: o frontend consome a API REST exclusivamente por HTTP. A API concentra autenticação, autorização, regras de negócio e acesso ao banco. O frontend nunca acessa o banco diretamente.

## Estrutura do repositório

```
ReservaLab/
├── reserva-lab/        # Frontend (React + Vite)
│   └── src/            # pages, components, contexts, services, types
├── server/             # Backend (Express + Prisma)
│   ├── src/            # routes, controllers, services, schemas, middlewares, utils
│   ├── prisma/         # schema.prisma, migrations, seed e scripts SQL
│   └── tests/          # unit e integration (Jest + Supertest)
├── docs/               # Documentação técnica (PDF) e fontes
├── EXECUTION_PLAN.md   # Plano de execução e divisão de tarefas (Trilhas A e B)
└── reserva-lab/prdReservaLab.md   # Documento de requisitos do produto
```

## Como executar

Pré-requisitos: Node.js 20 ou superior e um projeto PostgreSQL (por exemplo, no Supabase).

**1. Backend**

```bash
cd server
npm install
cp .env.example .env      # preencha DATABASE_URL, DIRECT_URL e JWT_SECRET
npx prisma generate
npx prisma migrate deploy # aplica a migration; alternativa: executar prisma/sql/01_schema.sql
npm run prisma:seed       # cria configurações padrão, categorias e um administrador de desenvolvimento
npm run dev               # API em http://localhost:3333
```

Gere o `JWT_SECRET` com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Nunca versione o arquivo `.env`. O administrador criado pelo seed existe apenas para desenvolvimento (veja `server/prisma/seed.ts`); troque a senha em qualquer outro ambiente.

**2. Frontend**

```bash
cd reserva-lab
npm install
cp .env.example .env      # VITE_API_URL (padrão: http://localhost:3333)
npm run dev               # http://localhost:5173
```

## Scripts úteis

| Local | Comando | Descrição |
|---|---|---|
| `server` | `npm run dev` | API em modo de desenvolvimento (recarrega ao salvar) |
| `server` | `npm test` | Executa os testes unitários e de integração |
| `server` | `npm run build` | Compila o TypeScript para `dist/` |
| `reserva-lab` | `npm run dev` | Servidor de desenvolvimento do frontend |
| `reserva-lab` | `npm run build` | Verificação de tipos e build de produção |
| `reserva-lab` | `npm run lint` | Análise estática com ESLint |

## Testes

Os testes automatizados ficam no backend (Jest + Supertest) e usam o Prisma simulado (mock), por isso não gravam dados no banco real. A interface é validada manualmente, pois testes automatizados de frontend estão fora do escopo do MVP.

```bash
cd server
npm test
```

## Variáveis de ambiente do backend

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | Conexão do pooler (porta 6543) usada pela aplicação |
| `DIRECT_URL` | Sim | Conexão direta usada pelas migrações do Prisma |
| `JWT_SECRET` | Sim | Segredo para assinar os tokens (a API não inicia sem ele) |
| `JWT_EXPIRES_IN` | Não | Validade do token (padrão `7d`) |
| `CORS_ORIGIN` | Não | Origens permitidas, separadas por vírgula |
| `AUTH_RATE_LIMIT_MAX` | Não | Tentativas de login/cadastro por IP na janela (padrão 20) |
| `AUTH_RATE_LIMIT_WINDOW_MS` | Não | Janela do limitador em milissegundos (padrão 900000) |

## Documentação

- API: Swagger UI em `http://localhost:3333/api-docs` com a API em execução.
- Produto: `reserva-lab/prdReservaLab.md`.
- Plano de execução: `EXECUTION_PLAN.md`.
- Documentação técnica completa (requisitos, UML, arquitetura, dados, testes e rastreabilidade): pasta `docs/`.

## Divisão do trabalho

- **Trilha A (módulo do usuário):** Gustavo Santos Buzacarini.
- **Trilha B (módulo administrativo):** Matheus Clementino Risatti.
- A base (Fase 0: Express, Prisma/Supabase, autenticação, Swagger e Jest) foi construída antes da divisão.
