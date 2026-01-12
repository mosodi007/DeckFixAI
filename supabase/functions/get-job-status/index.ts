import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authentication
    const authHeader = req.headers.get('Authorization');
    let user = null;

    if (authHeader) {
      const supabaseClient = createClient(
        supabaseUrl,
        supabaseKey,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: userData, error: userError } = await supabaseClient.auth.getUser();
      if (!userError && userData?.user) {
        user = userData.user;
      }
    }

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { jobId } = body;

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'jobId is required' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Fetch job from analyses table
    const { data: analysis, error: fetchError } = await supabase
      .from('analyses')
      .select('id, status, result, error, error_message, updated_at, user_id')
      .eq('id', jobId)
      .single();

    if (fetchError || !analysis) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Verify user owns this job
    if (analysis.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Return job status
    return new Response(
      JSON.stringify({
        status: analysis.status || 'pending',
        result: analysis.result,
        error: analysis.error || analysis.error_message,
        updated_at: analysis.updated_at,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error: any) {
    console.error('Error in get-job-status:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

