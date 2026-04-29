# Deployment Guide

## 1) GitHub

Initialize and push this folder:

```powershell
cd "d:\PG Thesis_NAISH\Joju"
git init
git add .
git commit -m "Initial multimodal dysphagia rehab simulator MVP"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

## 2) Frontend Deploy (Vercel)

```powershell
cd "d:\PG Thesis_NAISH\Joju\frontend"
npm i -g vercel
vercel login
vercel --prod
```

## 3) Frontend Deploy (Cloudflare Pages)

```powershell
cd "d:\PG Thesis_NAISH\Joju\frontend"
npm i -g wrangler
wrangler login
npm install
npm run build
wrangler pages project create dysphagia-rehab-frontend
wrangler pages deploy dist
```

## 4) Backend Run (Local FastAPI for sEMG)

```powershell
cd "d:\PG Thesis_NAISH\Joju\backend"
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

While backend is running, press the `Spacebar` in its terminal to generate swallow spikes in mock data.
