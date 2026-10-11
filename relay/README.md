# Slop Wars online services (Cloudflare Worker)

The Worker is deployed as `fortress-relay`, from before the game was renamed. It keeps that name because a renamed Worker is a new Worker without the TURN secrets. Players never see it.

This one Worker does two jobs for online games:

- **Matchmaking** (`/peerjs`): phones register their room code here and swap the few messages needed to connect directly to each other. It's a small PeerJS-compatible server that keeps each phone's connection in a Durable Object. Running our own means the game doesn't depend on the free public PeerJS server and its shared rate limits. If this Worker doesn't answer, the game falls back to the public server.
- **Relay credentials** (`/`): see below.

## Relay

Online games connect the phones directly when they can. Some networks, especially mobile data, block that. When they do, the game routes traffic through **Cloudflare's TURN relay**. Using the relay needs short-lived credentials signed with a secret key, so this small Worker holds the secret and hands the game fresh credentials.

**Cost:** Matchmaking fits easily in the free Workers and Durable Objects allowance: a phone sends a few messages to connect and then a heartbeat every 5 seconds while the game is open. Cloudflare TURN is $0.05/GB after a free 1,000 GB each month. A busy 10-minute game is about 32 MB, and only games that actually need the relay use any. The Worker fits easily in the free Workers plan.

## Setup (works from the Cloudflare dashboard on a phone)

**1. Create a TURN key**
- In the Cloudflare dashboard, open **Realtime → TURN Server** and create a key. Name it something like `slop-wars`.
- Copy the **Turn Token ID** and the **API Token**. The API token is only shown once.

**2. Create the Worker**
- Go to **Workers & Pages → Create → Create Worker**, name it `fortress-relay`, and **Deploy** the starter code.
- Open the Worker, tap **Edit code**, replace everything with the contents of [`src/index.js`](src/index.js), and **Deploy**.

**3. Add the secrets**
- In the Worker, go to **Settings → Variables and Secrets** and add two **Secrets**:
  - `TURN_KEY_ID` = the Turn Token ID
  - `TURN_KEY_API_TOKEN` = the API Token
- Optionally, add a plain variable `ALLOWED_ORIGINS` if the game is hosted somewhere other than `https://infinitybiscuit.github.io`.

**4. Check it**
- Opening `https://fortress-relay.<your-subdomain>.workers.dev` directly in a browser shows `{"error":"origin not allowed"}`. That's expected: the Worker only answers the game itself.
- To try it before it's built into the game, open the game with `?relayUrl=https://fortress-relay.<your-subdomain>.workers.dev&relay=only` added to the address. Online games then *must* go through the relay. During a match the label under your name shows `· relay`.

**5. Turn it on for everyone**
- Put the Worker URL into `RELAY_URL` in [`web/js/config.js`](../web/js/config.js) and deploy the site. (Done: the game uses `https://fortress-relay.tj-coles.workers.dev/`.)

## Matchmaking: deploy automatically from GitHub

Matchmaking needs a Durable Object, and Cloudflare can't set one up by pasting code into the dashboard. A GitHub Action ([`.github/workflows/relay.yml`](../.github/workflows/relay.yml)) deploys the Worker with `wrangler` instead. It runs whenever `relay/` changes on `main`, or on demand. The deploy replaces the Worker's code but keeps its secrets (`TURN_KEY_ID`, `TURN_KEY_API_TOKEN`) and any plain variables.

One-time setup, from a phone or computer browser:

**1. Make a Cloudflare API token**
- In the Cloudflare dashboard, go to **My Profile → API Tokens → Create Token**.
- Choose the **Edit Cloudflare Workers** template.
- Under **Account Resources**, pick your account. Under **Zone Resources**, choose **All zones** (or any one zone; the Worker doesn't use one).
- **Continue to summary → Create Token**, then copy the token. It's only shown once.

**2. Find your account ID**
- In **Workers & Pages**, the **Account ID** is shown on the right of the overview page (or under **Account details**). Copy it.

**3. Add both to GitHub**
- In the GitHub repo, go to **Settings → Secrets and variables → Actions → New repository secret**, and add:
  - `CLOUDFLARE_API_TOKEN` = the token
  - `CLOUDFLARE_ACCOUNT_ID` = the account ID
- On a phone, use github.com in the browser (Safari's "Request Desktop Website" helps), since the GitHub app doesn't manage secrets.

**4. Deploy**
- Go to **Actions → Deploy relay Worker to Cloudflare → Run workflow**.
- When it's green, open `https://fortress-relay.<your-subdomain>.workers.dev/peerjs/id` in a browser. It shows `{"error":"origin not allowed"}`, which is expected: only the game may use it.

Keep the API token out of chats and the repo: it lives only in GitHub's secrets.

## From a computer instead

```bash
cd relay
npx wrangler deploy          # also creates the matchmaking Durable Object
npx wrangler secret put TURN_KEY_ID
npx wrangler secret put TURN_KEY_API_TOKEN
```

## Security notes

- The TURN key's API token lives only in the Worker's secrets. The game only ever receives credentials that expire after 4 hours.
- The Worker only responds to requests from the game's own site, so other websites can't use your relay allowance or matchmaking. A determined person could still request credentials outside a browser. For extra safety, set a spending limit or usage notification in your Cloudflare account.
