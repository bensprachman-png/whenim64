## WhenIm64 Command Cheat Sheet

### Dev Server
```bash
npm run dev          # Start dev server (http://localhost:3000)
```

### Build & Production
```bash
npm run build        # Build for production (catches errors)
npm run start        # Run production build locally
npm run lint         # Run ESLint
npx tsc --noEmit     # TypeScript type-check without building
```

### Database — Local
```bash
# Local DB is file:./whenim64.db (SQLite)
# Push schema changes to local DB:
npx drizzle-kit push

# Open local DB in Drizzle Studio (visual browser):
npx drizzle-kit studio
```

### Database — Production (Turso)
```bash
# Push schema changes to prod DB:
TURSO_DATABASE_URL="libsql://whenim64-bensprachman-png.aws-us-east-1.turso.io" \
  TURSO_AUTH_TOKEN="<prod token from .env.local>" \
  npx drizzle-kit push

# Or run raw SQL directly (via Node since turso CLI isn't installed):
node -e "
const {createClient} = require('@libsql/client');
const client = createClient({ url: 'libsql://whenim64-bensprachman-png.aws-us-east-1.turso.io', authToken: 'YOUR_TOKEN' });
client.execute('YOUR SQL HERE').then(r => { console.log(r); process.exit(0); });
"
```

### Git
```bash
git status                      # See changed files
git diff                        # See unstaged changes
git add src/                    # Stage specific folder
git commit -m "your message"    # Commit
git push                        # Push to remote (triggers Vercel deploy)
git log --oneline -10           # Recent commits
```

### Vercel
```bash
# Deployments are triggered automatically on git push
# To deploy without a code change (e.g. after adding env vars):
# → Vercel Dashboard > Deployments > Redeploy
```

### Stripe — Local Webhook Testing
```bash
# Install Stripe CLI (one-time):
winget install Stripe.StripeCli

# Listen and forward webhooks to local server:
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test events (in a second terminal):
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
```

> **Webhook secrets**: The CLI `listen` command prints a local `whsec_...` that differs from the
> Dashboard endpoint secret. Use the CLI secret in `.env.local` for local testing; use the
> Dashboard secret in Vercel env vars for production.

### Stripe — Test Credit Cards (Sandbox)

| Scenario | Card Number | Exp | CVC |
|---|---|---|---|
| **Success** | `4242 4242 4242 4242` | Any future date | Any 3 digits |
| **Requires auth (3DS)** | `4000 0025 0000 3155` | Any future date | Any 3 digits |
| **Payment declined** | `4000 0000 0000 0002` | Any future date | Any 3 digits |
| **Insufficient funds** | `4000 0000 0000 9995` | Any future date | Any 3 digits |
| **Card expired** | `4000 0000 0000 0069` | Any future date | Any 3 digits |
| **Incorrect CVC** | `4000 0000 0000 0127` | Any future date | Any 3 digits |

Use any name, any future expiry (e.g. `12/34`), any 3-digit CVC, and any ZIP code.

### Stripe — Go-Live Checklist
- [ ] Switch `STRIPE_SECRET_KEY` from `sk_test_` to `sk_live_` in Vercel env vars
- [ ] Create a new production webhook in Stripe Dashboard → Developers → Webhooks
  - Endpoint URL: `https://whenim64.com/api/stripe/webhook`
  - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- [ ] Copy the new production `whsec_...` into `STRIPE_WEBHOOK_SECRET` in Vercel
- [ ] Update `STRIPE_MONTHLY_PRICE_ID` / `STRIPE_YEARLY_PRICE_ID` to live price IDs
- [ ] Configure Customer Portal: Stripe Dashboard → Settings → Billing → Customer Portal

### Useful URLs
| What | URL |
|------|-----|
| App (local) | http://localhost:3000 |
| Demo page | http://localhost:3000/demo |
| Medicare demo | http://localhost:3000/demo-medicare |
| Admin panel | http://localhost:3000/admin |
| Drizzle Studio | http://local.drizzle.studio (when running) |
| Turso dashboard | https://turso.tech |
| Vercel dashboard | https://vercel.com |
| Stripe dashboard | https://dashboard.stripe.com |
| AdSense | https://adsense.google.com |
| Google Search Console | https://search.google.com/search-console |
