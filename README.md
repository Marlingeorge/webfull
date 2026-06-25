# Distribution des Tâches du Dortoir

Ce projet est une application web complète pour gérer la répartition des tâches, les présences et l'historique des résidents d'un dortoir.

## Structure du projet

- `backend/` : API FastAPI, SQLAlchemy, Pydantic, gestion JWT, scheduler APScheduler
- `web/frontend/` : application React + Bootstrap + React Router + Axios + Chart.js

## Prérequis

- Python 3.11+ (ou version compatible)
- Node.js 18+ / npm 9+
- MySQL accessible (WampServer sur Windows)

## Backend

1. Ouvrez un terminal dans `backend/`
2. Activez votre environnement virtuel :

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

3. Installez les dépendances :

```powershell
pip install -r requirements.txt
```

4. Lancez le serveur :

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Le backend sera accessible sur `http://localhost:8000`.

## Frontend

1. Ouvrez un terminal dans `web/frontend/`
2. Installez les dépendances :

```powershell
npm install
```

3. Lancez le serveur de développement :

```powershell
npm run dev -- --host 0.0.0.0 --port 5173
```

ou

```powershell
npm start -- --host 0.0.0.0 --port 5173
```

Le frontend sera accessible sur `http://localhost:5173`.

## Notes importantes

- Si `npm start` ne fonctionne pas, utilisez `npm run dev` depuis `web/frontend/`.
- Le backend utilise par défaut la base MySQL `dormitory`; modifiez `backend/app/config.py` si nécessaire.
- Une distribution automatique est prévue chaque jour à 04:00 via APScheduler.

## Tests backend

```powershell
cd backend
python -m pytest tests/test_services.py -q
```
