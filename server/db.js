import bcrypt from 'bcrypt';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const ADMIN_PHONE = process.env.ADMIN_PHONE || '221771842787';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme-admin-2026';

// Initialisation des tables
const initDb = async () => {
  const client = await pool.connect();
  try {
    console.log('Initialisation de la base de données...');

    // Table Utilisateurs
    await client.query(`
      CREATE TABLE IF NOT EXISTS wa_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(50) UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        is_verified BOOLEAN DEFAULT false,
        verification_code VARCHAR(10),
        subscription_plan VARCHAR(20) DEFAULT 'free',
        message_count INTEGER DEFAULT 0,
        message_limit INTEGER DEFAULT 25,
        subscription_end TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Table Instances WhatsApp
    await client.query(`
      CREATE TABLE IF NOT EXISTS wa_instances (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES wa_users(id),
        session_name VARCHAR(255) UNIQUE NOT NULL,
        display_name VARCHAR(255),
        api_key VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'DISCONNECTED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Table Historique des Messages
    await client.query(`
      CREATE TABLE IF NOT EXISTS wa_messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES wa_users(id),
        phone VARCHAR(50) NOT NULL,
        message TEXT,
        status VARCHAR(50) DEFAULT 'SENT',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed Admin User
    const res = await client.query('SELECT id FROM wa_users WHERE phone = $1', [ADMIN_PHONE]);
    if (res.rows.length === 0) {
      const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await client.query(
        'INSERT INTO wa_users (phone, email, password_hash, role, is_verified) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
        [ADMIN_PHONE, 'admin@konekt.sn', hashed, 'admin', true]
      );
      console.log(`Admin user created (${ADMIN_PHONE})`);
    }

    console.log('Tables initialisées avec succès.');
  } catch (err) {
    console.error('Erreur lors de l\'initialisation de la DB:', err);
  } finally {
    client.release();
  }
};

export { initDb, pool };
