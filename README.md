# HCM Lite Frontend (Vercel)

## Local setup
1. `npm install`
2. Copy `.env.example` to `.env` and set `VITE_API_URL` to the deployed backend base URL (no trailing slash), e.g. `https://your-api.example.com`.
3. `npm run dev`

## Deploy to Vercel
1. Push this folder/repository to GitHub.
2. In Vercel, import the frontend repository.
3. Framework: Vite; Build command: `npm run build`; Output directory: `dist`.
4. Add Environment Variable `VITE_API_URL` = your backend's public URL, without trailing slash.
5. Redeploy after changing environment variables.

The frontend calls `${VITE_API_URL}/api/...`. The backend must allow this frontend domain via `CLIENT_ORIGIN`.
