# Setting up the online part (Supabase)

This turns on "linked" Study Practice: you and your daughter each sign in on your own devices, every session she finishes is saved online by itself, and you see her reports on yours.

**Time:** about 30 minutes, once. **Cost:** nothing (Supabase's free plan is plenty for one family).
**What you need:** a computer with a browser, and your password manager open.

You type every password yourself. Nobody else needs your passwords, and you should not paste any password into a chat.

Some of the step names below may be worded slightly differently on Supabase's site, because they change their screens from time to time. If something does not match, take a screenshot and send it to the Chief of Staff.

---

## Step 1. Create your Supabase account

1. Go to **https://supabase.com** and click **Start your project**.
2. Sign up. The simplest way is **Continue with GitHub**, using the EC-Drives GitHub account you already have. Signing up with an email address and a new password also works. Save the password in your password manager.
3. If Supabase asks you to create an **organization**, call it something like `EC Family` and choose the **Free** plan.

## Step 2. Create the project (in Singapore)

1. Click **New project**.
2. Fill in:
   - **Name:** `study-practice`
   - **Database password:** click **Generate a password**. Save it in your password manager under "Supabase study-practice database". The app never uses this password, but you may need it one day for support.
   - **Region:** **Southeast Asia (Singapore)**. Singapore is the closest to Malaysia, so the app is quickest from there.
   - **Plan:** Free.
3. Click **Create new project** and wait 1 to 2 minutes while it shows "Setting up project".

## Step 3. Build the database (copy and paste twice)

1. In the left-hand menu, click **SQL Editor**.
2. Click **New query** (or the **+** button).
3. Open the file `supabase/migrations/20261017000100_linked_accounts.sql` from the Study Practice folder. The Chief of Staff can send you its contents. Select everything in it and copy it.
4. Paste it into the big editing box and click **Run** (bottom right).
   - You should see **Success. No rows returned.**
   - If Supabase warns that the query "contains destructive operations", that is about the `revoke` lines, which only take permissions away. Click **Run this query**.
5. Click **New query** again. Do the same with `supabase/migrations/20261017000200_working_storage.sql`. You should see **Success** again.

This made the tables for her sessions, answers and reports, the security rules ("Row Level Security") that keep them private to the two of you, and a private storage area for the pictures of her working.

**Check:** in the left menu, click **Storage**. You should see a bucket called **working** marked **Private**. If it is not there, run the second file again.

## Step 4. Stop strangers from creating accounts

Only you will create accounts: yours by hand in Step 5, and your daughter's from inside the app.

1. In the left menu, click **Authentication**.
2. Open **Sign In / Providers** (on some screens it is **Settings** or **Providers**).
3. Turn **off** **Allow new users to sign up**, then click **Save**.
4. On the same page, check that **Allow anonymous sign-ins** is **off** (it is off unless someone turned it on).

## Step 5. Create your own (parent) account

1. Still in **Authentication**, click **Users**.
2. Click **Add user**, then **Create new user**.
3. Type your email address and a strong password, and save the password in your password manager.
4. Tick **Auto Confirm User**, then click **Create user**.

## Step 6. Mark your account as the parent

1. Go back to **SQL Editor** and click **New query**.
2. Type this line, replacing YOUR EMAIL ADDRESS with your own email address (keep the quote marks):

   ```
   select public.make_parent('YOUR EMAIL ADDRESS');
   ```

3. Click **Run**. You should see one row containing a long code (your account id).
   - If it says "No user has that email address", check the spelling against Authentication, Users.

## Step 7. Add the "create her account" helper

This small program lets you create your daughter's account from inside the app.

1. In the left menu, click **Edge Functions**.
2. Click **Deploy a new function**, then **Via Editor**.
3. Name it exactly: `manage-student`
4. Delete the sample code in the editor. Open `supabase/functions/manage-student/index.ts` from the Study Practice folder (the Chief of Staff can send it), copy all of it, and paste it in.
5. Click **Deploy function** and wait for the green "deployed" message.

Leave the function's settings as they are. If creating her account later fails with "Invalid JWT", open the function's **Details** or **Settings**, turn off **Enforce JWT verification** (or **Verify JWT**), and save. The function checks who you are by itself, so this does not weaken anything.

## Step 8. Give the app your project's address

The app needs two values. **Both are public by design.** They are meant to sit inside a web page, and the security rules from Step 3 decide who sees what. You can send them to the Chief of Staff in chat.

1. Click the **Connect** button at the top of the project page. If you cannot see one, go to **Project Settings**, then **API** or **API Keys**.
2. Copy:
   - the **Project URL**, which looks like `https://abcdefghijklmnop.supabase.co`;
   - the **anon public** key (a long text starting `eyJ`) or, on newer screens, the **Publishable key** (starting `sb_publishable_`).
3. Send both to the Chief of Staff. The CTO puts them into `config.js` and the site is published with them.

**Never** send or paste the **service_role** key or a **Secret key** (starting `sb_secret_`). If you are unsure which key is which, send a screenshot with the keys covered and ask.

## Step 9. Create her account and sign in

You can do this once the Chief of Staff tells you the linked version is published.

1. On your own phone or computer, open https://ec-drives.github.io/study-practice/ and choose **I am the parent**. Sign in with the email and password from Step 5.
2. You are taken to **Create her account**. Choose:
   - a **username** of small letters and numbers, at least 3 characters (for example her first name and a number). Please do not use her full name;
   - a **password** of at least 8 characters, which you then tell her. Save it in your password manager too.
3. On **her** iPad, phone or laptop, open the same address, choose **I am practising**, and sign in with her username and password.
4. If that device already has practice from before, the app offers **Bring your earlier practice with you**. Tap **Add to my account**.

That is everything. From now on, her finished sessions appear on your Overview page by themselves, even ones she did offline (they are sent when her device is back online).

---

## Good to know

- **Free plan pause.** Supabase pauses a free project after about **7 days with no activity**. If she has a week off, the app may say it cannot reach the server. Open supabase.com, select the project and click **Restore project**; it takes about a minute. Sessions she does in the meantime are kept on her device and sent once the project is back.
- **Forgot her password?** Parent area, **Settings**, **Reset her password**. Only you can do this.
- **Forgot your own password?** In Supabase, go to Authentication, Users, open your user, and choose to send a password reset or set a new password. Ask the Chief of Staff to guide you.
- **Where the data lives:** your Supabase project in Singapore. Only your account and hers can read it. The CTO has no access unless you give it.
- **Turning it off:** the CTO can empty `config.js` again. The site then goes back to keeping progress on each device, as in version 1.
