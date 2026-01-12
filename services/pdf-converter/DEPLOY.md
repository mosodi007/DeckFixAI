# PDF Converter Service Deployment Guide

## Quick Deploy to Railway (Recommended)

### Option 1: Via Railway Web UI

1. Go to https://railway.app and sign up/login
2. Click "New Project" → "Deploy from GitHub repo" (or "Empty Project")
3. If deploying from GitHub:
   - Connect your repository
   - Set root directory to: `services/pdf-converter`
   - Railway will auto-detect the Dockerfile
4. If deploying manually:
   - Click "New" → "GitHub Repo" or "Empty Project"
   - Add a service → "GitHub Repo" → Select your repo
   - Set root directory: `services/pdf-converter`
5. Railway will automatically:
   - Build using the Dockerfile
   - Install poppler-utils
   - Start the service
6. Once deployed, get your service URL (e.g., `https://pdf-converter-production.up.railway.app`)
7. Set this URL in Supabase:
   - Go to Supabase Dashboard → Edge Functions → Secrets
   - Add secret: `PDF_CONVERTER_SERVICE_URL` = `https://your-service-url.railway.app`

### Option 2: Via Railway CLI

```bash
cd services/pdf-converter
railway login  # Opens browser for authentication
railway init   # Creates new project (or links to existing)
railway up     # Deploys the service
railway domain # Get your service URL
```

Then set `PDF_CONVERTER_SERVICE_URL` in Supabase Edge Function secrets.

## Alternative: Deploy to Render

1. Go to https://render.com and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `pdf-converter`
   - **Root Directory**: `services/pdf-converter`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
5. Add environment variable:
   - `PORT` = `3001`
6. Deploy
7. Get your service URL and set `PDF_CONVERTER_SERVICE_URL` in Supabase

## Local Testing (Optional)

If you want to test locally first:

1. Install poppler: `brew install poppler` (macOS) or `apt-get install poppler-utils` (Linux)
2. Start the service: `npm start`
3. Use ngrok to expose it:
   ```bash
   ngrok http 3001
   ```
4. Use the ngrok URL (e.g., `https://abc123.ngrok.io`) as `PDF_CONVERTER_SERVICE_URL` in Supabase

## Verify Deployment

Once deployed, test the health endpoint:
```bash
curl https://your-service-url.railway.app/health
```

Should return: `{"status":"ok","service":"pdf-converter"}`

## Setting Supabase Environment Variable

1. Go to Supabase Dashboard
2. Navigate to: Project Settings → Edge Functions → Secrets
3. Add new secret:
   - **Name**: `PDF_CONVERTER_SERVICE_URL`
   - **Value**: Your deployed service URL (e.g., `https://pdf-converter-production.up.railway.app`)
4. Save

The Edge Function will now use this URL instead of `localhost:3001`.

