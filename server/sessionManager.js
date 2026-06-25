import path from 'path';
import QRCode from 'qrcode';
import pkg from 'whatsapp-web.js';
import { pool } from './db.js';
const { Client, LocalAuth } = pkg;

const AUTH_DATA_PATH = path.resolve(process.cwd(), '.wwebjs_auth');

class SessionManager {
  constructor() {
    this.sessions = new Map(); // session_name -> Client
    this.qrCodes = new Map(); // session_name -> QR Code Data URL
    this.bootWatchdogs = new Map(); // session_name -> Timeout
    this.restartAttempts = new Map(); // session_name -> number
    this.sessionApiKeys = new Map(); // session_name -> api_key

    this.BOOT_TIMEOUT_MS = Number(process.env.WA_BOOT_TIMEOUT_MS || 180000);
    this.RESTART_DELAY_MS = Number(process.env.WA_RESTART_DELAY_MS || 10000);
    this.MAX_RESTART_ATTEMPTS = Number(process.env.WA_MAX_RESTART_ATTEMPTS || 2);
  }

  async initializeSessions() {
    console.log('Restauration des sessions actives...');
    // Optimisation: Ne redémarrer que les sessions qui n'étaient pas explicitement déconnectées.
    // Cela inclut les sessions CONNECTED, QR_READY, AUTHENTICATED et même STARTING.
    const res = await pool.query("SELECT * FROM wa_instances WHERE status IN ('CONNECTED', 'QR_READY', 'AUTHENTICATED', 'STARTING')");
    for (const instance of res.rows) {
      console.log(`Démarrage de la session: ${instance.session_name}`);
      this.createSession(instance.session_name, instance.api_key);
      // Stagger start to prevent CPU/Memory spikes
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  createSession(sessionName, apiKey) {
    const existingClient = this.sessions.get(sessionName);
    if (existingClient) {
      return existingClient;
    }

    const effectiveApiKey = apiKey || this.sessionApiKeys.get(sessionName) || null;
    if (effectiveApiKey) {
      this.sessionApiKeys.set(sessionName, effectiveApiKey);
    }

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: sessionName,
        dataPath: AUTH_DATA_PATH
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
          '--disable-gpu',
          // Réduction mémoire / stabilité headless pour éviter les blocages au boot
          '--disable-extensions',
          '--disable-software-rasterizer',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ],
        headless: true, // or 'new'
      }
    });

    client.isReady = false;
    this.updateStatus(sessionName, 'STARTING').catch(() => {});
    this.scheduleBootWatchdog(sessionName, effectiveApiKey);

    // Ajout de logs sur tous les événements pour debug
    client.on('loading_screen', (percent, message) => {
      console.log(`Chargement ${sessionName}: ${percent}% - ${message}`);
    });

    client.on('change_state', state => {
      console.log(`Client ${sessionName} state:`, state);
      if (['CONFLICT', 'UNLAUNCHED', 'UNPAIRED'].includes(state)) {
        console.warn(`Client ${sessionName} state problem detected: ${state}`);
        this.restartSession(sessionName, effectiveApiKey, `state:${state}`).catch(err => {
          console.error(`Restart failed for ${sessionName} after state ${state}:`, err);
        });
      }
    });
    client.on('error', err => {
      console.error(`Client ${sessionName} error:`, err);
    });

    client.on('auth_failure', async (msg) => {
      console.error(`Client ${sessionName} auth_failure:`, msg);
      client.isReady = false;
      this.qrCodes.delete(sessionName);
      this.clearBootWatchdog(sessionName);
      this.sessions.delete(sessionName);
      await this.updateStatus(sessionName, 'DISCONNECTED');
      await this.restartSession(sessionName, effectiveApiKey, 'auth_failure');
    });

    client.on('qr', async (qr) => {
      console.log(`QR Code reçu pour ${sessionName}`);
      try {
        const dataUrl = await QRCode.toDataURL(qr);
        this.qrCodes.set(sessionName, dataUrl);
        this.clearBootWatchdog(sessionName);
        await this.updateStatus(sessionName, 'QR_READY');
      } catch (err) {
        console.error('Erreur génération QR:', err);
      }
    });

    client.on('authenticated', async () => {
      console.log(`Client ${sessionName} authentifié !`);
      this.qrCodes.delete(sessionName);
      client.isReady = false;
      this.scheduleBootWatchdog(sessionName, effectiveApiKey);
      await this.updateStatus(sessionName, 'AUTHENTICATED');
    });


    client.on('ready', async () => {
      console.log(`Client ${sessionName} est prêt !`);
      client.isReady = true;
      this.qrCodes.delete(sessionName);
      this.clearBootWatchdog(sessionName);
      this.restartAttempts.set(sessionName, 0);
      await this.updateStatus(sessionName, 'CONNECTED');
    });

    client.on('disconnected', async (reason) => {
      console.log(`Client ${sessionName} déconnecté: ${reason}`);
      client.isReady = false;
      this.qrCodes.delete(sessionName);
      this.clearBootWatchdog(sessionName);
      this.sessions.delete(sessionName);
      await this.updateStatus(sessionName, 'DISCONNECTED');
    });

    client.initialize().catch(async (err) => {
      console.error(`Erreur init client ${sessionName}:`, err);
      client.isReady = false;
      this.clearBootWatchdog(sessionName);
      await this.restartSession(sessionName, effectiveApiKey, 'initialize-error');
    });

    this.sessions.set(sessionName, client);
    return client;
  }

  async deleteSession(sessionName) {
    this.clearBootWatchdog(sessionName);

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

    this.sessionApiKeys.delete(sessionName);
    this.restartAttempts.delete(sessionName);
  }

  async updateStatus(sessionName, status) {
    try {
      await pool.query('UPDATE wa_instances SET status = $1 WHERE session_name = $2', [status, sessionName]);
    } catch (err) {
      console.error(`Erreur update status ${sessionName}:`, err);
    }
  }

  clearBootWatchdog(sessionName) {
    const timer = this.bootWatchdogs.get(sessionName);
    if (timer) {
      clearTimeout(timer);
      this.bootWatchdogs.delete(sessionName);
    }
  }

  scheduleBootWatchdog(sessionName, apiKey) {
    if (!this.BOOT_TIMEOUT_MS || this.BOOT_TIMEOUT_MS <= 0) return;

    this.clearBootWatchdog(sessionName);

    const timer = setTimeout(() => {
      this.handleBootTimeout(sessionName, apiKey).catch(err => {
        console.error(`Erreur watchdog ${sessionName}:`, err);
      });
    }, this.BOOT_TIMEOUT_MS);

    this.bootWatchdogs.set(sessionName, timer);
  }

  async handleBootTimeout(sessionName, apiKey) {
    const client = this.sessions.get(sessionName);
    if (!client || client.isReady) return;

    console.warn(`Session ${sessionName} bloquée en chargement > ${this.BOOT_TIMEOUT_MS}ms`);
    await this.restartSession(sessionName, apiKey, 'boot-timeout');
  }

  async restartSession(sessionName, apiKey, reason = 'unknown') {
    const attempts = this.restartAttempts.get(sessionName) || 0;

    if (attempts >= this.MAX_RESTART_ATTEMPTS) {
      console.error(`Session ${sessionName} abandon après ${attempts} tentative(s) (${reason})`);
      await this.deleteSession(sessionName);
      await this.updateStatus(sessionName, 'DISCONNECTED');
      return;
    }

    const nextAttempt = attempts + 1;

    console.warn(`Restart session ${sessionName} tentative ${nextAttempt}/${this.MAX_RESTART_ATTEMPTS} (${reason})`);
    // deleteSession() efface le compteur de tentatives : on le repositionne
    // APRÈS sinon il est remis à zéro à chaque restart -> boucle infinie en STARTING.
    await this.deleteSession(sessionName);
    this.restartAttempts.set(sessionName, nextAttempt);

    setTimeout(() => {
      try {
        this.createSession(sessionName, apiKey);
      } catch (err) {
        console.error(`Erreur restart session ${sessionName}:`, err);
      }
    }, this.RESTART_DELAY_MS);
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
