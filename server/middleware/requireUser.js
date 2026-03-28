export default function requireUser(req, res, next) {
  if (req.user?.userType !== 'user' || req.user?.userId == null) {
    return res.status(403).json({ error: 'Not a user session' });
  }
  next();
}
