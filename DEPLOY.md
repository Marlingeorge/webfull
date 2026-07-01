# Déploiement et tests rapides

Pré-requis: Python, Node.js/npm, et environnements pour Render.

1) Build frontend et copie dans `backend/frontend/dist` :

```bash
# depuis la racine du repo
make build
```

ou manuellement :

```bash
cd web/frontend
npm ci
npm run build
# copie automatique via postbuild ou manuellement
python ../../scripts/copy_frontend.py --source dist --dest ../../backend/frontend/dist
```

2) Lancer le backend localement (exemple) :

```bash
uvicorn backend.app.main:app --reload
```

3) Tests rapides :

```bash
curl -i http://localhost:8000/
curl -i http://localhost:8000/register
curl -i http://localhost:8000/api/persons
curl -i http://localhost:8000/health
```

4) Notes Render:
- Dans les `Build Commands`, exécutez `make build` pour construire frontend et copier les fichiers avant de lancer le serveur.
- Définissez `DATABASE_URL`, `ALLOWED_ORIGINS` (ou laissez `*`), et optionnellement `FRONTEND_DIST_PATH` si vous placez le build ailleurs.

## Déploiement Docker / Railway

Ce projet fournit également un `Dockerfile`, un `.dockerignore`, un `Procfile` et un `railway.json` pour simplifier le déploiement.

### Docker

```bash
docker build -t webfull .
docker run -p 8000:8000 --env-file .env webfull
```

### Railway

- Configurez les variables Railway : `DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGINS`.
- Si vous utilisez Railway CLI, exécutez `railway up` depuis la racine du dépôt.
- La configuration `railway.json` utilise le `Dockerfile` pour construire le projet.

