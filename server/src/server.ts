import dotenv from 'dotenv';
dotenv.config();

if (!process.env.JWT_SECRET?.trim()) {
  console.error('❌ Variável de ambiente obrigatória JWT_SECRET não configurada. Defina no arquivo .env antes de iniciar.');
  process.exit(1);
}

import { app } from './app.js';

const PORT = Number(process.env.PORT) || 3333;

app.listen(PORT, () => {
  console.log(`🚀 [ReservaLab API] Servidor rodando em http://localhost:${PORT}`);
  console.log(`📡 [Healthcheck] Teste em http://localhost:${PORT}/health`);
});
