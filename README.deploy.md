# Guide de déploiement

Ce guide décrit les étapes pour déployer l'application sur Docker et Railway.

## Prérequis

- Docker 24+ installé
- Railway CLI installé si vous utilisez Railway
- Variables d'environnement configurées

## Variables d'environnement requises

- `DATABASE_URL`
- `JWT_SECRET`
- `ALLOWED_ORIGINS`
- `ADMIN_USERNAME` (optionnel pour créer un admin à la première mise en route)
- `ADMIN_PASSWORD` (optionnel)
- `FRONTEND_DIST_PATH` (optionnel si vous utilisez un build frontend personnalisé)

### Exemple de fichier `.env`

```text
DATABASE_URL=mysql+pymysql://user:password@host:3306/dormitory?charset=utf8mb4
JWT_SECRET=change_me
ALLOWED_ORIGINS=https://example.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_me
FRONTEND_DIST_PATH=backend/frontend/dist
```

## Déploiement Docker

### Build

```bash
docker build -t webfull .
```

### Exécution

```bash
docker run -p 8000:8000 --env-file .env webfull
```

### Accès

Ouvrez `http://localhost:8000`.

## Déploiement Railway

Railway utilise le `Dockerfile` et `railway.json` fournis.

### Étapes

1. Placez-vous à la racine du projet.
2. Configurez les variables Railway (`DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGINS`).
3. Lancez :

```bash
railway up
```

### Notes

- `railway.json` indique à Railway d’utiliser le `Dockerfile`.
- Si vous ne fournissez pas `ALLOWED_ORIGINS`, utilisez un domaine explicite en production.

## Environnement local

### Backend

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd web/frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

## Remarques de sécurité

- Ne committez jamais `.env`.
- Utilisez des secrets Railway pour `DATABASE_URL` et `JWT_SECRET`.
- Ne laissez pas `ALLOWED_ORIGINS` avec `*` en production.
