# Deployment Guide: How to Host Your AI Petition Website

Follow these steps to move your website from your computer to the internet so everyone can use it.

## 1. Prepare Your Code
Before hosting, ensure you have your code uploaded to a private or public repository on **GitHub**.

### Essential Environment Variables
You will need these values ready for the hosting platforms:
- `DATABASE_URL`: Your Supabase connection string.
- `JWT_SECRET`: A long random string (e.g., `my_super_secret_123`).
- `GEMINI_API_KEY`: Your Google AI API key.
- `VITE_API_BASE_URL`: The URL of your backend after it is hosted on Render.

---

## 2. Deploy the Backend (Server) on Render
1.  Go to [Render.com](https://render.com) and log in with GitHub.
2.  Click **New +** > **Web Service**.
3.  Connect your GitHub repository.
4.  **Settings**:
    - **Root Directory**: `server`
    - **Build Command**: `npm install`
    - **Start Command**: `npm start`
5.  **Environment Variables**: Click "Advanced" and add:
    - `DATABASE_URL` = (From Supabase)
    - `JWT_SECRET` = (Your secret string)
    - `GEMINI_API_KEY` = (Your AI key)
6.  Click **Create Web Service**. 
7.  **Important**: Once it's live, copy the URL provided by Render (e.g., `https://civic-harmony-server.onrender.com`). **This is your `VITE_API_BASE_URL`**.

---

## 3. Deploy the Frontend (Website) on Vercel
1.  Go to [Vercel.com](https://vercel.com) and log in with GitHub.
2.  Click **Add New** > **Project**.
3.  Import your GitHub repository.
4.  **Settings**:
    - **Framework Preset**: Vite
    - **Root Directory**: Leave empty (root)
5.  **Environment Variables**:
    - Add `VITE_API_BASE_URL` and paste the Render URL you copied in Step 2.
6.  Click **Deploy**.

---

## 4. Why the QR Code Works Perfectly
Because I've updated the code to use `window.location.origin`, your QR codes will:
- **Automatically change**: It will point to your Vercel URL (e.g., `my-site.vercel.app/track/...`).
- **Scan anywhere**: Any phone with internet can scan it and track the petition live!

> [!TIP]
> Always deploy the **Backend (Render)** first so that you have the URL ready to give to Vercel during the frontend deployment.
