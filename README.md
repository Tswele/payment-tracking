# Payment Tracking (Monthly Update)

Replaces your **manual Excel "MONTHLY UPDATE"** sheet. Your team uploads proof of payment by **Name** and **Month**; the app keeps a spreadsheet-style grid with **Total Received**, **Outstanding**, and **Expected** — no more manual cell updates.

## What it does

- **Same layout as your Excel**: Rows = members (Zenzele, Zethembe, Seni, …), columns = months. Each cell shows the amount for that person and month, with **winner** when applicable.
- **Team uploads**: Select **Name**, **Month**, enter **Amount**, optionally check **Winner**, and attach proof (image or PDF). That (Name, Month) cell updates automatically.
- **Summary rows**: **Total Received** (sum per month), **Outstanding** (Expected − Total Received), **Expected** (default 2 550 per month; configurable via API).
- **Color coding**: Green for names and Total Received; red for missing past months and Outstanding; yellow for pending/Expected.
- **Proof**: Click the amount in a cell to open the uploaded proof file.

## Quick start

### 1. Install and run the backend

```bash
cd server
npm install
npm start
```

The API runs at **http://localhost:3001**.

### 2. Install and run the frontend

In a **second terminal**:

```bash
cd client
npm install
npm run dev
```

Open **http://localhost:5173** in your browser. Use this URL when you “give your team a website” — they can upload from here.

### 3. Share with your team

- Give them the URL (e.g. `http://YOUR_IP:5173` if they’re on the same network, or deploy the app and share that URL).
- They upload proof of payment; the system updates automatically.
- You (or an admin) can mark entries as verified from the same page.

## Tech

- **Backend**: Node.js, Express, Multer (file uploads). Data is stored in `server/data/payments.json`; files in `server/uploads/`.
- **Frontend**: React (Vite). Proxies `/api` and `/uploads` to the backend when using `npm run dev`.

## Deploy to the web (so everyone can access it)

The app is set up for **one URL** that serves both the website and the API. Easiest option: **Render.com** (free tier).

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for step-by-step instructions. Summary:

1. Push this project to a **GitHub** repo.
2. Sign up at **[render.com](https://render.com)** and connect the repo.
3. Create a **Web Service**; Render will use the included `render.yaml` (build + start commands are already set).
4. After deploy, you get a URL like `https://payment-tracking-xxxx.onrender.com` — share that link with everyone in the list. They open it in a browser and upload proof of payment; the grid updates automatically.

**Note:** On Render’s free tier, the app may sleep after 15 minutes of no use (first open can take ~30 seconds). Data and uploads are stored on the server but can be reset on redeploy; for long-term persistence you can add a [Render Disk](https://render.com/docs/disks) (paid) later.
