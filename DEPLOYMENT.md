# Deploying to Netlify

This guide will help you deploy DeckFix to Netlify.

## Prerequisites

1. A Netlify account (sign up at https://netlify.com)
2. Your Supabase project URL and anon key
3. Your OpenAI API key

## Deployment Steps

### Option 1: Deploy via Netlify CLI

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Login to Netlify:
```bash
netlify login
```

3. Initialize and deploy:
```bash
netlify init
```

Follow the prompts to create a new site or link to an existing one.

4. Set environment variables:
```bash
netlify env:set VITE_SUPABASE_URL "your-supabase-url"
netlify env:set VITE_SUPABASE_ANON_KEY "your-supabase-anon-key"
```

5. Deploy:
```bash
netlify deploy --prod
```

### Option 2: Deploy via Netlify Dashboard

1. Go to https://app.netlify.com and click "Add new site"

2. Choose "Import an existing project"

3. Connect your Git repository (GitHub, GitLab, or Bitbucket)

4. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** 18

5. Add environment variables in Site settings > Environment variables:
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

6. Click "Deploy site"

### Option 3: Deploy via Drag & Drop

1. Build the project locally:
```bash
npm run build
```

2. Go to https://app.netlify.com/drop

3. Drag and drop the `dist` folder

4. After deployment, go to Site settings > Environment variables and add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

5. Trigger a redeploy for environment variables to take effect

## Environment Variables

The following environment variables are required:

- `VITE_SUPABASE_URL` - Your Supabase project URL (from Supabase dashboard)
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key (from Supabase dashboard)

**Note:** The `OPENAI_API_KEY` is configured in Supabase Edge Functions, not in Netlify.

## Configuring Supabase Edge Functions

Your Edge Functions need the OpenAI API key:

1. Go to your Supabase dashboard
2. Navigate to Edge Functions settings
3. Add secret: `OPENAI_API_KEY` with your OpenAI API key

## Custom Domain (Optional)

1. Go to Site settings > Domain management
2. Click "Add custom domain"
3. Follow the instructions to configure DNS

## Continuous Deployment

If you connected a Git repository, Netlify will automatically deploy when you push to your main branch.

## Troubleshooting

### Build fails
- Check that all environment variables are set correctly
- Ensure Node version is 18 or higher
- Review build logs in Netlify dashboard

### App loads but API calls fail
- Verify environment variables are set in Netlify
- Check that Supabase Edge Functions are deployed
- Verify CORS settings in Edge Functions

### 404 errors on page refresh
- The `netlify.toml` file handles SPA routing redirects
- Ensure the file is in your repository root

## Support

For issues specific to:
- Netlify deployment: https://docs.netlify.com
- Supabase configuration: https://supabase.com/docs
- OpenAI API: https://platform.openai.com/docs
