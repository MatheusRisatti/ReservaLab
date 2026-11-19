import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './docs/swagger.json';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { authRouter } from './routes/auth.routes.js';
import { catalogRouter } from './routes/catalog.routes.js';
import { reservationRouter } from './routes/reservation.routes.js';
import { adminRouter } from './routes/admin.routes.js';

export const app = express();

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [];

app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
  })
);
app.use(express.json({ limit: '1mb' }));

// Documentação Swagger/OpenAPI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'ReservaLab API',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRouter);
app.use('/api', catalogRouter);
app.use('/api/reservations', reservationRouter);
app.use('/api/admin', adminRouter);

app.use(errorMiddleware);
