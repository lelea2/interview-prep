import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { InMemoryRepository } from './db/inMemoryDb.js';
import { SEED_ROWS } from './db/seed.js';
import { createRowsRouter } from './routes/rows.js';
import { createParseRouter } from './routes/parse.js';
import { createSummaryRouter } from './routes/summary.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const PORT = Number(process.env.PORT ?? 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
const NODE_ENV = process.env.NODE_ENV ?? 'development';

// Swap InMemoryRepository for PostgresRepository here to move to a real
// store — no other file in the app needs to change. See RUNBOOK.md.
const repo = new InMemoryRepository();

async function main() {
  await repo.bulkInsertRows(SEED_ROWS);

  const app = express();

  app.use(cors({ origin: CLIENT_ORIGIN }));
  app.use(express.json());

  if (NODE_ENV !== 'production') {
    app.use((req, _res, next) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });
  }

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/rows', createRowsRouter(repo));
  app.use('/api/parse', createParseRouter());
  app.use('/api/summary', createSummaryRouter(repo));

  app.use(notFoundHandler);
  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT} (${NODE_ENV})`);
  });
}

main();
