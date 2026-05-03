import express from 'express';
import cors from 'cors';
import env from './config/env.js';
import authRoutes from './routes/auth.js';
import ticketRoutes from './routes/tickets.js';
import userRoutes from './routes/users.js';
import attachmentRoutes from './routes/attachments.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use((req, _res, next) => {
  const who = req.headers.authorization ? '[auth]' : '[anon]';
  console.log(`${new Date().toISOString()} ${req.method} ${req.path} ${who}`);
  next();
});

app.get('/health', (_req, res) => res.json({ ok: true, service: 'nimbusdesk-backend' }));

app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attachments', attachmentRoutes);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`NimbusDesk backend listening on :${env.PORT}`);
  console.log(`  region=${env.AWS_REGION} pool=${env.COGNITO_USER_POOL_ID}`);
  console.log(`  ticketsTable=${env.TICKETS_TABLE} bucket=${env.S3_BUCKET}`);
});
