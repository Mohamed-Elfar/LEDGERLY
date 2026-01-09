# Forgot Password Feature - Setup Guide

## Overview

The forgot password feature is now fully implemented with the following flow:

1. User enters email on **ForgotPasswordScreen**
2. OTP is generated and sent via email on **VerifyOTPScreen**
3. User resets password on **ResetPasswordScreen**

## What's Complete

### Frontend (All Screens Implemented)

✅ **ForgotPasswordScreen** - Email input with validation
✅ **VerifyOTPScreen** - 6-digit OTP input with auto-focus and auto-submit
✅ **ResetPasswordScreen** - Password reset with confirm password validation
✅ **Navigation** - All routes properly configured in `AuthNavigator.tsx`

### Backend (Database)

✅ **Database Functions** - All SQL functions created:

- `generate_password_reset_otp()` - Creates OTP with 10-min expiration
- `verify_password_reset_otp()` - Validates OTP and marks as verified
- `reset_password_after_otp()` - Updates password after verification

✅ **Services** - All auth service methods implemented:

- `sendPasswordResetOTP()` - Generates OTP and sends email
- `verifyPasswordResetOTP()` - Validates OTP
- `resetPassword()` - Updates password after verification

### Email Service

✅ **Supabase Edge Function** - `send-password-reset-otp` function set up with Resend integration

## Required Setup Steps

### 1. **Deploy Supabase Database Functions**

You need to run the SQL migration in your Supabase console:

1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy and paste the entire contents of `PASSWORD_RESET_OTP.sql`
4. Click "Run" to deploy

This creates:

- `password_reset_otps` table
- `generate_password_reset_otp()` function
- `verify_password_reset_otp()` function
- `reset_password_after_otp()` function

### 2. **Set Up Environment Variables**

Create a `.env` file in the project root with:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tvsuxxfdpswbxyodomea.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_oj45WS1BrM2q6D0l8K4zDg_I5araqBQ
```

(These are already in `supabaseClient.ts` but should use env variables in production)

### 3. **Deploy Supabase Edge Function**

To enable actual email sending:

1. Install Supabase CLI:

   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:

   ```bash
   supabase login
   ```

3. Deploy the function:

   ```bash
   supabase functions deploy send-password-reset-otp
   ```

4. Set the `RESEND_API_KEY` in Supabase Edge Function secrets:
   - Go to Supabase Dashboard → Edge Functions → Secrets
   - Add `RESEND_API_KEY` with your Resend API key

### 4. **Get Resend API Key**

1. Sign up at [resend.dev](https://resend.dev)
2. Get your API key from the dashboard
3. Add it to Supabase Edge Function secrets (see step 3.4)

## Flow Diagram

```
ForgotPasswordScreen
    ↓ (user enters email)
sendPasswordResetOTP()
    ↓ (generates OTP)
generate_password_reset_otp() [Database Function]
    ↓ (sends email)
send-password-reset-otp [Edge Function]
    ↓ (user receives email)
VerifyOTPScreen
    ↓ (user enters 6-digit OTP)
verifyPasswordResetOTP()
    ↓ (validates OTP)
verify_password_reset_otp() [Database Function]
    ↓ (OTP valid)
ResetPasswordScreen
    ↓ (user enters new password)
resetPassword()
    ↓ (resets password)
reset_password_after_otp() [Database Function]
    ↓ (success)
SignInScreen (redirect to sign in)
```

## Testing

### Local Testing (Without Email)

If you want to test without setting up Resend:

1. The OTP is still generated and stored in the database
2. Check `password_reset_otps` table in Supabase Dashboard to find the OTP
3. Enter it manually in VerifyOTPScreen

### Production Testing

Once Edge Function is deployed:

1. Go to ForgotPasswordScreen
2. Enter your email
3. Check your email for the 6-digit code
4. Enter it in VerifyOTPScreen
5. Set new password in ResetPasswordScreen
6. You should be able to sign in with new password

## Key Files Modified

- `src/services/auth.ts` - Updated `sendPasswordResetOTP()` to trigger email sending
- `src/screens/ForgotPasswordScreen.tsx` - Complete implementation
- `src/screens/VerifyOTPScreen.tsx` - Complete implementation
- `src/screens/ResetPasswordScreen.tsx` - Complete implementation
- `PASSWORD_RESET_OTP.sql` - Database setup
- `supabase/functions/send-password-reset-otp/index.ts` - Email service

## Troubleshooting

### OTP Not Sent

- Check if Edge Function is deployed: `supabase functions list`
- Verify `RESEND_API_KEY` is set in Edge Function secrets
- Check function logs in Supabase Dashboard

### OTP Invalid

- OTP expires after 10 minutes
- Each new OTP generation deletes previous non-verified OTPs
- Make sure user enters all 6 digits

### Password Reset Fails

- Verify OTP was marked as verified
- Check user exists in auth.users table
- Ensure database functions have proper permissions

## Security Notes

- OTPs are single-use and expire after 10 minutes
- OTPs are marked as verified to prevent reuse
- Password updates use Supabase's auth system
- All operations use SECURITY DEFINER functions for proper access control
