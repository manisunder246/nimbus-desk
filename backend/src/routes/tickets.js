// routes/tickets.js — every /api/tickets endpoint plus the role-based
// authorization model. Authorization rules (encoded in canModifyTicket):
//   Admin    -> can change any field on any ticket
//   Analyst  -> can change ONLY `status`, ONLY on tickets where
//               assignedTo === their Cognito sub
//   User     -> 403 on any modification (read of own tickets is allowed)
// SNS publish is best-effort — a failure there must NOT fail the API call.
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  createTicket, getTicket, listAllTickets, listTicketsForUser, listTicketsAssignedTo,
  updateTicket, closeTicket, setAttachmentKey,
} from '../services/ticketService.js';
import { presignedGetUrl } from '../services/s3Service.js';
import { invokeClassifierAsync } from '../services/lambdaService.js';
import { publish } from '../services/snsService.js';
import { listAllAppUsers } from '../services/userService.js';

const router = Router();
router.use(authMiddleware);

const isAdmin   = (req) => req.user.groups.includes('Admins');
const isAnalyst = (req) => req.user.groups.includes('Analysts');

// Returns true if (req.user) may apply (patchKeys) to (ticket).
function canModifyTicket(req, ticket, patchKeys) {
  if (isAdmin(req)) return true;
  if (isAnalyst(req)) {
    if (ticket.assignedTo !== req.user.sub) return false;
    return patchKeys.every((k) => k === 'status');
  }
  return false;
}

async function nameLookup() {
  try {
    const users = await listAllAppUsers();
    const byId    = new Map(users.map((u) => [u.userId, u]));
    const byEmail = new Map(users.map((u) => [u.email,  u]));
    return (idOrEmail) => byId.get(idOrEmail) || byEmail.get(idOrEmail) || null;
  } catch {
    return () => null;
  }
}

router.post('/', async (req, res, next) => {
  try {
    const { title, category, priority, description } = req.body || {};
    if (!title || !category || !description) {
      return res.status(400).json({ error: 'title, category, description are required' });
    }
    const ticket = await createTicket({ user: req.user, title, category, priority, description });
    // Fire-and-forget — Lambda re-evaluates priority and updates the row in
    // the background. The 201 response goes back to the client immediately;
    // the dashboard re-fetch a few seconds later picks up the new priority.
    invokeClassifierAsync({
      ticketId: ticket.ticketId,
      category: ticket.category,
      description: ticket.description,
      priority: ticket.priority,
    });
    res.status(201).json(ticket);
  } catch (e) { next(e); }
});

router.get('/', async (req, res, next) => {
  try {
    if (isAdmin(req)) {
      const { status, priority, limit } = req.query;
      const items = await listAllTickets({
        status, priority, limit: limit ? parseInt(limit, 10) : 50,
      });
      return res.json({ items, count: items.length });
    }
    if (isAnalyst(req)) {
      const items = await listTicketsAssignedTo(req.user.sub);
      return res.json({ items, count: items.length });
    }
    const items = await listTicketsForUser(req.user.sub);
    res.json({ items, count: items.length });
  } catch (e) { next(e); }
});

router.get('/:ticketId', async (req, res, next) => {
  try {
    const ticket = await getTicket(req.params.ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const canRead =
      isAdmin(req) ||
      ticket.createdBy === req.user.sub ||
      (isAnalyst(req) && ticket.assignedTo === req.user.sub);
    if (!canRead) return res.status(403).json({ error: 'Forbidden' });

    let attachmentUrl = null;
    if (ticket.attachmentS3Key) {
      attachmentUrl = await presignedGetUrl({ key: ticket.attachmentS3Key });
    }
    res.json({ ...ticket, attachmentUrl });
  } catch (e) { next(e); }
});

router.patch('/:ticketId', async (req, res, next) => {
  try {
    const ticket = await getTicket(req.params.ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const allowed = ['status', 'priority', 'assignedTo'];
    const changes = {};
    for (const k of allowed) if (k in req.body) changes[k] = req.body[k];
    if (!Object.keys(changes).length) {
      return res.status(400).json({ error: 'No valid fields supplied' });
    }
    if (!canModifyTicket(req, ticket, Object.keys(changes))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updated = await updateTicket(req.params.ticketId, { user: req.user, changes });

    // Notification side-effects (best-effort, non-blocking failures)
    try {
      const lookup = await nameLookup();
      if (changes.assignedTo) {
        const a = lookup(changes.assignedTo);
        const who = a ? `${a.name} <${a.email}>` : changes.assignedTo;
        await publish({
          subject: `[NimbusDesk] Ticket #${updated.ticketId.slice(0,8)} assigned to ${a?.name || changes.assignedTo}`,
          message:
            `Ticket "${updated.title}" was assigned to ${who} by ${req.user.email}.\n\n` +
            `Priority: ${updated.priority}\nStatus: ${updated.status}`,
        });
      }
      if (changes.status === 'Resolved' || changes.status === 'Closed') {
        const me = lookup(req.user.sub) || { name: req.user.email };
        await publish({
          subject: `[NimbusDesk] Ticket #${updated.ticketId.slice(0,8)} ${changes.status} by ${me.name}`,
          message: `Ticket "${updated.title}" was marked ${changes.status} by ${me.name} (${req.user.email}).`,
        });
      }
    } catch (e) { console.warn('[tickets] SNS publish failed:', e.message); }

    res.json(updated);
  } catch (e) { next(e); }
});

router.patch('/:ticketId/attachment', async (req, res, next) => {
  try {
    const { s3Key } = req.body || {};
    if (!s3Key) return res.status(400).json({ error: 's3Key required' });
    const ticket = await getTicket(req.params.ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (!isAdmin(req) && ticket.createdBy !== req.user.sub) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await setAttachmentKey(req.params.ticketId, s3Key, req.user);
    res.json(updated);
  } catch (e) { next(e); }
});

router.post('/:ticketId/close', async (req, res, next) => {
  try {
    const ticket = await getTicket(req.params.ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (!canModifyTicket(req, ticket, ['status'])) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await closeTicket(req.params.ticketId, req.user);
    try {
      const lookup = await nameLookup();
      const me = lookup(req.user.sub) || { name: req.user.email };
      await publish({
        subject: `[NimbusDesk] Ticket #${updated.ticketId.slice(0,8)} Closed by ${me.name}`,
        message: `Ticket "${updated.title}" was closed by ${me.name} (${req.user.email}).`,
      });
    } catch (e) { console.warn('[tickets] SNS publish failed:', e.message); }
    res.json(updated);
  } catch (e) { next(e); }
});

export default router;
