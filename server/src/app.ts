import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './docs/swagger.json';
import { errorMiddleware } from './middlewares/error.middleware.js';

export const app = express();

app.use(cors());
app.use(express.json());

// Documentação Swagger/OpenAPI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'ReservaLab API',
    timestamp: new Date().toISOString(),
  });
});

app.use(errorMiddleware);
