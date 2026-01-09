# OpenAI API Configuration

The DeckFix application requires an OpenAI API key to analyze pitch decks.

## Setup Instructions

### 1. Get your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (you won't be able to see it again)

### 2. Add the key to Supabase Edge Functions

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/ygbrvmrzydyjjhlgcidm/settings/functions)
2. In the left sidebar, click **Edge Functions**
3. Click on the **Secrets** tab
4. Click **Add new secret**
5. Enter:
   - Name: `OPENAI_API_KEY`
   - Value: Your OpenAI API key (starts with `sk-...`)
6. Click **Save**

### 3. Test the Application

1. Refresh your application
2. Try uploading a PDF pitch deck
3. The analysis should now work

## Troubleshooting

If you still see errors after adding the API key:

1. Check the browser console (F12) for detailed error messages
2. Verify your OpenAI API key is valid and has credits
3. Check Supabase Edge Function logs for any errors

## Cost Information

- The application uses GPT-4o model
- Each analysis costs approximately $0.01-0.05 depending on deck size
- Monitor your usage at [OpenAI Usage Dashboard](https://platform.openai.com/usage)
