import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { listAllAppUsers } from '../services/userService.js';

const router = Router();
router.use(authMiddleware);

// All authenticated users may list workspace users (needed for the
// assignee-name lookups in the ticket detail panel + admin dropdown).
router.get('/', async (_req, res, next) => {
  try {
    const users = await listAllAppUsers();
    res.json({ items: users, count: users.length });
  } catch (e) { next(e); }
});

export default router;
