const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { audit } = require('./db');

const secret = () => process.env.SESSION_SECRET || 'local-demo-secret-only';
function sign(user) { return jwt.sign({ sub:user.id, role:user.role, organizationId:user.organization_id, workerId:user.worker_id, name:user.name }, secret(), { expiresIn:'8h' }); }
function session(db, required = true) {
  return (req, res, next) => {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return required ? res.status(401).json({message:'Sesión requerida.'}) : next();
    try { const claims=jwt.verify(token, secret()); req.actor = {...claims,id:claims.sub}; next(); } catch { res.status(401).json({message:'Sesión no válida o vencida.'}); }
  };
}
function roles(...allowed) { return (req,res,next) => allowed.includes(req.actor?.role) ? next() : res.status(403).json({message:'No cuenta con permiso para esta acción.'}); }
function login(db, username, password) {
  const user = db.prepare('SELECT u.* FROM users u LEFT JOIN workers w ON w.id=u.worker_id WHERE (u.username=? OR w.code=?) AND u.active=1').get(username, username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return null;
  audit(db, user.id, 'LOGIN', 'USER', user.id, { role:user.role });
  return { token:sign(user), user:present(user) };
}
function present(user) { return { id:user.id, name:user.name, username:user.username, role:user.role, organizationId:user.organization_id, workerId:user.worker_id }; }
module.exports = { session, roles, login, present };
