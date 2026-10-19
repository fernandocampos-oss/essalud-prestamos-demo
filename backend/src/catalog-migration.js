const bcrypt = require('bcryptjs');
const { transaction } = require('./db');

const banks = [
  { id: 'andino', name: 'Banco de Crédito del Perú (BCP)', userId: 'analyst-andino', username: 'analista.bcp', userName: 'Luis Vega', adminId: 'admin-andino', adminUsername: 'admin.bcp' },
  { id: 'horizonte', name: 'BBVA Perú', userId: 'analyst-horizonte', username: 'analista.bbva', userName: 'Nora Gil' },
  { id: 'pacifico', name: 'Interbank', userId: 'analyst-pacifico', username: 'analista.interbank', userName: 'Carlos Mena' }
];

function migrateCatalog(db) {
  const result = { namesUpdated: 0, usersRenamed: 0, usersCreated: 0, conflicts: [] };
  transaction(db, () => {
    for (const bank of banks) {
      const organization = db.prepare("SELECT id,name FROM organizations WHERE id=? AND type='BANCO'").get(bank.id);
      if (!organization) {
        result.conflicts.push(`No existe la organización bancaria ${bank.id}.`);
        continue;
      }
      if (organization.name !== bank.name) {
        db.prepare('UPDATE organizations SET name=? WHERE id=?').run(bank.name, bank.id);
        result.namesUpdated += 1;
      }
      const user = db.prepare('SELECT id,username FROM users WHERE id=?').get(bank.userId);
      const usernameOwner = db.prepare('SELECT id FROM users WHERE username=?').get(bank.username);
      if (user && user.username !== bank.username && (!usernameOwner || usernameOwner.id === user.id)) {
        db.prepare('UPDATE users SET username=? WHERE id=?').run(bank.username, user.id);
        result.usersRenamed += 1;
      } else if (user && user.username !== bank.username) {
        result.conflicts.push(`No se cambió ${user.id}: ${bank.username} ya pertenece a otro usuario.`);
      } else if (!user && !usernameOwner) {
        db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?,?,1)').run(
          bank.userId, bank.username, bcrypt.hashSync('Demo2026!', 10), bank.userName,
          'ANALISTA_BANCO', bank.id, null
        );
        result.usersCreated += 1;
      } else if (!user) {
        result.conflicts.push(`No se creó ${bank.username}: el usuario ya existe con otro identificador.`);
      }
      if (!bank.adminId) continue;
      const admin = db.prepare('SELECT id,username FROM users WHERE id=?').get(bank.adminId);
      const adminOwner = db.prepare('SELECT id FROM users WHERE username=?').get(bank.adminUsername);
      if (admin && admin.username !== bank.adminUsername && (!adminOwner || adminOwner.id === admin.id)) {
        db.prepare('UPDATE users SET username=? WHERE id=?').run(bank.adminUsername, admin.id);
        result.usersRenamed += 1;
      } else if (admin && admin.username !== bank.adminUsername) {
        result.conflicts.push(`No se cambió ${admin.id}: ${bank.adminUsername} ya pertenece a otro usuario.`);
      }
    }
  });
  return result;
}

module.exports = { banks, migrateCatalog };
