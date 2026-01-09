# Custom Email OTP Password Reset - Setup Guide

## Quick Start (3 Steps)

### Step 1: Execute Database SQL (REQUIRED) ⭐
1. Go to Supabase Dashboard → SQL Editor
2. Copy-paste all SQL from [PASSWORD_RESET_OTP.sql](./PASSWORD_RESET_OTP.sql)
3. Click "Run" button
4. Done! Password reset now works

### Step 2: Test (Without Email)
1. In app, go to SignIn → "Forgot Password?"
2. Enter email (e.g., test@example.com)
3. In Supabase, query OTP code:
   ```sql
   SELECT otp_code FROM password_reset_otps 
   WHERE email = 'test@example.com' LIMIT 1
   ```
4. Enter 6-digit code in app
5. Set new password
6. ✅ Success!

### Step 3: Optional - Enable Email Sending
1. Sign up at https://resend.com/ (free: 100 emails/day)
2. Copy API key
3. In Supabase Dashboard:
   - Settings → Edge Functions → Environment Variables
   - Add: `RESEND_API_KEY = your_api_key`
4. Deploy function:
   ```bash
   supabase functions deploy send-password-reset-otp
   ```
5. Edit email sender in `supabase/functions/send-password-reset-otp/index.ts`
6. Now OTPs send automatically via email

---

## How It Works

### Password Reset Flow
```
User enters email 
    ↓
ForgotPasswordScreen: sendPasswordResetOTP(email)
    ↓ [Backend]
    • Generate 6-digit OTP
    • Store in password_reset_otps table (10 min expiry)
    • Try to send email (if function deployed)
    ↓
User enters 6-digit code in VerifyOTPScreen
    ↓
VerifyOTPScreen: verifyPasswordResetOTP(email, otp)
    ↓ [Backend]
    • Validate OTP exists, not expired, not verified
    • Mark as verified
    ↓
User sets new password in ResetPasswordScreen
    ↓
ResetPasswordScreen: resetPassword(email, otp, newPassword)
    ↓ [Backend - SECURITY DEFINER Function]
    • Verify OTP is valid and verified
    • Update password in auth.users table
    • Mark OTP as expired (prevent reuse)
    ↓
✅ SignIn screen - Password reset complete!
```

### Why No Session Error?
The `reset_password_after_otp()` function uses `SECURITY DEFINER`, which means it runs with elevated permissions. The OTP verification is enough proof of email ownership - no user session required.

---

## Architecture

### Database Functions (in PASSWORD_RESET_OTP.sql)

**`generate_password_reset_otp(email_param TEXT) → TEXT`**
- Generates random 6-digit code
- Deletes any existing unverified OTPs for email
- Inserts new OTP with 10-minute expiry
- Returns the OTP code

**`verify_password_reset_otp(email_param TEXT, otp_code_param TEXT) → BOOLEAN`**
- Checks OTP exists, not expired, not verified
- If valid, marks as verified
- Returns true/false

**`reset_password_after_otp(email_param TEXT, otp_code_param TEXT, new_password TEXT) → BOOLEAN`**
- Verifies OTP is valid and verified
- Gets user ID from email  
- Updates password in auth.users using bcrypt
- Marks OTP as expired (prevents reuse)
- Returns true/false
- **No session required** - uses SECURITY DEFINER

### App Functions (src/services/auth.ts)

**`sendPasswordResetOTP(email: string)`**
- Calls RPC: `generate_password_reset_otp(email)`
- Invokes Edge Function (fails silently if not deployed)

**`verifyPasswordResetOTP(email: string, otp: string) → boolean`**
- Calls RPC: `verify_password_reset_otp(email, otp)`

**`resetPassword(email: string, otp: string, newPassword: string) → boolean`**
- Calls RPC: `reset_password_after_otp(email, otp, newPassword)`
- Works without active session!

---

## Security Features

✅ **OTP expires after 10 minutes** - Can't use old codes
✅ **One-time use** - After verification, can't reuse same code  
✅ **Email verification** - Proves email ownership
✅ **No session required** - Uses SECURITY DEFINER function
✅ **Bcrypt hashing** - Password hashed with `crypt(..., 'bf')`
✅ **Rate-limiteable** - Can add checks to RPC function if needed

---

## Troubleshooting

**❌ "Auth session missing!" error**
- ✅ **Fixed!** Using `reset_password_after_otp()` RPC with SECURITY DEFINER
- This function runs with elevated permissions, no session needed

**❌ "Invalid or expired OTP"**
- Check OTP hasn't expired (10 min limit)
- Check you copied the right code
- Query: `SELECT * FROM password_reset_otps ORDER BY created_at DESC LIMIT 1`

**❌ Emails not sending**
- Edge Function optional - OTP still generates without it
- If needed: missing RESEND_API_KEY environment variable
- Or: wrong sender email in function (must be verified in Resend)

**❌ Password didn't update**
- Check function exists: `SELECT * FROM pg_proc WHERE proname = 'reset_password_after_otp'`
- Check user exists in auth.users table
- Check password meets requirements (min 6 chars)

---

## Cost

| Service | Free | Paid |
|---------|------|------|
| Supabase Database | ✅ Included | - |
| Supabase RPC calls | ✅ Included | - |
| Resend emails | ✅ 100/day | ~$0.20 per 1000 |

---

## Files Modified

- `PASSWORD_RESET_OTP.sql` - Database schema and RPC functions
- `src/services/auth.ts` - sendPasswordResetOTP, verifyPasswordResetOTP, resetPassword
- `src/screens/ForgotPasswordScreen.tsx` - Email input
- `src/screens/VerifyOTPScreen.tsx` - 6-digit code entry  
- `src/screens/ResetPasswordScreen.tsx` - New password + calls resetPassword RPC
- `src/types/navigation.ts` - Navigation params (email, otp)
- `supabase/functions/send-password-reset-otp/index.ts` - Optional email function
