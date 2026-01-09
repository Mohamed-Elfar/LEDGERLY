# Forgot Password Feature - Completion Checklist

## ✅ What's Done (Frontend)

### Screens

- [x] **ForgotPasswordScreen.tsx** - Complete with email validation
- [x] **VerifyOTPScreen.tsx** - Complete with 6-digit auto-input and auto-submit
- [x] **ResetPasswordScreen.tsx** - Complete with password confirmation validation
- [x] **Navigation Setup** - All routes configured in AuthNavigator.tsx

### Styling

- [x] All screens have dark theme styling (#0b1d2c background)
- [x] Input fields with icons and proper focus states
- [x] Error messages with red alert styling
- [x] Loading states with ActivityIndicator
- [x] Proper spacing and typography

### Services & Integration

- [x] `sendPasswordResetOTP()` - Calls Supabase function to send email
- [x] `verifyPasswordResetOTP()` - Validates OTP against database
- [x] `resetPassword()` - Updates password after OTP verification

### Database Setup

- [x] **PASSWORD_RESET_OTP.sql** - Contains all database functions:
  - `generate_password_reset_otp()` - Creates OTP with 10-min expiration
  - `verify_password_reset_otp()` - Validates and marks OTP as verified
  - `reset_password_after_otp()` - Updates auth password
- [x] `password_reset_otps` table with proper schema
- [x] RLS policies for public OTP operations
- [x] Indexes for performance

### Edge Function

- [x] **send-password-reset-otp/index.ts** - Edge function to send emails via Resend

---

## 🔧 What You Need to Do (Backend Setup)

### Step 1: Deploy Database Functions

1. Go to your Supabase Dashboard
2. Click "SQL Editor" → "New Query"
3. Copy entire contents of `PASSWORD_RESET_OTP.sql`
4. Click "Run"
5. Verify no errors

**Expected Result:** You should see new tables and functions in your database

### Step 2: Deploy Edge Function

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

**Expected Result:** Function should be deployed and visible in Supabase Dashboard

### Step 3: Set Up Resend API Key

1. Sign up at [resend.dev](https://resend.dev)
2. Get your API key
3. In Supabase Dashboard → Edge Functions → Secrets
4. Add new secret:
   - Key: `RESEND_API_KEY`
   - Value: `your_resend_api_key_here`

**Expected Result:** Edge function can now send emails

---

## ✨ Feature Flow

```
User clicks "Forgot Password?"
         ↓
   ForgotPasswordScreen
   (Enter email address)
         ↓
   sendPasswordResetOTP() triggers
         ↓
   Database generates OTP
   Edge Function sends email
         ↓
   VerifyOTPScreen
   (Enter 6-digit code)
         ↓
   verifyPasswordResetOTP() validates
         ↓
   ResetPasswordScreen
   (Enter new password)
         ↓
   resetPassword() updates auth password
         ↓
   Redirects to SignIn
   (User can now login with new password)
```

---

## 🧪 Testing

### Test 1: Check Database Setup

1. Open Supabase Dashboard → SQL Editor
2. Run: `SELECT * FROM password_reset_otps;`
3. Should return empty table initially

### Test 2: Test OTP Generation

1. Run in SQL Editor:
   ```sql
   SELECT generate_password_reset_otp('test@example.com');
   ```
2. Should return a 6-digit code
3. Check table: `SELECT * FROM password_reset_otps;` should show new row

### Test 3: Test OTP Verification

1. Get OTP code from above
2. Run in SQL Editor:
   ```sql
   SELECT verify_password_reset_otp('test@example.com', 'YOUR_OTP_CODE');
   ```
3. Should return `true`
4. Check table: verified column should be `true`

### Test 4: Complete App Flow

1. Run app: `npm start`
2. Go to SignIn → "Forgot password?"
3. Enter your email
4. Check email for OTP code (or check database)
5. Enter 6-digit code
6. Enter new password
7. Should redirect to SignIn
8. Try signing in with new password

---

## 📋 Configuration Files

### `.env` (Create if you want to use env variables)

```env
EXPO_PUBLIC_SUPABASE_URL=https://tvsuxxfdpswbxyodomea.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_oj45WS1BrM2q6D0l8K4zDg_I5araqBQ
```

Currently using hardcoded values in `supabaseClient.ts` - update to env variables in production.

---

## 🐛 Troubleshooting

### "Failed to send OTP email"

- Check Edge Function is deployed: `supabase functions list`
- Verify `RESEND_API_KEY` is set in secrets
- Check Edge Function logs for errors

### "Invalid or expired OTP"

- OTP expires after 10 minutes
- Make sure you entered all 6 digits
- Try requesting a new OTP with Resend button

### "Password reset failed"

- Verify user exists in auth.users
- Check OTP is marked as verified in database
- Check function permissions are correct

### "User not found"

- Make sure the email has an account already created
- Forgot password only works for existing users

---

## 📦 Files Modified/Created

### New Files

- `FORGOT_PASSWORD_SETUP.md` - Detailed setup guide
- `FORGOT_PASSWORD_CHECKLIST.md` - This file
- `.env.example` - Environment variables template

### Modified Files

- `src/services/auth.ts` - Updated `sendPasswordResetOTP()` to send email
- Existing screens: No changes needed (all already complete)

### Database Files

- `PASSWORD_RESET_OTP.sql` - Already created, just needs to be deployed

### Edge Function

- `supabase/functions/send-password-reset-otp/index.ts` - Already created

---

## 🎉 Next Steps After Setup

1. **Deploy database functions** using Supabase Dashboard
2. **Deploy Edge Function** using Supabase CLI
3. **Add Resend API key** to Edge Function secrets
4. **Test the flow** end-to-end
5. **Go live!**

---

## ❓ Questions?

Refer to:

- `FORGOT_PASSWORD_SETUP.md` - Comprehensive setup guide
- `PASSWORD_RESET_OTP.sql` - Database schema and functions
- `supabase/functions/send-password-reset-otp/index.ts` - Email sending logic
- Source screens for implementation details
