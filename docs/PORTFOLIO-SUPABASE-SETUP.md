# Portfolio Supabase setup (optional)

**Current implementation:** Portfolio and Studio Publish use **IndexedDB** (browser storage). No server or Supabase setup is required; Publish and Portfolio work out of the box. Data is stored locally in the browser.

The instructions below are only needed if you want to switch portfolio storage to Supabase (e.g. for cross-device sync). Otherwise you can ignore this file.

---

## If using Supabase for portfolio

Follow these steps so the Portfolio and Studio “Publish” flow works (table, storage bucket, and RLS).

---

## 1. Run the migration

Use **one** of these options.

### Option A: Supabase Dashboard (hosted project)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and select your project.
2. Go to **SQL Editor**.
3. Click **New query**.
4. On your **local machine**, open this file in your editor and copy **all of its SQL** (do not paste the file path into the Dashboard):
   - **File:** `backend/supabase/migrations/20240101000003_create_portfolio_items.sql`
5. Paste the copied SQL into the Supabase SQL Editor and click **Run** (or Cmd/Ctrl+Enter).
6. Confirm you see a success message.

### Option B: Supabase CLI (local or linked project)

In this repo the Supabase config and migrations live under **`backend/`**, not at the repo root. The CLI only sees the `supabase` folder in your **current directory**, so you must run from `backend`:

```bash
cd backend
npx supabase db push
```

If you run `supabase` from the repo root, it will not find these migrations (you may see "backend not found" or missing migrations).

---

## 2. Create the bucket if it’s missing

The migration tries to create the `portfolio-audio` bucket. If that fails (e.g. on some local setups), create it manually:

1. In Supabase Dashboard go to **Storage**.
2. Click **New bucket**.
3. Name: **portfolio-audio** (must match exactly).
4. Leave it **private** (do not enable “Public bucket”).
5. Click **Create bucket**.

No need to add extra policies; the migration already adds RLS for this bucket.

---

## 3. Optional: remove the `idb` dependency

Portfolio now uses Supabase instead of IndexedDB. You can remove the unused package:

From the **frontend** folder:

```bash
cd frontend
npm uninstall idb
```

Then run the app as usual (`npm run dev`). Portfolio and Studio still use `loadPortfolioItems` and `savePortfolioItems` the same way; only the backend is now Supabase (table + storage) instead of IndexedDB.

---

## How Publish is configured (and why it might not work)

### What happens when you click **Publish** in Studio

1. **Auth** — `portfolio-storage` gets your user id via `supabase.auth.getSession()` (same Supabase project as the frontend).
2. **Load existing** — Fetches current rows from table `portfolio_items` for that user (so we can merge new files with existing portfolio items).
3. **Delete old rows** — Deletes all `portfolio_items` for that user (we’re about to replace them with the full list).
4. **For each file in the box:**
   - **Upload** — Uploads the audio blob to Storage bucket `portfolio-audio` at path `{user_id}/{itemId}_{fileName}`.
   - **Insert** — Inserts one row into `portfolio_items` with metadata and that `storage_path`.
5. Any failure (auth, delete, upload, insert) throws; Studio shows the error message in the red box.

### Requirements (all must be true)

| Requirement | How to check / fix |
|-------------|--------------------|
| **Same Supabase project** | Frontend env (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`) must point to the **same** project where you ran the migration. If the frontend uses a different project, the table/bucket won’t exist there. |
| **Logged in** | You must be signed in (Supabase Auth). Otherwise you get “Authentication required. Please log in.” |
| **Table exists** | In Dashboard → **Table Editor**, you should see **portfolio_items**. If not, run the migration (step 1 above). |
| **Bucket exists** | In Dashboard → **Storage**, you should see bucket **portfolio-audio** (private). If not, create it (step 2 above). |
| **RLS allows you** | Table and Storage RLS policies allow `authenticated` users to read/write only their own data (`auth.uid()::text = user_id` and first path segment = user id). If you see “permission denied” or “new row violates row-level security”, the migration ran but RLS is blocking — re-run the migration SQL so the policies exist. |

### If Publish still fails

After clicking **Publish**, read the **red error message** on the Studio page. It now shows the real Supabase error, for example:

- **“Authentication required”** → Log in (or fix Supabase Auth / session).
- **“Storage upload: Bucket not found”** → Create the **portfolio-audio** bucket (step 2).
- **“Database insert: …”** or **“permission denied”** / **“row-level security”** → Table or RLS: run the migration SQL (step 1) in the **same** project the frontend uses.
- **“relation \"portfolio_items\" does not exist”** → Migration not run (or run in a different project). Run it in the correct project (step 1).
