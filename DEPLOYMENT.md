# Deploying Rank S to GitHub + DigitalOcean

## Part 1 — Push to GitHub

1. Create a new, empty repository on GitHub (don't initialize it with a README — this project already has one). Note the URL it gives you, e.g. `https://github.com/yourname/rank-s-nuxt.git`.

2. From inside the project folder on your machine:

   ```bash
   git init
   git add .
   git commit -m "Initial commit - Rank S gym management system"
   git branch -M main
   git remote add origin https://github.com/yourname/rank-s-nuxt.git
   git push -u origin main
   ```

   If GitHub asks for credentials, use a Personal Access Token instead of your password (Settings → Developer settings → Personal access tokens on github.com), or push via SSH if you have a key set up.

3. Double-check `.env` did **not** get pushed — it's in `.gitignore` on purpose, since it holds your MongoDB connection string and JWT secret. Only `.env.example` should be in the repo.

## Part 2 — Database: MongoDB Atlas

If you're not already using MongoDB Atlas (a hosted database), set that up first — DigitalOcean's App Platform doesn't run MongoDB for you, so the easiest path is Atlas's free tier:

1. https://www.mongodb.com/cloud/atlas/register → create a free M0 cluster.
2. Database Access → create a user with a password (avoid special characters like `@` or `:` to skip URL-encoding headaches).
3. Network Access → add `0.0.0.0/0` (allow from anywhere), since DigitalOcean's IPs aren't fixed on the basic tier.
4. Connect → Drivers → copy the connection string, and append a database name before the `?`, e.g.:
   ```
   mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/rank-s?retryWrites=true&w=majority
   ```

## Part 3 — Deploy to DigitalOcean App Platform

App Platform is the simplest option for a Nuxt app — no server management, deploys straight from your GitHub repo.

1. Log into https://cloud.digitalocean.com → **Apps** → **Create App**.
2. Choose **GitHub** as the source, authorize DigitalOcean to access your repos, and pick the `rank-s-nuxt` repo and `main` branch.
3. DigitalOcean will detect it as a Node.js app. Set:
   - **Build command**: `npm install && npm run build`
   - **Run command**: `node .output/server/index.mjs`
   - **HTTP port**: `8080`
4. Under **Environment Variables**, add (mark both as "Encrypted"):
   - `MONGODB_URI` = your Atlas connection string from Part 2
   - `JWT_SECRET` = a long random string (see below if you need to generate one)
   - `NITRO_PORT` = `8080`
   - `NITRO_HOST` = `0.0.0.0`
5. Pick the **Basic** plan (the smallest instance is enough for testing/small gyms).
6. Click **Create Resources**. The first deploy takes a few minutes — DigitalOcean will give you a live URL like `https://rank-s-xxxxx.ondigitalocean.app`.
7. Once it's live, SSH isn't available on App Platform, so run the seed script **locally** against your Atlas database before or after deploy:
   ```bash
   MONGODB_URI="your-atlas-uri" npm run seed
   ```
   This creates the super admin, regular admin, and sample data directly in the same database your deployed app reads from.

A ready-made spec for this is included at `.do/app.yaml` — edit the `repo:` line to match your GitHub username/repo, then you can also deploy via `doctl apps create --spec .do/app.yaml` if you prefer the CLI over the web UI.

### Generating a JWT secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Part 4 — Alternative: a DigitalOcean Droplet (more control, more setup)

If you'd rather run this on a regular Linux server instead of App Platform:

1. Create a Droplet (Ubuntu 22.04, Basic plan is fine).
2. SSH in, install Node.js 18+ and `git`.
3. `git clone` your repo, `cd` into it, `npm install`, create `.env` with your `MONGODB_URI` and `JWT_SECRET`.
4. `npm run build`, then run it persistently with a process manager:
   ```bash
   npm install -g pm2
   pm2 start .output/server/index.mjs --name rank-s
   pm2 save
   pm2 startup
   ```
5. Put Nginx in front of it as a reverse proxy to port 3000 (Nitro's default), and use Certbot for free HTTPS if you're pointing a domain at it.

This gives you full control but means you're responsible for security updates, restarts, and monitoring — App Platform handles all of that for you.

## After deploying

- Visit your live URL and log in with the seeded `super`/`super123` account — **change this password immediately** via the My Account page once you're live.
- The public `/kiosk` and `/lobby` pages will be live at `https://your-app-url/kiosk` and `/lobby` — bookmark those on whatever tablet/TV you're using at the front desk.
