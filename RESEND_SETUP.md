# Resend Email Verification Setup

This document explains how to set up Resend for email verification in DeckFix.

## Prerequisites

- Resend API key: `re_S8X4nAnv_68ZmmogM651hYnzxv9fP7FKn`
- Supabase project with Edge Functions enabled

## Setup Steps

### 1. Set Resend API Key in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. Add a new secret:
   - **Name**: `RESEND_API_KEY`
   - **Value**: `re_S8X4nAnv_68ZmmogM651hYnzxv9fP7FKn`

### 2. Set Site URL

1. In Supabase Dashboard, go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add or update the secret:
   - **Name**: `SITE_URL`
   - **Value**: Your production URL (e.g., `https://deckfix.ai`)

### 3. Deploy the Edge Function

Deploy the `send-verification-email` Edge Function:

```bash
# Using Supabase CLI
supabase functions deploy send-verification-email

# Or using MCP
# The function will be deployed via the MCP Supabase integration
```

### 4. Verify Domain in Resend (Optional but Recommended)

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Add and verify your domain `deckfix.ai`
3. Update the `RESEND_FROM_EMAIL` in the Edge Function to use your verified domain

## How It Works

1. **User clicks "Verify your email"** on the dashboard
2. **Frontend** calls `sendVerificationEmail()` from `emailVerificationService.ts`
3. **Service** calls Supabase's `auth.resend()` to generate a verification token
4. **Service** invokes the `send-verification-email` Edge Function
5. **Edge Function** sends a beautifully formatted email via Resend API
6. **User clicks the verification link** in the email
7. **Supabase** handles the verification and updates `email_confirmed_at`

## Email Template

The verification email includes:
- Professional HTML design with DeckFix branding
- Clear call-to-action button
- Fallback text link
- Company information and contact details
- 24-hour expiration notice

## Testing

1. Sign up a new user account
2. Check the dashboard - you should see the "Verify your email" banner
3. Click "Verify your email"
4. Check the email inbox for the verification email
5. Click the verification link
6. The banner should disappear after verification

## Troubleshooting

### Email not sending
- Check that `RESEND_API_KEY` is set in Supabase secrets
- Verify the API key is correct and active in Resend
- Check Edge Function logs in Supabase Dashboard

### Verification link not working
- Ensure `SITE_URL` is set correctly
- Check that Supabase auth settings allow email confirmation
- Verify the redirect URL is whitelisted in Supabase

### Banner not showing
- Check browser console for errors
- Verify user is authenticated
- Check that `email_confirmed_at` is null for the user

## Files Modified

- `supabase/functions/send-verification-email/index.ts` - Edge Function for sending emails
- `src/services/emailVerificationService.ts` - Frontend service for email verification
- `src/components/DashboardView.tsx` - Dashboard with verification banner

