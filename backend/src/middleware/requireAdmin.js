// middleware/requireAdmin.js — gate that 403s anyone outside the Admins group.
// Used to be applied to every admin-only PATCH / DELETE; superseded in
// routes/tickets.js by canModifyTicket() which understands Analyst rights too.
export function requireAdmin(req, res, next) {
  const groups = req.user?.groups || [];
  if (!groups.includes('Admins')) {
    return res.status(403).json({ error: 'Admins only' });
  }
  next();
}
