# Production Deployment Guide

This guide details step-by-step instructions for deploying the **Personal AI Nutrition Platform** to production using **Supabase** (database, auth, and storage) and either **Vercel** (primary serverless host) or **Google Cloud Run** (containerized alternative).

---

## 1. Supabase Database & Auth Setup

### Step 1.1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Select your closest database region (e.g. `ap-south-1` Mumbai for India).
3. Record the generated **Database Password**.

### Step 1.2: Execute Database Migrations
1. Open your project in the Supabase Dashboard and navigate to the **SQL Editor**.
2. Open the file [`supabase/migrations/20261029000000_init_schema.sql`](file:///C:/SARVESWAR/Sarveswar_Health_App/supabase/migrations/20261029000000_init_schema.sql).
3. Copy its contents, paste them into the SQL Editor, and click **Run**.
4. The script creates all 20+ tables, custom enum types, triggers, and indexes.

### Step 1.3: Verify Row Level Security (RLS)
The migration automatically enables RLS on every user-scoped table:
```sql
-- All user tables enforce:
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own food logs"
ON food_logs FOR ALL USING (auth.uid() = user_id);
```
Verify under **Table Editor** > **Policies** that RLS is enabled on:
- `user_profiles`
- `nutrition_goals`
- `food_logs`
- `water_logs`
- `workout_logs`
- `weight_logs`
- `meal_plans`
- `saved_recipes`
- `offline_sync_queue`

### Step 1.4: Obtain API Credentials
In **Project Settings** > **API**:
- Copy **Project URL** -> `NEXT_PUBLIC_SUPABASE_URL`
- Copy **Project API Key (`anon` / public)** -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copy **Project API Key (`service_role` / secret)** -> `SUPABASE_SERVICE_ROLE_KEY` *(Never expose client-side)*

---

## 2. Option A: Deploy to Vercel (Recommended Primary)

### Step 2.1: Push Repository to GitHub
Ensure your code is pushed to your private GitHub/GitLab repository.

### Step 2.2: Import into Vercel
1. Log in to [Vercel](https://vercel.com) and click **Add New Project**.
2. Select your repository and choose **Next.js** framework preset.
3. Configure the **Environment Variables** in the Vercel dashboard:

| Variable | Description | Example / Source |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase Key | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | `eyJhbGci...` *(Server only)* |
| `GEMINI_API_KEY` | Google Gemini API Key | From [Google AI Studio](https://aistudio.google.com/) |
| `GEMINI_MODEL_FAST` | Fast Gemini Model | `gemini-2.5-flash` |
| `GEMINI_MODEL_PRO` | Reasoning Gemini Model | `gemini-2.5-pro` |
| `USDA_API_KEY` | USDA FoodData Central Key | Free from [api.data.gov](https://api.data.gov/) |
| `APP_TIMEZONE` | User Time Zone | `Asia/Kolkata` |

4. Click **Deploy**. Vercel will build and assign a production URL (e.g. `https://sarveswar-health-app.vercel.app`).

---

## 3. Option B: Deploy to Google Cloud Run (Containerized Alternative)

For self-contained container deployments on Google Cloud Platform:

### Step 3.1: Prerequisites
- Install the [Google Cloud CLI (`gcloud`)](https://cloud.google.com/sdk).
- Authenticate and select your Google Cloud project:
  ```bash
  gcloud auth login
  gcloud config set project [YOUR_GCP_PROJECT_ID]
  ```
- Enable Cloud Build and Cloud Run APIs:
  ```bash
  gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com
  ```

### Step 3.2: Build Container Image
Use Google Cloud Build to build the container using the provided [`Dockerfile`](file:///C:/SARVESWAR/Sarveswar_Health_App/Dockerfile):
```bash
gcloud builds submit --tag gcr.io/[YOUR_GCP_PROJECT_ID]/sarveswar-health-app
```

### Step 3.3: Deploy to Cloud Run
Deploy with minimum 1 instance to avoid cold starts:
```bash
gcloud run deploy sarveswar-health-app \
  --image gcr.io/[YOUR_GCP_PROJECT_ID]/sarveswar-health-app \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --min-instances 1 \
  --memory 1Gi \
  --cpu 1 \
  --set-env-vars NEXT_PUBLIC_SUPABASE_URL="https://xyz.supabase.co",NEXT_PUBLIC_SUPABASE_ANON_KEY="...",SUPABASE_SERVICE_ROLE_KEY="...",GEMINI_API_KEY="...",GEMINI_MODEL_FAST="gemini-2.5-flash",GEMINI_MODEL_PRO="gemini-2.5-pro",USDA_API_KEY="...",APP_TIMEZONE="Asia/Kolkata"
```

---

## 4. Post-Deployment Verification Checklist

1. **PWA Installation**:
   - Open the application URL in Google Chrome on Android or desktop.
   - Click the "Install" button or browser menu "Add to Home screen" / "Install Health Tracker".
   - Confirm the app opens in standalone window without browser chrome.
2. **Offline Mode**:
   - Toggle Device Network to Offline in DevTools.
   - Enter a food log ("2 boiled eggs").
   - Confirm it appears tagged as `"pending, not saved"`.
   - Re-enable network; verify entry synchronizes atomically with its idempotency key.
3. **AI Recommendations**:
   - Open `/recommendations` and ask for dinner suggestions.
   - Confirm suggestions follow the 7:00 PM cutoff and **strictly exclude whey protein**.
