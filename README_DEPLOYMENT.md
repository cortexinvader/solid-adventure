
# Deployment Guide

## Deploying to Render

### Prerequisites
1. Push your code to GitHub
2. Sign up for Render account at https://render.com

### Steps

1. **Connect GitHub Repository**
   - In Render dashboard, click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect `render.yaml`

2. **Configure Environment Variables**
   
   For Backend service:
   - `SESSION_SECRET` - Auto-generated or set your own
   - `ALLOWED_ORIGINS` - Set to your frontend URL (e.g., `https://your-app.onrender.com`)
   - Add Telegram bot token and chat ID if using backups

   For Frontend service:
   - No additional env vars needed (it's a static site)

3. **Deploy**
   - Click "Apply" to create both services
   - Wait for build to complete
   - Backend will be available at `https://ciesa-portal-backend.onrender.com`
   - Frontend will be available at `https://ciesa-portal-frontend.onrender.com`

### Important Notes

- Free tier services sleep after 15 minutes of inactivity
- First request may take 50+ seconds to wake up
- Database file persists on the backend service disk
- Consider upgrading to paid tier for production use

### Local Development

1. Copy `.env.example` to `.env`
2. Update values as needed
3. Run: `python backend/app.py` (backend)
4. Run: `cd frontend && npm run dev` (frontend)

## Deploying to Replit

Your app is already configured for Replit! Just click the "Deploy" button in the Replit interface and choose your deployment type:

- **Autoscale Deployment** - Recommended for production web apps
- **Reserved VM** - For always-on services
- **Static Deployment** - Frontend only (requires separate backend)
