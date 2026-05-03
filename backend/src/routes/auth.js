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
