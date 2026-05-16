import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: 'yamabiko.proxy.rlwy.net',
  port: 45729,
  user: 'root',
  password: 'ZVCKgPmMjvVJuVbnqNFwtrtlKyBmqEeI',
  database: 'railway',
  ssl: { rejectUnauthorized: false }
});

try {
  // The correct bcrypt hash for "ChangeMe@123"
  const correctHash = '$2a$10$sydJvqopghIPQzkMu.b6AOFyVSQMPGx76h2XQxVA8XjvvdP9aHx5.';
  
  await conn.query(
    'UPDATE users SET password_hash = ? WHERE email = ?',
    [correctHash, 'admin@verbenatech.com']
  );
  
  console.log('✅ Admin password hash updated successfully!');
  console.log('Email: admin@verbenatech.com');
  console.log('Password: ChangeMe@123');
  
  const [rows] = await conn.query(
    'SELECT id, name, email, role, password_hash, is_active FROM users WHERE email = ?',
    ['admin@verbenatech.com']
  );
  
  console.log('\nAdmin User Record:');
  console.log(JSON.stringify(rows[0], null, 2));
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
} finally {
  await conn.end();
}
