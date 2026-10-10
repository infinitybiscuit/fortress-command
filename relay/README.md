# Fortress Command relay (Cloudflare Worker)

Online games connect the two phones directly when they can. Some networks, especially mobile data, block that. When they do, the game routes traffic through **Cloudflare's TURN relay**. Using the relay needs short-lived credentials signed with a secret key, so this small Worker holds the secret and hands the game fresh credentials.

**Cost:** Cloudflare TURN is $0.05/GB after a free 1,000 GB each month. A busy 10-minute game is about 32 MB, and only games that actually need the relay use any. The Worker fits easily in the free Workers plan.

## Setup (works from the Cloudflare dashboard on a phone)

**1. Create a TURN key**
- In the Cloudflare dashboard, open **Realtime → TURN Server** and create a key. Name it something like `fortress-command`.
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

## From a computer instead

```bash
cd relay
npx wrangler deploy
npx wrangler secret put TURN_KEY_ID
npx wrangler secret put TURN_KEY_API_TOKEN
```

## Security notes

- The TURN key's API token lives only in the Worker's secrets. The game only ever receives credentials that expire after 4 hours.
- The Worker only responds to requests from the game's own site, so other websites can't use your relay allowance. A determined person could still request credentials outside a browser. For extra safety, set a spending limit or usage notification in your Cloudflare account.
