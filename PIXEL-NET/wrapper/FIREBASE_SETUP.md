# Firebase Shared Leaderboard Setup

Follow these steps once. It takes about 5 minutes and costs $0 forever on the free Spark plan.

---

## Step 1 — Create a Firebase project

1. Go to https://console.firebase.google.com
2. Click **Add project** → name it (e.g. `pixel-net-arcade`) → Continue → Create project
3. In the left sidebar, click **Build → Realtime Database**
4. Click **Create Database**
5. Choose a location (US is fine) → **Next**
6. Select **Start in TEST mode** → **Enable**
   (This sets rules to allow all reads/writes — fine for a public arcade)

---

## Step 2 — Copy your database URL

After the database is created, you'll see a URL at the top of the page that looks like:

```
https://pixel-net-arcade-default-rtdb.firebaseio.com
```

Copy that URL.

---

## Step 3 — Paste into shell.js

Open `PIXEL-NET/wrapper/shell.js` and find line 17 near the top:

```js
const FIREBASE_DB_URL = null;
```

Replace `null` with your URL in quotes:

```js
const FIREBASE_DB_URL = "https://pixel-net-arcade-default-rtdb.firebaseio.com";
```

---

## Step 4 — Push to GitHub

```bash
git add PIXEL-NET/wrapper/shell.js
git commit -m "feat(leaderboard): connect Firebase shared leaderboard"
git push
```

That's it! All 9 games will now write scores to Firebase. Any player on any device will see the same top-10 leaderboard for each game.

---

## Security rules (optional hardening)

The default TEST mode rules expire after 30 days. To make them permanent (still public read/write, fine for an arcade):

1. In Firebase console → Realtime Database → **Rules** tab
2. Replace the rules with:

```json
{
  "rules": {
    "lb": {
      ".read": true,
      ".write": true
    }
  }
}
```

3. Click **Publish**

---

## Free tier limits (Spark plan)

| Resource | Free limit |
|---|---|
| Storage | 1 GB |
| Downloads / month | 10 GB |
| Simultaneous connections | 100 |

For an indie arcade game this is effectively unlimited. A score entry is ~50 bytes. 1 GB = ~20 million score entries.

---

## FAQ

**Q: What happens if Firebase is down?**
A: shell.js always saves to localStorage too, so the leaderboard still shows local scores as a fallback.

**Q: Old scores from localStorage — will they migrate?**
A: Not automatically. New scores from each device go to Firebase going forward. Old local scores stay local until overwritten. You can manually migrate if needed.

**Q: Can I reset a game's leaderboard?**
A: In the Firebase console, navigate to `lb / <slug>` and delete the node.
