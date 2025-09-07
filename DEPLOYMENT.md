# Deployment Guide: Google Cloud + Vercel

This guide covers deploying Figurdle with the API on Google Cloud Run and the frontend on Vercel.

## Prerequisites

1. **Google Cloud Account**: Enable Cloud Run and Cloud SQL APIs
2. **Vercel Account**: Connect to your GitHub repository
3. **OpenAI API Key**: For character generation

## 1. Deploy API to Google Cloud Run

### Setup Cloud SQL Database

1. **Create PostgreSQL instance:**
   ```bash
   gcloud sql instances create figurdle-db \
     --database-version=POSTGRES_15 \
     --tier=db-f1-micro \
     --region=us-central1
   ```

2. **Create database:**
   ```bash
   gcloud sql databases create figurdle --instance=figurdle-db
   ```

3. **Create user:**
   ```bash
   gcloud sql users create figurdle-user \
     --instance=figurdle-db \
     --password=[YOUR_PASSWORD]
   ```

### Deploy API to Cloud Run

1. **Navigate to API directory:**
   ```bash
   cd apps/api
   ```

2. **Deploy with Cloud Run:**
   ```bash
   gcloud run deploy figurdle-api \
     --source . \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars ENVIRONMENT=production \
     --set-env-vars INSTANCE_CONNECTION_NAME=[PROJECT_ID]:[REGION]:figurdle-db \
     --set-env-vars DB_USER=figurdle-user \
     --set-env-vars DB_PASS=[YOUR_PASSWORD] \
     --set-env-vars DB_NAME=figurdle \
     --set-env-vars OPENAI_API_KEY=[YOUR_OPENAI_KEY] \
     --set-env-vars PUZZLE_SIGNING_SECRET=[SECURE_RANDOM_STRING]
   ```

3. **Run database migrations:**
   ```bash
   # Get Cloud Run URL
   API_URL=$(gcloud run services describe figurdle-api --region us-central1 --format 'value(status.url)')
   
   # Run migrations (you'll need to do this from a local connection or Cloud Shell)
   # Set up connection to Cloud SQL and run: alembic upgrade head
   ```

### Update CORS with Vercel Domain

After deploying to Vercel (next step), update the API CORS settings:

1. Get your Vercel URL
2. Update `apps/api/app/main.py` line 21:
   ```python
   allowed_origins.extend(["https://your-app.vercel.app"])
   ```
3. Redeploy the API

## 2. Deploy Frontend to Vercel

### Option A: Vercel Dashboard (Recommended)

1. **Connect Repository:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Set root directory to `apps/web`

2. **Configure Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL = [YOUR_CLOUD_RUN_URL]
   ```

3. **Deploy:**
   - Vercel will auto-deploy on every git push to main

### Option B: Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   cd apps/web
   vercel --prod
   ```

## 3. Environment Variables Summary

### Google Cloud Run (API)
```bash
ENVIRONMENT=production
INSTANCE_CONNECTION_NAME=[PROJECT_ID]:[REGION]:figurdle-db
DB_USER=figurdle-user
DB_PASS=[YOUR_PASSWORD]
DB_NAME=figurdle
OPENAI_API_KEY=[YOUR_OPENAI_KEY]
PUZZLE_SIGNING_SECRET=[SECURE_RANDOM_STRING]
PORT=8080
```

### Vercel (Frontend)
```bash
NEXT_PUBLIC_API_URL=[YOUR_CLOUD_RUN_URL]
```

## 4. Post-Deployment Tasks

1. **Test the API:**
   ```bash
   curl [YOUR_CLOUD_RUN_URL]/health
   ```

2. **Generate first puzzle:**
   ```bash
   curl -X POST [YOUR_CLOUD_RUN_URL]/admin/rotate
   ```

3. **Update CORS:**
   - Add your Vercel domain to allowed origins
   - Redeploy API

4. **Set up custom domain (optional):**
   - Configure custom domain in Vercel dashboard
   - Update API CORS with custom domain

## 5. Monitoring & Maintenance

### View Logs
```bash
# API logs
gcloud run services logs read figurdle-api --region us-central1

# Database logs
gcloud sql operations list --instance figurdle-db
```

### Scaling
```bash
# Update Cloud Run service
gcloud run services update figurdle-api \
  --region us-central1 \
  --cpu 1 \
  --memory 512Mi \
  --max-instances 10
```

### Database Backups
```bash
# Create backup
gcloud sql backups create --instance figurdle-db

# List backups
gcloud sql backups list --instance figurdle-db
```

## Cost Estimates

- **Cloud SQL (f1-micro)**: ~$7-15/month
- **Cloud Run**: ~$0-5/month (free tier covers most usage)
- **Vercel**: Free for hobby projects
- **Total**: ~$7-20/month for typical usage

## Troubleshooting

### Common Issues

1. **Database connection fails:**
   - Check INSTANCE_CONNECTION_NAME format
   - Verify Cloud SQL Auth Proxy setup

2. **CORS errors:**
   - Update allowed origins in main.py
   - Redeploy API after changes

3. **Environment variables:**
   - Use gcloud run services update to modify env vars
   - Restart service after changes

### Support Commands

```bash
# Check Cloud Run status
gcloud run services describe figurdle-api --region us-central1

# Check Cloud SQL status
gcloud sql instances describe figurdle-db

# View environment variables
gcloud run services describe figurdle-api --region us-central1 --format="export"
```