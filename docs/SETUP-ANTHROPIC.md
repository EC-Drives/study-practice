# Connecting Claude (Anthropic) for Step B

**Do this only when the Chief of Staff says Step B is ready.** Step A (linked accounts, reports and the working area) does not need it.

Step B adds three things, each of which needs Claude:

- an **"Ask about her progress"** box in your parent area;
- Claude **reading her handwritten final answer** in the working area;
- **fresh practice questions** written by Claude, which the Chief Learning Officer checks before she sees them.

To use Claude, the app needs an **Anthropic API key**. The key is like a credit card for Claude: whoever has it can run up charges. So it goes in **one place only**, your Supabase project's secret store, which you fill in yourself. It never goes into the app, the website, a file, an email or a chat.

**Time:** about 15 minutes. **Cost:** you pay as you go. A rough guide:

| Use | Model | Cost each time |
|---|---|---|
| One question in "Ask about her progress" | Claude Sonnet 5.5 | about US$0.05 |
| Reading one handwritten answer | Claude Sonnet 5.5 | under US$0.01 |
| Writing 10 new questions | Claude Opus 5.5 | about US$0.15 |

Normal family use should cost a few dollars a month. Step 3 sets a hard monthly limit so a mistake cannot cost more.

---

## Step 1. Create your Anthropic account

1. Go to **https://console.anthropic.com**. It may take you to **platform.claude.com**, which is the same place.
2. Click **Sign up** and use your email address (or "Continue with Google"). Follow the email link to verify it.
3. Fill in the short form. When it asks for an organization name, `EC Family` is fine. For how you will use it, choose individual or personal use.

This is separate from any Claude chat subscription you may have. The API is billed on its own.

## Step 2. Add credit

1. In the console, open **Settings**, then **Billing**.
2. Click **Add funds** (or **Buy credits**). Enter your card details yourself and buy **US$10** of credit to start.
3. Leave **auto-reload** off, so nothing is charged without you choosing to.

## Step 3. Set a monthly spending limit

1. Still under **Settings**, open **Limits**.
2. Set the **monthly spend limit** to **US$20** (or whatever you are comfortable with) and save.

If the limit is ever reached, the AI features simply stop until the next month. The rest of Study Practice carries on as normal.

## Step 4. Create the key

1. Open **API Keys** (under Settings) and click **Create Key**.
2. Name it `study-practice-supabase`.
3. Click **Create** or **Add**. The key appears **once**: a long text starting `sk-ant-`.
4. Click **Copy**. Do not paste it anywhere except Step 5. You can also save it in your password manager.

## Step 5. Put the key into Supabase (only there)

1. Go to **https://supabase.com**, sign in, and open the **study-practice** project.
2. In the left menu, click **Edge Functions**, then **Secrets**. (On some screens it is under **Project Settings**, **Edge Functions**, **Secrets**.)
3. Click **Add new secret**:
   - **Name:** `ANTHROPIC_API_KEY` (exactly like that, in capitals)
   - **Value:** paste the key from Step 4
4. Click **Save**.
5. Tell the Chief of Staff "the key is in Supabase". **Do not send the key itself.** The CTO then switches on the Step B features and checks them.

---

## If something goes wrong

- **You think the key has been seen by someone else** (pasted into a chat by mistake, say): go to the Anthropic console, **API Keys**, and **Disable** or **Delete** that key at once. Then create a new one (Step 4) and replace the secret in Supabase (Step 5). The old key stops working immediately.
- **To stop all AI use:** delete the `ANTHROPIC_API_KEY` secret in Supabase, or disable the key in the Anthropic console. Study Practice keeps working without the AI features.
- **To see what it has cost:** Anthropic console, **Usage** or **Cost**.
