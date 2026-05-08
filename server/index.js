import axios from 'axios';
import bcrypt from 'bcrypt';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import pkg from 'whatsapp-web.js';
const { MessageMedia } = pkg;

import { initDb, pool } from './db.js';
import { sessionManager } from './sessionManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Nginx)
const PORT = process.env.PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-me';
const WA_SECRET_LEGACY = process.env.WA_SECRET;

app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

// --- Helpers ---

function toJid(phone) {
  const digits = String(phone || '').replace(/[^\d]/g, '');
  return `${digits}@c.us`;
}

async function resolveRecipient(client, phone) {
  const digits = String(phone || '').replace(/[^\d]/g, '');

  if (!digits) {
    const error = new Error('Numéro destinataire invalide');
    error.statusCode = 400;
    throw error;
  }

  const numberId = await client.getNumberId(digits);
  if (!numberId?._serialized) {
    const error = new Error('Numéro WhatsApp introuvable ou invalide');
    error.statusCode = 400;
    throw error;
  }

  return numberId._serialized;
}

async function assertClientReady(client) {
  if (!client || !client.isReady) {
    const error = new Error('Instance WhatsApp non connectée ou non prête');
    error.statusCode = 503;
    throw error;
  }

  const state = await client.getState().catch(() => null);
  if (state !== 'CONNECTED') {
    const error = new Error(`Instance WhatsApp non disponible (${state || 'UNKNOWN'})`);
    error.statusCode = 503;
    throw error;
  }
}

async function processImage(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');

    // Compress and resize
    const compressedBuffer = await sharp(buffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }) // Resize to max 1024x1024
      .jpeg({ quality: 80 }) // Compress to JPEG quality 80
      .toBuffer();

    return new MessageMedia('image/jpeg', compressedBuffer.toString('base64'), 'image.jpg');
  } catch (err) {
    console.error('Error processing image:', err.message);
    throw new Error('Failed to process image');
  }
}

// Fonction générique pour envoyer un message via l'instance de l'admin
const sendMessageViaAdmin = async (targetPhone, message) => {
  try {
    // 1. Trouver l'admin
    const adminRes = await pool.query("SELECT id FROM wa_users WHERE role = 'admin' LIMIT 1");
    if (adminRes.rows.length === 0) {
      console.error('Aucun admin trouvé pour envoyer le message');
      return false;
    }
    const adminId = adminRes.rows[0].id;

    // 2. Trouver une instance connectée de l'admin
    const instanceRes = await pool.query(
      "SELECT session_name FROM wa_instances WHERE user_id = $1 AND status = 'CONNECTED' LIMIT 1",
      [adminId]
    );

    if (instanceRes.rows.length === 0) {
      console.error('Aucune instance admin connectée pour envoyer le message');
      return false;
    }

    const sessionName = instanceRes.rows[0].session_name;
    const client = sessionManager.getSession(sessionName);

    if (!client || !client.isReady) {
      console.error('Client admin non trouvé en mémoire ou déconnecté');
      return false;
    }

    // 3. Envoyer le message
    const recipientJid = await resolveRecipient(client, targetPhone);
    await client.sendMessage(recipientJid, message);
    return true;

  } catch (err) {
    console.error('Erreur envoi message Admin:', err);
    return false;
  }
};

// Fonction pour envoyer l'OTP via l'instance de l'admin
const sendOtpViaAdmin = async (targetPhone, code) => {
  const message = `🔐 *Code de vérification Konekt*\n\nVotre code est : *${code}*\n\nValidez votre compte pour commencer.`;
  return await sendMessageViaAdmin(targetPhone, message);
};

// --- Middleware Auth ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Accès refusé (Admin requis)' });
  }
};

// --- Routes Auth ---

app.post('/api/auth/register', async (req, res) => {
  const { phone, password, email } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'Téléphone et mot de passe requis' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(10000 + Math.random() * 90000).toString(); // 5 digits

    const result = await pool.query(
      'INSERT INTO wa_users (phone, email, password_hash, verification_code, is_verified) VALUES ($1, $2, $3, $4, false) RETURNING id, phone',
      [phone, email || null, hashedPassword, verificationCode]
    );

    // Tenter d'envoyer l'OTP
    const otpSent = await sendOtpViaAdmin(phone, verificationCode);

    res.status(201).json({
      user: result.rows[0],
      message: 'Compte créé. Veuillez vérifier votre téléphone.',
      otpSent
    });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ce numéro ou email est déjà utilisé' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/auth/verify', async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ error: 'Téléphone et code requis' });

  try {
    const result = await pool.query('SELECT * FROM wa_users WHERE phone = $1', [phone]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const user = result.rows[0];
    if (user.verification_code !== code) {
      return res.status(400).json({ error: 'Code incorrect' });
    }

    await pool.query('UPDATE wa_users SET is_verified = true, verification_code = NULL WHERE id = $1', [user.id]);

    // Auto-login
    const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, phone: user.phone, role: user.role } });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'Téléphone et mot de passe requis' });

  try {
    const result = await pool.query('SELECT * FROM wa_users WHERE phone = $1', [phone]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Identifiants incorrects' });

    const user = result.rows[0];

    if (!user.is_verified) {
      return res.status(403).json({ error: 'Compte non vérifié', needsVerification: true });
    }

    if (await bcrypt.compare(password, user.password_hash)) {
      const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { id: user.id, phone: user.phone, role: user.role } });
    } else {
      res.status(401).json({ error: 'Identifiants incorrects' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// --- Routes Admin ---

app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, phone, email, role, is_verified, created_at, subscription_plan, message_count, message_limit FROM wa_users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/admin/users/:id/credits', authenticateToken, requireAdmin, async (req, res) => {
  const userId = req.params.id;
  const { credits } = req.body; // credits: number (e.g. 100, 1000)

  if (!credits || isNaN(credits)) {
    return res.status(400).json({ error: 'Montant de crédits invalide' });
  }

  try {
    const result = await pool.query(`
      UPDATE wa_users
      SET message_limit = COALESCE(message_limit, 25) + $1,
          subscription_plan = 'custom'
      WHERE id = $2
      RETURNING phone, message_limit, message_count
    `, [credits, userId]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const remaining = user.message_limit - user.message_count;
      const message = `🎉 *Crédits Rechargés !*\n\nVotre compte a été crédité de *${credits} messages*.\n\nSolde disponible : *${remaining} messages*.\n\nMerci de votre confiance !`;

      // Envoyer la notification de manière asynchrone
      sendMessageViaAdmin(user.phone, message).catch(err => console.error('Failed to notify user of credit update', err));
    }

    res.json({ message: 'Crédits ajoutés avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});app.get('/api/admin/instances', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*, u.phone as user_phone
      FROM wa_instances i
      JOIN wa_users u ON i.user_id = u.id
      ORDER BY i.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  const userId = req.params.id;
  try {
    // 1. Récupérer toutes les instances de l'utilisateur pour arrêter les sessions
    const instancesRes = await pool.query('SELECT session_name FROM wa_instances WHERE user_id = $1', [userId]);

    // 2. Arrêter chaque session Puppeteer
    for (const instance of instancesRes.rows) {
      await sessionManager.deleteSession(instance.session_name);
    }

    // 3. Supprimer les instances de la DB
    await pool.query('DELETE FROM wa_instances WHERE user_id = $1', [userId]);

    // 3.5 Supprimer les messages de l'utilisateur (Fix FK constraint)
    await pool.query('DELETE FROM wa_messages WHERE user_id = $1', [userId]);

    // 4. Supprimer l'utilisateur
    await pool.query('DELETE FROM wa_users WHERE id = $1', [userId]);

    res.json({ message: 'Utilisateur et ses instances supprimés' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/admin/send-message', authenticateToken, requireAdmin, async (req, res) => {
  const { target, message } = req.body; // target: 'all' or userId (int)

  if (!target || !message) return res.status(400).json({ error: 'Cible et message requis' });

  try {
    let usersToNotify = [];

    if (target === 'all') {
      const result = await pool.query('SELECT phone FROM wa_users WHERE phone IS NOT NULL');
      usersToNotify = result.rows;
    } else {
      const result = await pool.query('SELECT phone FROM wa_users WHERE id = $1', [target]);
      if (result.rows.length > 0) {
        usersToNotify = [result.rows[0]];
      }
    }

    let sentCount = 0;
    for (const user of usersToNotify) {
      if (user.phone) {
        const success = await sendMessageViaAdmin(user.phone, message);
        if (success) sentCount++;
      }
    }

    res.json({ message: `Message envoyé à ${sentCount} utilisateur(s)` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// --- Routes Instances (Dashboard) ---

app.get('/api/instances', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, session_name, display_name, api_key, status, created_at FROM wa_instances WHERE user_id = $1', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/instances', authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom de session requis' });

  // Limite (sauf pour admin)
  if (req.user.role !== 'admin') {
    const countRes = await pool.query('SELECT COUNT(*) FROM wa_instances WHERE user_id = $1', [req.user.id]);
    if (parseInt(countRes.rows[0].count) >= 1) {
      return res.status(403).json({ error: 'Limite atteinte (1 instance max pour le plan gratuit)' });
    }
  }

  const sessionName = `user_${req.user.id}_${Date.now()}`;
  const apiKey = uuidv4();

  try {
    const result = await pool.query(
      'INSERT INTO wa_instances (user_id, session_name, display_name, api_key) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, sessionName, name, apiKey]
    );

    sessionManager.createSession(sessionName, apiKey);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/instances/:id', authenticateToken, async (req, res) => {
  try {
    // 1. Check if instance exists and belongs to user (or user is admin)
    let query = 'SELECT * FROM wa_instances WHERE id = $1';
    let params = [req.params.id];

    if (req.user.role !== 'admin') {
      query += ' AND user_id = $2';
      params.push(req.user.id);
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Instance non trouvée ou accès refusé' });
    }

    const instance = result.rows[0];

    // 2. Stop Puppeteer Session
    await sessionManager.deleteSession(instance.session_name);

    // 3. Delete from DB
    await pool.query('DELETE FROM wa_instances WHERE id = $1', [req.params.id]);

    res.json({ message: 'Instance supprimée avec succès' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/instances/:id/qr', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM wa_instances WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Instance non trouvée' });

    const instance = result.rows[0];
    const sessionName = instance.session_name;

    // Lazy Loading: Si la session n'est pas en mémoire, on la démarre
    let client = sessionManager.getSession(sessionName);
    if (!client) {
      console.log(`Lazy start pour ${sessionName}`);
      client = sessionManager.createSession(sessionName, instance.api_key);
    }

    const qr = sessionManager.getQrCode(sessionName);

    if (qr) {
      res.json({ dataUrl: qr });
    } else {
      if ((client && client.isReady) || instance.status === 'CONNECTED') {
        res.status(200).json({ message: 'Déjà connecté', connected: true });
      } else if (instance.status === 'AUTHENTICATED') {
        // Session reconnectée via LocalAuth, en attente de l'événement ready
        res.status(202).json({ message: 'Authentification réussie, connexion en cours...', connecting: true });
      } else {
        res.status(202).json({ message: 'QR non prêt ou instance en cours de démarrage' });
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/messages', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM wa_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// --- Routes Publiques d'Envoi (API) ---

const authenticateApiKey = async (req, res, next) => {
  const apiKey = (req.header('X-WA-SECRET') || '').trim();

  if (WA_SECRET_LEGACY && apiKey === WA_SECRET_LEGACY) {
    return res.status(401).json({ error: 'Veuillez utiliser votre nouvelle API Key' });
  }

  if (!apiKey) return res.status(401).json({ error: 'API Key manquante' });

  try {
    // 1. Vérifier la clé API et récupérer les infos utilisateur
    const result = await pool.query(`
      SELECT u.id, u.phone, u.role, u.subscription_plan, u.message_count, u.message_limit, i.session_name
      FROM wa_instances i
      JOIN wa_users u ON i.user_id = u.id
      WHERE i.api_key = $1
    `, [apiKey]);

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'API Key invalide' });
    }

    const user = result.rows[0];
    const sessionName = user.session_name;

    // 2. Vérifier les limites (Système de Crédits) — admins exemptés
    if (user.role !== 'admin') {
      const limit = user.message_limit || 25;
      if (user.message_count >= limit) {
        return res.status(402).json({
          error: `Limite de messages atteinte (${user.message_count}/${limit}). Veuillez recharger vos crédits.`,
          code: 'LIMIT_REACHED'
        });
      }
    }

    // 3. Récupérer le client WhatsApp
    const client = sessionManager.getSession(sessionName);

    // Si le client n'est pas en mémoire, on essaie de le trouver via sessionManager (au cas où)
    // Mais sessionManager.getSession est ce qu'on veut.

    await assertClientReady(client);

    // Notification seuil bas (ex: reste 5 messages) — pas pour les admins
    if (user.role !== 'admin') {
      const remaining = (user.message_limit || 25) - user.message_count;
      if (remaining === 5) {
        client.sendMessage(toJid(user.phone || ''), `⚠️ *Alerte Crédits Konekt*\n\nIl ne vous reste que *5 messages*.\nPensez à recharger votre compte pour éviter toute interruption.`)
          .catch(err => console.error('Failed to send low balance warning', err));
      }
    }

    req.waClient = client;
    req.waUser = user;
    next();

  } catch (err) {
    console.error(err);
    if (err?.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    return res.status(500).json({ error: 'Erreur vérification API Key' });
  }
};

const incrementMessageCount = async (userId, count = 1) => {
  await pool.query('UPDATE wa_users SET message_count = message_count + $1 WHERE id = $2', [count, userId]);
};

app.post('/send', authenticateApiKey, async (req, res) => {
  const { phone, message, mediaUrl } = req.body;
  if (!phone || (!message && !mediaUrl)) return res.status(400).json({ error: 'phone and (message or mediaUrl) required' });

  const cost = mediaUrl ? 3 : 1;

  if (req.waUser.role !== 'admin') {
    const limit = req.waUser.message_limit || 25;
    if (req.waUser.message_count + cost > limit) {
      return res.status(402).json({
        error: `Crédits insuffisants. Coût: ${cost}, Reste: ${limit - req.waUser.message_count}`,
        code: 'LIMIT_REACHED'
      });
    }
  }

  try {
    // Vérification supplémentaire de l'état du client WhatsApp
    await assertClientReady(req.waClient);

    const jid = await resolveRecipient(req.waClient, phone);

    if (mediaUrl) {
      const media = await processImage(mediaUrl);
      await req.waClient.sendMessage(jid, media, { caption: message || '' });
    } else {
      await req.waClient.sendMessage(jid, message);
    }

    await incrementMessageCount(req.waUser.id, cost);

    // Log message
    await pool.query(
      'INSERT INTO wa_messages (user_id, phone, message, status) VALUES ($1, $2, $3, $4)',
      [req.waUser.id, phone, message || '[MEDIA]', 'SENT']
    );

    res.json({ ok: true, cost });
  } catch (e) {
    res.status(e?.statusCode || 502).json({ error: 'wa-send-failed', detail: String(e?.message || e) });
  }
});

app.post('/send-batch', authenticateApiKey, async (req, res) => {
  const { numbers, message, mediaUrl } = req.body; // numbers: string[], message: string

  if (!Array.isArray(numbers) || (!message && !mediaUrl)) {
    return res.status(400).json({ error: 'numbers (array) and (message or mediaUrl) required' });
  }

  const results = [];
  let currentCount = req.waUser.message_count;
  const limit = req.waUser.message_limit || 25;
  const cost = mediaUrl ? 3 : 1;

  let media = null;
  if (mediaUrl) {
    try {
      media = await processImage(mediaUrl);
    } catch (e) {
      return res.status(400).json({ error: 'Failed to process image', details: e.message });
    }
  }

  for (const phone of numbers) {
    if (currentCount + cost > limit) {
       results.push({ phone, status: 'failed', error: 'Limit reached' });
       continue;
    }

    try {
      const jid = await resolveRecipient(req.waClient, phone);
      if (media) {
        await req.waClient.sendMessage(jid, media, { caption: message || '' });
      } else {
        await req.waClient.sendMessage(jid, message);
      }

      await incrementMessageCount(req.waUser.id, cost);
      currentCount += cost;

      await pool.query(
        'INSERT INTO wa_messages (user_id, phone, message, status) VALUES ($1, $2, $3, $4)',
        [req.waUser.id, phone, message || '[MEDIA]', 'SENT']
      );
      results.push({ phone, status: 'sent' });
    } catch (e) {
      results.push({ phone, status: 'failed', error: e.message });
    }
  }
  res.json({ results });
});

app.post('/send-otp', authenticateApiKey, async (req, res) => {
  const { phone, code, businessName = 'Konekt' } = req.body;
  if (!phone || !code) return res.status(400).json({ error: 'phone and code required' });

  const formattedCode = code.toString().split('').join(' ');
  const message = `🔐 *Code de vérification ${businessName}*\n\nVotre code OTP est :\n*${formattedCode}*\n\n⚠️ *Important :*\n• Ce code expire dans 15 minutes\n• Ne partagez jamais ce code\n\n--\n${businessName}`;

  try {
    const jid = await resolveRecipient(req.waClient, phone);
    await req.waClient.sendMessage(jid, message);
    await incrementMessageCount(req.waUser.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(e?.statusCode || 502).json({ error: 'wa-send-failed', detail: String(e?.message || e) });
  }
});

// --- Catch-all Frontend ---
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Démarrage ---
const startServer = async () => {
  await initDb();
  await sessionManager.initializeSessions();

  app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
  });
};

startServer();
