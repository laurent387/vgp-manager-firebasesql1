const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const password = 'admin123';
const hash = hashPassword(password);

console.log('SHA256 Hash for password "' + password + '":');
console.log(hash);
console.log('\nSQL Command:');
console.log(`
DELETE FROM users WHERE email = 'admin@tondomaine.fr';

INSERT INTO users (
  id,
  email,
  password,
  \`role\`,
  nom,
  prenom,
  is_active,
  is_activated,
  created_at
) VALUES (
  UUID(),
  'admin@tondomaine.fr',
  '${hash}',
  'admin',
  'Admin',
  'Principal',
  1,
  1,
  NOW()
);
`);
