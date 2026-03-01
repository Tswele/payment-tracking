# Deploy Payment Tracking to the Web

Get a single URL (e.g. `https://payment-tracking-xxxx.onrender.com`) so everyone in your list can open it in a browser and upload proof of payment. No VPN or “only on my computer” — it’s on the internet.

---

## Option 1: Render.com (recommended, free to start)

### 1. Put the project on GitHub

1. Create a new repository on [GitHub](https://github.com/new) (e.g. `payment-tracking`). Don’t add a README if the folder already has one.
2. Open a terminal in your **Payment Tracking** folder and run:

```bash
cd "c:\Users\shanb002\Desktop\Payment Tracking"
git init
git add .
git commit -m "Initial commit - Payment Tracking app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/payment-tracking.git
git push -u origin main
```

Replace `YOUR_USERNAME` and `payment-tracking` with your GitHub username and repo name.

### 2. Deploy on Render

1. Go to [render.com](https://render.com) and sign up (or log in). Connect your **GitHub** account.
2. Click **Dashboard** → **New** → **Web Service**.
3. Select the **payment-tracking** repo (or whatever you named it).
4. Render may auto-detect settings. If not, set:
   - **Name:** `payment-tracking` (or any name).
   - **Root Directory:** leave blank (project root).
   - **Runtime:** `Node`.
   - **Build Command:**  
     `npm run install:all && npm run build`
   - **Start Command:**  
     `node server/index.js`
   - **Instance Type:** Free (or paid if you want always-on and no cold starts).
5. Click **Create Web Service**. Render will install dependencies, build the frontend, and start the server.
6. When the deploy finishes, you’ll see a URL like:
   - **https://payment-tracking-xxxx.onrender.com**
7. Open that URL in your browser. You should see the “Monthly Update” page. Share this link with everyone in the list — they can upload proof of payment and the grid updates automatically.

### 3. (Optional) Use the blueprint file instead

If your repo has the `render.yaml` file in the root:

1. In Render dashboard, click **New** → **Blueprint**.
2. Connect the same repo. Render will read `render.yaml` and create the Web Service with the right build and start commands.
3. After deploy, use the given URL the same way.

---

## Important notes for Render

- **Free tier:** The app may **sleep** after ~15 minutes with no traffic. The first person who opens the link after that might wait ~30 seconds for it to wake up. After that it’s fast until the next sleep.
- **Data and uploads:** On the free tier, data (e.g. `server/data/`) and uploaded files (`server/uploads/`) live on the server but can be **lost on redeploy or if the service is recreated**. For permanent storage you can add a [Render Disk](https://render.com/docs/disks) (paid) and point `server/data` and `server/uploads` to that disk, or later move to a database and file storage (e.g. S3).
- **One URL:** The same URL serves both the website and the API. No need to configure CORS or a separate frontend URL.

---

## Option 2: Other hosts (VPS, Railway, etc.)

- **Railway:** New Project → Deploy from GitHub → same repo. Set **Build:** `npm run install:all && npm run build`, **Start:** `node server/index.js`, and the **Root Directory** to the project root. Use the generated URL.
- **VPS (DigitalOcean, Linode, etc.):** On the server, clone the repo, run `npm run install:all && npm run build`, then `node server/index.js` (or use PM2). Point a domain or IP to the server and open port 80/443 (e.g. with Nginx as reverse proxy). Data and uploads persist on the server.

---

## After deployment

- Share the **single URL** with everyone who should upload proof (e.g. Zenzele, Zethembe, Seni, etc.).
- They open the link, choose their **Name** and **Month**, enter **Amount**, optionally check **Winner**, attach proof, and submit. The grid updates automatically; no manual Excel updates needed.
