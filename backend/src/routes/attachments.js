import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getTicket } from '../services/ticketService.js';
import { buildKey, presignedPutUrl } from '../services/s3Service.js';

const router = Router();
router.use(authMiddleware);

const isAdmin = (req) => req.user.groups.includes('Admins');

router.post('/presigned-upload', async (req, res, next) => {
  try {
    const { ticketId, filename, contentType } = req.body || {};
    if (!ticketId || !filename) return res.status(400).json({ error: 'ticketId and filename required' });
    const ticket = await getTicket(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (!isAdmin(req) && ticket.createdBy !== req.user.sub) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const key = buildKey(ticketId, filename);
    const uploadUrl = await presignedPutUrl({
      key, contentType: contentType || 'application/octet-stream',
    });
    res.json({ uploadUrl, s3Key: key });
  } catch (e) { next(e); }
});

export default router;
