import { pool } from './src/config/db.js';

const [unreadAll] = await pool.query(
  'SELECT COUNT(*) as count FROM messages WHERE receiver_id = 1 AND is_read = 0'
);
console.log('Total unread for receiver_id=1:', unreadAll[0].count);

const [unreadByScope] = await pool.query(`
  SELECT c.scope, COUNT(*) as count
  FROM messages m
  INNER JOIN conversations c ON c.id = m.conversation_id
  WHERE m.receiver_id = 1 AND m.is_read = 0
  GROUP BY c.scope
`);
console.log('Unread by scope:', unreadByScope);

process.exit(0);
