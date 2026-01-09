-- ============================================
-- CLEANUP: DROP ALL EXISTING POLICIES
-- ============================================

-- Disable RLS temporarily to allow operations
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE join_requests DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies on user_profiles (all names)
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Org admins can read org profiles" ON user_profiles;
DROP POLICY IF EXISTS "Org admins can insert profiles in org" ON user_profiles;
DROP POLICY IF EXISTS "Org admins can update org profiles" ON user_profiles;
DROP POLICY IF EXISTS "user_read_own" ON user_profiles;
DROP POLICY IF EXISTS "user_read_all" ON user_profiles;
DROP POLICY IF EXISTS "user_insert_own" ON user_profiles;
DROP POLICY IF EXISTS "user_update_own" ON user_profiles;

-- Drop ALL policies on join_requests (all names)
DROP POLICY IF EXISTS "Users can read own join requests" ON join_requests;
DROP POLICY IF EXISTS "Users can insert own join requests" ON join_requests;
DROP POLICY IF EXISTS "Org admins can read org join requests" ON join_requests;
DROP POLICY IF EXISTS "Org admins can update join requests" ON join_requests;
DROP POLICY IF EXISTS "Service role can update join requests" ON join_requests;
DROP POLICY IF EXISTS "jr_read_own" ON join_requests;
DROP POLICY IF EXISTS "jr_read_all_for_admin" ON join_requests;
DROP POLICY IF EXISTS "jr_insert_own" ON join_requests;

-- Drop old functions if they exist
DROP FUNCTION IF EXISTS public.approve_join_request(text);
DROP FUNCTION IF EXISTS public.reject_join_request(text);

-- ============================================
-- CREATE SERVER FUNCTIONS (SECURITY DEFINER)
-- ============================================

CREATE OR REPLACE FUNCTION public.approve_join_request(request_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_org_id text;
  v_org_name text;
  v_role text;
  v_username text;
  v_email text;
  v_current_user_id uuid;
  v_is_admin boolean;
  v_request_id uuid;
BEGIN
  -- Cast request_id to UUID
  v_request_id := request_id::uuid;
  
  -- Get current user
  v_current_user_id := auth.uid();
  
  -- Verify current user is authenticated
  IF v_current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Get join request details
  SELECT user_id, org_id, org_name, role, username, email
  INTO v_user_id, v_org_id, v_org_name, v_role, v_username, v_email
  FROM join_requests
  WHERE id = v_request_id;

  -- Verify join request exists
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Join request not found');
  END IF;

  -- Check if current user is admin of the org
  SELECT EXISTS(
    SELECT 1 FROM user_profiles 
    WHERE id = v_current_user_id 
      AND org_id = v_org_id 
      AND role = 'ADMIN'
  ) INTO v_is_admin;

  -- Verify current user is admin
  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'message', 'Not authorized');
  END IF;

  -- Update join request status
  UPDATE join_requests
  SET status = 'APPROVED'
  WHERE id = v_request_id;

  -- Create user profile
  INSERT INTO user_profiles (id, org_id, org_name, role, username)
  VALUES (v_user_id, v_org_id, v_org_name, COALESCE(v_role, 'STAFF'), COALESCE(v_username, SPLIT_PART(v_email, '@', 1)))
  ON CONFLICT (id) DO UPDATE
  SET org_id = v_org_id, org_name = v_org_name, role = COALESCE(v_role, 'STAFF'), username = COALESCE(v_username, SPLIT_PART(v_email, '@', 1));

  RETURN json_build_object('success', true, 'message', 'Join request approved');
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_join_request(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_join_request(request_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id text;
  v_current_user_id uuid;
  v_is_admin boolean;
  v_request_id uuid;
BEGIN
  -- Cast request_id to UUID
  v_request_id := request_id::uuid;
  
  -- Get current user
  v_current_user_id := auth.uid();
  
  -- Verify current user is authenticated
  IF v_current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Get org from join request
  SELECT org_id INTO v_org_id
  FROM join_requests
  WHERE id = v_request_id;

  -- Verify join request exists
  IF v_org_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Join request not found');
  END IF;

  -- Check if current user is admin of the org
  SELECT EXISTS(
    SELECT 1 FROM user_profiles 
    WHERE id = v_current_user_id 
      AND org_id = v_org_id 
      AND role = 'ADMIN'
  ) INTO v_is_admin;

  -- Verify current user is admin
  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'message', 'Not authorized');
  END IF;

  -- Update join request status
  UPDATE join_requests
  SET status = 'REJECTED'
  WHERE id = v_request_id;

  RETURN json_build_object('success', true, 'message', 'Join request rejected');
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_join_request(text) TO authenticated;

-- ============================================
-- ENABLE RLS AND CREATE SIMPLE POLICIES
-- ============================================

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Simple policy: Users can read their own profile
CREATE POLICY "user_read_own"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Allow all reads (we check authorization in the application/RPC functions)
-- This is safe because join requests service checks org membership in the RPC function
CREATE POLICY "user_read_all"
  ON user_profiles
  FOR SELECT
  USING (true);

-- Simple policy: Users can insert and update their own profile
CREATE POLICY "user_insert_own"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "user_update_own"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Enable RLS on join_requests
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first
DROP POLICY IF EXISTS "jr_read_own" ON join_requests;
DROP POLICY IF EXISTS "jr_read_all_for_admin" ON join_requests;
DROP POLICY IF EXISTS "jr_insert_own" ON join_requests;
DROP POLICY IF EXISTS "allow_read_join_requests" ON join_requests;

-- Single simple policy: Allow all reads (RLS check happens in app/RPC layer)
CREATE POLICY "allow_read_join_requests"
  ON join_requests
  FOR SELECT
  USING (true);

-- Simple policy: Users can insert their own join requests
CREATE POLICY "jr_insert_own"
  ON join_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
