const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const db = new Database('./data/dramoo.db');

try {
  const userId = uuidv4();
  db.prepare(`
    INSERT INTO users (id, telegram_id, username, full_name)
    VALUES (?, ?, ?, ?)
  `).run(userId, '999998', 'testuser2', 'Test User 2');

  const apiKeyId = uuidv4();
  const apiKey = 'dr_test_1234567890';
  db.prepare(`
    INSERT INTO api_keys (id, user_id, package_id, api_key, status, expires_at, daily_limit)
    VALUES (?, ?, ?, ?, 'active', datetime('now', '+30 days'), 1000)
  `).run(apiKeyId, userId, 'ultimate', apiKey);

  console.log('API_KEY=' + apiKey);
} catch (e) {
  console.log(e);
}
