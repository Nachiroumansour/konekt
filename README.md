# Konekt

>Konekt est une application web permettant d'envoyer des messages WhatsApp via une interface web moderne. Elle se compose d'un backend Node.js (Express) et d'un frontend React, le tout orchestré avec Docker et Docker Compose.

## Fonctionnalités principales

- Authentification et gestion de sessions WhatsApp
- Envoi de messages WhatsApp via API
- Interface d'administration (React)
- Sécurité (JWT, Helmet, Rate Limiting)
- Déploiement automatisé via GitHub Actions

## Structure du projet

- `client/` : Frontend React (Vite, TailwindCSS)
- `server/` : Backend Node.js (Express, WhatsApp Web.js)
- `docker-compose.yml` : Orchestration des services
- `deploy.yml` : Déploiement CI/CD

## Prérequis

- Node.js >= 18
- Docker & Docker Compose
- Accès à une base de données PostgreSQL

## Installation locale

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/SatoshiJr1/konekt.git
   cd konekt
   ```
2. **Configurer les variables d'environnement**
   - Créez un fichier `.env` à la racine avec les variables nécessaires (voir exemple dans le workflow GitHub Actions).
3. **Lancer en local avec Docker Compose**
   ```bash
   docker compose up --build
   ```
   L'API sera disponible sur le port 4001 par défaut.

## Démarrage manuel (développement)

### Backend
```bash
cd server
npm install
npm start
```

### Frontend
```bash
cd client
npm install
npm run dev
```

## Déploiement

Le déploiement est automatisé via GitHub Actions (`deploy.yml`).

- À chaque push sur `main` ou `master`, le workflow construit l'image Docker, valide les ressources, et déploie sur le serveur VPS.
- Les variables sensibles sont injectées via les secrets GitHub.

## Contribution

Les contributions sont les bienvenues !

1. Forkez le repo
2. Créez une branche (`feature/ma-fonctionnalite`)
3. Ouvrez une Pull Request

## Licence

Ce projet est sous licence UNLICENSED.
