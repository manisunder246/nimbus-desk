export function requireAdmin(req, res, next) {
  const groups = req.user?.groups || [];
  if (!groups.includes('Admins')) {
    return res.status(403).json({ error: 'Admins only' });
  }
  next();
}
