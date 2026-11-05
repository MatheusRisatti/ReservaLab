import dotenv from 'dotenv';
dotenv.config();

import { app } from './app.js';

const PORT = Number(process.env.PORT) || 3333;

app.listen(PORT, () => {
  console.log(`🚀 [ReservaLab API] Servidor rodando em http://localhost:${PORT}`);
  console.log(`📡 [Healthcheck] Teste em http://localhost:${PORT}/health`);
});
