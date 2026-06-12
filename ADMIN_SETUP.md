# Admin Studio Setup Guide

This guide walks you through setting up the admin studio with Google Sign-In authentication.

## Prerequisites

- Supabase project created and connected
- Google Cloud project with OAuth 2.0 credentials

---

## Step 1: Configure Google OAuth in Supabase

### 1.1 Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure consent screen if prompted
6. Set Application type: **Web application**
7. Add Authorized redirect URIs:
   ```
   https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
   ```
   Replace `YOUR_SUPABASE_PROJECT_REF` with your actual Supabase project reference ID
8. Click **Create** and copy:
   - **Client ID**
   - **Client Secret**

### 1.2 Enable Google Provider in Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Google** in the provider list
5. Toggle it **ON**
6. Paste your Google OAuth credentials:
   - Client ID
   - Client Secret
7. Click **Save**

---

## Step 2: Add Authorized Redirect URLs

In your Supabase project settings:

1. Go to **Authentication** → **URL Configuration**
2. Add these URLs to **Redirect URLs**:
   ```
   http://localhost:5173/admin
   https://your-vercel-domain.vercel.app/admin
   https://your-custom-domain.com/admin
   ```
3. Add to **Site URL** (your production URL):
   ```
   https://your-custom-domain.com
   ```

---

## Step 3: Create Admin User

### Option A: Using Google Sign-In (Recommended)

1. Deploy your app to Vercel (or run locally)
2. Navigate to `/admin/login`
3. Click **"Continue with Google"**
4. Sign in with **team@zenuratech.online**
5. After successful sign-in, you'll be redirected to `/admin`
6. Copy your user UUID from the browser console or Supabase Dashboard

### Option B: Using Email/Password (Fallback)

If you need email/password authentication as a fallback:

1. Update `AdminLogin.jsx` to include email/password form
2. Use Supabase Dashboard → Authentication → Add User
3. Create user:
   - Email: `team@zenuratech.online`
   - Password: `zenurateam`
4. Copy the generated user UUID

---

## Step 4: Link User to Admin Access

After creating the user (either method), link them to the admin_users table:

1. Go to Supabase Dashboard → **SQL Editor**
2. Run this query (replace `USER_UUID_HERE` with the actual UUID):

```sql
INSERT INTO public.admin_users (user_id, email, is_superadmin)
VALUES (
  'USER_UUID_HERE',  -- Replace with actual UUID from auth.users
  'team@zenuratech.online',
  true
)
ON CONFLICT (user_id) DO NOTHING;
```

---

## Step 5: Verify Setup

Run this verification query in SQL Editor:

```sql
SELECT 
  au.id,
  au.email,
  au.is_superadmin,
  au.created_at,
  u.id as auth_user_id,
  u.email as auth_email,
  u.raw_user_meta_data
FROM public.admin_users au
LEFT JOIN auth.users u ON u.id = au.user_id
WHERE au.email = 'team@zenuratech.online';
```

You should see:
- ✅ One row returned
- ✅ `auth_user_id` is not null
- ✅ `is_superadmin` is true

---

## Step 6: Test Admin Login

1. Visit your site at `/admin/login`
2. Click **"Continue with Google"**
3. Sign in with **team@zenuratech.online**
4. You should be redirected to `/admin` dashboard
5. You should see the leads management interface

---

## Troubleshooting

### "Email not authorized" Error
- Check if the user exists in `auth.users` table
- Verify the user is linked in `admin_users` table
- Check RLS policies are enabled

### Google OAuth Redirect Error
- Verify redirect URLs in Google Cloud Console
- Check Supabase redirect URLs configuration
- Ensure URLs match exactly (including https://)

### "Could not load admin data" Error
- Run the migration: `supabase/migrations/0001_vercel_migration.sql`
- Verify RLS policies exist
- Check Supabase environment variables in Vercel

### Can't Access Dashboard After Login
- Verify user exists in `admin_users` table
- Check if `user_id` matches the UUID from `auth.users`
- Review browser console for errors

---

## Security Notes

1. **Never commit credentials** - Keep OAuth secrets in Supabase Dashboard only
2. **RLS is enabled** - Only users in `admin_users` table can access leads
3. **Google domain restriction** - Consider restricting OAuth to your organization's domain in Google Cloud Console
4. **HTTPS required** - Google OAuth requires HTTPS in production

---

## Adding More Admins

To add additional admin users:

1. Have them sign in via Google at `/admin/login`
2. Get their user UUID from Supabase Dashboard → Authentication → Users
3. Run the linking query:
   ```sql
   INSERT INTO public.admin_users (user_id, email, is_superadmin)
   VALUES ('THEIR_UUID', 'their-email@domain.com', true);
   ```

---

## Admin Credentials (Current)

**Email**: team@zenuratech.online  
**Auth Method**: Google OAuth (Primary)  
**Fallback Password**: zenurateam (if email/password is enabled)

---

For questions or issues, contact the development team.
