# Mentora – Cloud Deployment Guide

## Option A: Google Cloud Run + Firebase Hosting (Recommended)

### Prerequisites
- Google Cloud project with billing enabled
- `gcloud` CLI installed and authenticated
- Firebase project linked to the GCP project

---

### 1. Build & push Docker images

```bash
# Authenticate Docker with GCP
gcloud auth configure-docker us-central1-docker.pkg.dev

# Create Artifact Registry repository
gcloud artifacts repositories create mentora \
  --repository-format=docker \
  --location=us-central1

# Build and push backend
docker build -t us-central1-docker.pkg.dev/YOUR_PROJECT/mentora/backend:latest ./backend
docker push    us-central1-docker.pkg.dev/YOUR_PROJECT/mentora/backend:latest
```

### 2. Store secrets in Secret Manager

```bash
# Firebase service account
gcloud secrets create mentora-firebase-sa --data-file=./backend/firebase-service-account.json

# OpenAI key
echo -n "sk-..." | gcloud secrets create mentora-openai-key --data-file=-
```

### 3. Deploy backend to Cloud Run

```bash
gcloud run deploy mentora-backend \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT/mentora/backend:latest \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8000 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars ENV=production,CORS_ORIGINS=https://YOUR_DOMAIN.web.app \
  --set-secrets GOOGLE_APPLICATION_CREDENTIALS=mentora-firebase-sa:latest,OPENAI_API_KEY=mentora-openai-key:latest
```

Note the deployed URL (e.g. `https://mentora-backend-xyz-uc.a.run.app`)

### 4. Deploy frontend to Firebase Hosting

```bash
cd frontend

# Update .env with Cloud Run URL
echo "REACT_APP_API_URL=https://mentora-backend-xyz-uc.a.run.app/api/v1" >> .env.production
echo "REACT_APP_WS_URL=wss://mentora-backend-xyz-uc.a.run.app" >> .env.production

npm run build

# Deploy
npm install -g firebase-tools
firebase login
firebase deploy --only hosting
```

---

## Option B: Railway (Easiest – Free tier available)

### Backend

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login

# Deploy backend
cd backend
railway init
railway up

# Set environment variables in Railway dashboard:
# ENV, OPENAI_API_KEY, CORS_ORIGINS, GOOGLE_APPLICATION_CREDENTIALS (paste JSON content)
```

### Frontend

Use [Vercel](https://vercel.com) or [Netlify](https://netlify.com):

```bash
cd frontend
npm run build

# Netlify
npx netlify-cli deploy --prod --dir=build

# Or Vercel
npx vercel --prod
```

---

## Option C: Render.com

Create a `render.yaml` in the project root:

```yaml
services:
  - type: web
    name: mentora-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    rootDir: backend
    envVars:
      - key: ENV
        value: production
      - key: OPENAI_API_KEY
        sync: false
      - key: CORS_ORIGINS
        value: https://mentora.onrender.com

  - type: web
    name: mentora-frontend
    env: static
    buildCommand: npm install --legacy-peer-deps && npm run build
    staticPublishPath: ./build
    rootDir: frontend
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

```bash
# Deploy
render up
```

---

## WebSocket on Cloud Platforms

Cloud Run and Render both support WebSocket connections natively.
For Railway, ensure HTTP/2 is enabled in the service settings.

For the frontend, update `REACT_APP_WS_URL` to use `wss://` (not `ws://`) in production.

---

## Custom Domain + SSL

### Firebase Hosting
```bash
firebase hosting:sites:create mentora-app
firebase target:apply hosting mentora-app mentora-app
# Then add custom domain in Firebase Console → Hosting → Add custom domain
```

### Cloud Run
```bash
gcloud beta run domain-mappings create \
  --service mentora-backend \
  --domain api.yourmentora.com \
  --region us-central1
```

---

## Environment Variables Summary

| Variable | Backend | Frontend | Required |
|----------|---------|----------|----------|
| `GOOGLE_APPLICATION_CREDENTIALS` | ✓ | — | Yes |
| `OPENAI_API_KEY` | ✓ | — | No (fallback) |
| `CORS_ORIGINS` | ✓ | — | Yes (prod) |
| `ENV` | ✓ | — | Yes |
| `REACT_APP_API_URL` | — | ✓ | Yes |
| `REACT_APP_WS_URL` | — | ✓ | Yes |
| `REACT_APP_FIREBASE_*` (×6) | — | ✓ | Yes |
| `REACT_APP_FIREBASE_VAPID_KEY` | — | ✓ | For FCM |

---

## Estimated Monthly Cost

| Platform | Backend | Frontend | Total |
|----------|---------|----------|-------|
| Cloud Run + Firebase Hosting | ~$5–15 | Free | ~$5–15 |
| Railway | ~$5 | ~$0 (Vercel) | ~$5 |
| Render.com | Free–$7 | Free | ~$0–7 |

All platforms include free SSL certificates.
