-- Create password_reset_otps table
CREATE TABLE IF NOT EXISTS password_reset_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes'),
  verified BOOLEAN DEFAULT FALSE
);

-- Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email ON password_reset_otps(email);

-- Enable RLS
ALTER TABLE password_reset_otps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow insert OTP" ON password_reset_otps;
DROP POLICY IF EXISTS "Allow update OTP" ON password_reset_otps;

-- Allow anyone to insert OTP (for password reset)
CREATE POLICY "Allow insert OTP" ON password_reset_otps
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update their own OTP verification status
CREATE POLICY "Allow update OTP" ON password_reset_otps
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Function to generate OTP
CREATE OR REPLACE FUNCTION generate_password_reset_otp(email_param TEXT)
RETURNS TEXT AS $$
DECLARE
  otp_code TEXT;
  otp_id UUID;
BEGIN
  -- Generate 6-digit OTP
  otp_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  
  -- Delete any existing non-verified OTPs for this email
  DELETE FROM password_reset_otps 
  WHERE email = email_param AND verified = false;
  
  -- Insert new OTP
  INSERT INTO password_reset_otps (email, otp_code)
  VALUES (email_param, otp_code)
  RETURNING id INTO otp_id;
  
  RETURN otp_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify OTP
CREATE OR REPLACE FUNCTION verify_password_reset_otp(email_param TEXT, otp_code_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  is_valid BOOLEAN;
BEGIN
  -- Check if OTP is valid, not expired, and not yet verified
  SELECT EXISTS(
    SELECT 1 FROM password_reset_otps
    WHERE email = email_param 
      AND otp_code = otp_code_param
      AND verified = false
      AND expires_at > NOW()
  ) INTO is_valid;
  
  -- Mark as verified if valid
  IF is_valid THEN
    UPDATE password_reset_otps
    SET verified = true
    WHERE email = email_param 
      AND otp_code = otp_code_param;
  END IF;
  
  RETURN is_valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset password after OTP verification
CREATE OR REPLACE FUNCTION reset_password_after_otp(email_param TEXT, otp_code_param TEXT, new_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_id UUID;
  is_valid BOOLEAN;
BEGIN
  -- Verify OTP is valid, verified, and not expired
  SELECT EXISTS(
    SELECT 1 FROM password_reset_otps
    WHERE email = email_param 
      AND otp_code = otp_code_param
      AND verified = true
      AND expires_at > NOW()
  ) INTO is_valid;

  IF NOT is_valid THEN
    RAISE EXCEPTION 'Invalid or expired OTP';
  END IF;

  -- Get user ID from email
  SELECT id INTO user_id FROM auth.users WHERE email = email_param;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Update password in auth.users
  UPDATE auth.users 
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = user_id;

  -- Mark OTP as used (update expires_at to past)
  UPDATE password_reset_otps
  SET expires_at = NOW() - INTERVAL '1 second'
  WHERE email = email_param 
    AND otp_code = otp_code_param;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION reset_password_after_otp(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION reset_password_after_otp(TEXT, TEXT, TEXT) TO authenticated;
