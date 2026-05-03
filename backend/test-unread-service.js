import { pool } from './src/config/db.js';
import { getTotalUnread } from './src/services/chat.service.js';

const adminUser = { id: 1, role: 'admin' };
const result = await getTotalUnread(adminUser);
console.log('getTotalUnread result:', result);

process.exit(0);
