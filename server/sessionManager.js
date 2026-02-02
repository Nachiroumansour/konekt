import QRCode from 'qrcode';
import pkg from 'whatsapp-web.js';
import { pool } from './db.js';
const { Client, LocalAuth } = pkg;

class SessionManager {
  constructor() {
    this.sessions = new Map(); // session_name -> Client
    this.qrCodes = new Map(); // session_name -> QR Code Data URL
  }

  async initializeSessions() {
    console.log('Restauration des sessions actives...');
    // Optimisation: Ne redémarrer que les sessions qui étaient connectées ou en attente de QR
    // Les sessions 'DISCONNECTED' ne seront démarrées que sur demande (Lazy Loading)
    const res = await pool.query("SELECT * FROM wa_instances WHERE status IN ('CONNECTED', 'QR_READY')");
    for (const instance of res.rows) {
      console.log(`Démarrage de la session: ${instance.session_name}`);
      this.createSession(instance.session_name, instance.api_key);
      // Stagger start to prevent CPU/Memory spikes
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  createSession(sessionName, apiKey) {
    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: sessionName,
        dataPath: './.wwebjs_auth'
      }),
      puppeteer: {
        executablePath: process.env.CHROME_PATH || undefined,
        protocolTimeout: 120000, // Increase timeout to 2 minutes
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--disable-gpu'
        ],
        headless: true, // or 'new'
      }
    });

    // Ajout de logs sur tous les événements pour debug
    client.on('loading_screen', (percent, message) => {
      console.log(`Chargement ${sessionName}: ${percent}% - ${message}`);
    });

    client.on('change_state', state => {
      console.log(`Client ${sessionName} state:`, state);
    });
    client.on('error', err => {
      console.error(`Client ${sessionName} error:`, err);
    });

    client.on('qr', async (qr) => {
      console.log(`QR Code reçu pour ${sessionName}`);
      try {
        const dataUrl = await QRCode.toDataURL(qr);
        this.qrCodes.set(sessionName, dataUrl);
        await this.updateStatus(sessionName, 'QR_READY');
      } catch (err) {
        console.error('Erreur génération QR:', err);
      }
    });

    client.on('authenticated', async () => {
      console.log(`Client ${sessionName} authentifié !`);
      this.qrCodes.delete(sessionName);
      // On marque comme connecté dès l'authentification pour une UX plus rapide
      // Et on considère le client comme 'prêt' pour l'envoi de messages (bypass attente sync)
      client.isReady = true;
      await this.updateStatus(sessionName, 'CONNECTED');
    });


    client.on('ready', async () => {
      console.log(`Client ${sessionName} est prêt !`);
      client.isReady = true;
      this.qrCodes.delete(sessionName);
      await this.updateStatus(sessionName, 'CONNECTED');
    });

    client.on('disconnected', async (reason) => {
      console.log(`Client ${sessionName} déconnecté: ${reason}`);
      client.isReady = false;
      this.qrCodes.delete(sessionName);
      await this.updateStatus(sessionName, 'DISCONNECTED');
    });

    client.initialize().catch(err => {
      console.error(`Erreur init client ${sessionName}:`, err);
    });

    this.sessions.set(sessionName, client);
    return client;
  }

  async deleteSession(sessionName) {
    const client = this.sessions.get(sessionName);
    if (client) {
      try {
        await client.destroy();
      } catch (e) {
        console.error(`Erreur destruction client ${sessionName}:`, e);
      }
      this.sessions.delete(sessionName);
      this.qrCodes.delete(sessionName);
    }
  }

  async updateStatus(sessionName, status) {
    try {
      await pool.query('UPDATE wa_instances SET status = $1 WHERE session_name = $2', [status, sessionName]);
    } catch (err) {
      console.error(`Erreur update status ${sessionName}:`, err);
    }
  }

  getSession(sessionName) {
    return this.sessions.get(sessionName);
  }

  getQrCode(sessionName) {
    return this.qrCodes.get(sessionName);
  }

  async getClientByApiKey(apiKey) {
    const res = await pool.query('SELECT session_name FROM wa_instances WHERE api_key = $1', [apiKey]);
    if (res.rows.length === 0) return null;
    return this.sessions.get(res.rows[0].session_name);
  }
}

export const sessionManager = new SessionManager();
