-- Run this FIRST if you get "policy already exists" errors
-- This will drop existing policies so you can run the fresh ones

DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Org admins can read org profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Org admins can insert profiles in org" ON user_profiles;
DROP POLICY IF EXISTS "Org admins can update org profiles" ON user_profiles;

DROP POLICY IF EXISTS "Users can read own join requests" ON join_requests;
DROP POLICY IF EXISTS "Org admins can read org join requests" ON join_requests;
DROP POLICY IF EXISTS "Users can insert own join requests" ON join_requests;
DROP POLICY IF EXISTS "Org admins can update join requests" ON join_requests;

-- Then run the RLS_POLICIES.sql file to create the new policies
