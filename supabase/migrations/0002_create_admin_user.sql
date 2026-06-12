-- ============================================================
-- PRIDE VACATIONS — Create Admin User (0002)
-- Creates the admin user account and links it to admin_users table.
--
-- IMPORTANT: This migration creates an email/password user as a fallback.
-- For Google OAuth, you must:
-- 1. Enable Google provider in Supabase Dashboard → Authentication → Providers
-- 2. Add authorized redirect URLs
-- 3. Configure Google OAuth credentials
-- 4. Sign in via Google on /admin/login
-- 5. Run the linking query below with the actual Google user UUID
-- ============================================================

-- ============================
-- CREATE ADMIN USER (Email/Password Fallback)
-- ============================

-- Note: Supabase doesn't allow direct inserts into auth.users via SQL for security.
-- You must create the user via one of these methods:
--
-- METHOD 1: Supabase Dashboard (Recommended for Google OAuth)
-- 1. Go to Authentication → Users → Add User
-- 2. Sign up team@zenuratech.online with Google OAuth
-- 3. Copy the user's UUID
-- 4. Run: INSERT INTO public.admin_users (user_id, email) 
--         VALUES ('PASTE_UUID_HERE', 'team@zenuratech.online');
--
-- METHOD 2: API Call (For email/password fallback)
-- Use Supabase client or REST API to create user:
--   supabase.auth.signUp({
--     email: 'team@zenuratech.online',
--     password: 'zenurateam'
--   })
-- Then link with admin_users table using the returned user ID.

-- ============================
-- LINK ADMIN USER (Run after user creation)
-- ============================

-- This query links the authenticated user to admin_users table.
-- Replace 'USER_UUID_HERE' with the actual UUID from auth.users:

-- INSERT INTO public.admin_users (user_id, email, is_superadmin)
-- VALUES (
--   'USER_UUID_HERE',  -- Replace with actual user UUID
--   'team@zenuratech.online',
--   true
-- )
-- ON CONFLICT (user_id) DO NOTHING;

-- ============================
-- VERIFICATION QUERY
-- ============================

-- Run this to verify the admin user is properly linked:
-- SELECT 
--   au.id,
--   au.email,
--   au.is_superadmin,
--   au.created_at,
--   u.id as auth_user_id,
--   u.email as auth_email
-- FROM public.admin_users au
-- LEFT JOIN auth.users u ON u.id = au.user_id
-- WHERE au.email = 'team@zenuratech.online';
