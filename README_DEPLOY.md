# Deployment Guide: Render & Supabase

## 1. Supabase Setup (Database)

1. **Create a Project**: Go to [https://supabase.com/](https://supabase.com/) and create a new project.
2. **Run SQL Script**: Go to the **SQL Editor** in your Supabase dashboard and execute the content of `artifacts/supabase_quick_migration.sql` (or `artifacts/supabase_setup.sql` if you want a more normalized structure).
3. **Get Keys**: Go to **Project Settings > API** and copy your **Project URL** and **Anon Key**.
4. **Update `public/core.js`**:
   - Open `public/core.js`.
   - Replace `YOUR_SUPABASE_URL` with your Project URL.
   - Replace `YOUR_SUPABASE_ANON_KEY` with your Anon Key.

## 2. Render Setup (Frontend)

1. **Push to GitHub**: If your project isn't already on GitHub, push it there.
2. **Create Web Service**:
   - Log in to [Render](https://render.com/).
   - Click **New > Web Service**.
   - Connect your GitHub repository.
3. **Configure Build & Start**:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Render will automatically detect Node.js.
4. **Environment Variables**:
   - Go to the **Environment** tab on Render.
   - Add `PORT`: `3000` (optional, as Render manages this).
   - If you want to use server-side environment variables, you can add them here, but since the app is currently pure client-side, the keys must be in `core.js`.

## 3. Local Development

1. Run `npm install` to install Express.
2. Run `npm start` to start the local server.
3. Your app will be available at `http://localhost:3000`.

---
**Note**: I've updated `core.js` to automatically sync your existing Local Storage data into Supabase once you set the keys.
