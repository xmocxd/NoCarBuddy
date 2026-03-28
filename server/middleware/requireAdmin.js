export default function requireAdmin(req, res, next) {
  if (!req.user?.userName) {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}
