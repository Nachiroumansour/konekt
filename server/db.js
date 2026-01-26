import bcrypt from 'bcrypt';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'fitsen-postgresql',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migration: Ajout des colonnes si elles manquent (pour les déploiements existants)
    await client.query(`
      ALTER TABLE wa_users
      ADD COLUMN IF NOT EXISTS phone VARCHAR(50) UNIQUE,
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user',
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS verification_code VARCHAR(10),
      ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20) DEFAULT 'free',
      ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS message_limit INTEGER DEFAULT 25,
      ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMP,
      ALTER COLUMN email DROP NOT NULL;
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

    // Migration: Ajout de display_name si manquant
    await client.query(`
      ALTER TABLE wa_instances
      ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
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
    const adminPhone = '785947312';
    const adminPass = 'Sall&0710';

    const res = await client.query('SELECT id FROM wa_users WHERE phone = $1', [adminPhone]);
    if (res.rows.length === 0) {
       const hashed = await bcrypt.hash(adminPass, 10);
       await client.query(
         'INSERT INTO wa_users (phone, email, password_hash, role, is_verified) VALUES ($1, $2, $3, $4, $5)',
         [adminPhone, 'admin@fitsen.sn', hashed, 'admin', true]
       );
       console.log('Admin user created (785947312)');
    }

    console.log('Tables initialisées avec succès.');
  } catch (err) {
    console.error('Erreur lors de l\'initialisation de la DB:', err);
  } finally {
    client.release();
  }
};

export { initDb, pool };
