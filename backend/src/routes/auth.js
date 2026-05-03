// routes/auth.js — POST /api/auth/me. Echoes the verified token claims so
// the SPA can confirm the active identity + derived role on app boot
// (priority Admin > Analyst > User when a user belongs to multiple groups).
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/me', authMiddleware, (req, res) => {
  res.json({
    sub: req.user.sub,
    email: req.user.email,
    groups: req.user.groups,
    role:
      req.user.groups.includes('Admins')   ? 'Admin'   :
      req.user.groups.includes('Analysts') ? 'Analyst' :
      'User',
  });
});

export default router;
