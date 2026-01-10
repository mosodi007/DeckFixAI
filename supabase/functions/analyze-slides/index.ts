import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    if (!openaiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    let user = null;

    if (authHeader) {
      const supabaseClient = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: userData, error: userError } = await supabaseClient.auth.getUser();
      if (!userError && userData?.user) {
        user = userData.user;
        console.log('Authenticated user:', user.id);
      }
    }

    if (!user) {
      console.log('Anonymous user - analyzing slides');
    }
    const { analysisId } = await req.json();

    if (!analysisId) {
      throw new Error('Analysis ID is required');
    }

    console.log('Analyzing slides for analysis:', analysisId);

    const { data: pages, error: pagesError } = await supabase
      .from('analysis_pages')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('page_number');

    if (pagesError) {
      throw new Error(`Failed to fetch pages: ${pagesError.message}`);
    }

    if (!pages || pages.length === 0) {
      throw new Error('No pages found for this analysis');
    }

    console.log(`Found ${pages.length} pages to analyze`);

    const slidesWithImages = pages.filter(page => page.image_url);
    console.log(`${slidesWithImages.length} slides have images`);

    const analysisPromises = slidesWithImages.map(async (page) => {
      try {
        const imageUrl = page.image_url;

        if (!imageUrl) {
          return { pageNumber: page.page_number, success: false };
        }

        const publicImageUrl = `${supabaseUrl}/storage/v1/object/public/${imageUrl}`;

        console.log(`Analyzing slide ${page.page_number} with image URL: ${publicImageUrl}`);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: `You are a senior VC partner reviewing this slide like you would in a real pitch meeting. You've seen thousands of decks. You know what works and what doesn't. Be BRUTALLY HONEST. Call out weak messaging, unclear value props, amateur design, text-heavy slides, missing data, and vague claims.

HARSH EVALUATION CRITERIA:
1. Visual Design: Is this professional or amateur? Text-heavy or visual? Clear or cluttered? VCs judge books by covers.
2. Message Clarity: Can you understand the point in 5 seconds? Or is it confusing word salad?
3. Content Quality: Real data or hand-waving? Specific or vague? Compelling or boring?
4. Investor Appeal: Would this slide make a VC interested or skeptical? Does it build confidence or raise red flags?
5. Common Mistakes: Too much text? Unclear point? Missing key info? Bad data viz? Generic claims?

SCORING PHILOSOPHY (BE HARSH):
- Most slides are 25-50 (weak to below average)
- Decent slides are 50-65
- Good slides are 65-80
- Excellent slides are 80-90
- Near-perfect slides are 90+
- Penalize heavily for text-heavy slides, unclear messaging, weak data, amateur design

Provide your analysis in the following JSON format:
{
  "title": "A clear, specific title for this slide (what it actually shows, not what it should show)",
  "score": <number 0-100>,
  "strengths": ["<1-3 actual strengths - be specific. If slide is weak, include fewer or none. Don't invent strengths.>"],
  "issues": ["<3-6 specific problems. Find what's wrong. Call out unclear messaging, weak data, too much text, amateur design, missing info, vague claims. Be thorough.>"],
  "recommendations": ["<3-5 direct, actionable fixes. Tell them exactly what to change. Be specific: 'Cut text by 60%', 'Add revenue numbers', 'Show competitive matrix', etc.>"],
  "keyInsights": "3-5 sentences of brutally honest assessment. What's the biggest problem with this slide? Would a VC be impressed or skeptical? What specific changes would make this actually compelling? Don't sugarcoat.",
  "improvementPriority": "high" | "medium" | "low"
}`
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `This is slide ${page.page_number} from a pitch deck titled "${page.title || 'Untitled'}". Please analyze this slide and provide detailed feedback.`
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: publicImageUrl,
                      detail: 'high'
                    }
                  }
                ]
              }
            ],
            max_tokens: 1500,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`OpenAI API error for slide ${page.page_number}:`, errorText);
          throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const result = await response.json();
        const content = result.choices[0]?.message?.content;

        if (!content) {
          throw new Error('No content returned from OpenAI');
        }

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error('Could not extract JSON from response:', content);
          throw new Error('Invalid JSON response from OpenAI');
        }

        const analysis = JSON.parse(jsonMatch[0]);

        const { error: updateError } = await supabase
          .from('analysis_pages')
          .update({
            title: analysis.title || page.title,
            score: analysis.score || page.score,
            feedback: analysis.keyInsights || null,
            recommendations: analysis.recommendations || null,
          })
          .eq('id', page.id);

        if (updateError) {
          console.error(`Failed to update page ${page.page_number}:`, updateError);
          throw updateError;
        }

        console.log(`Successfully analyzed slide ${page.page_number}`);

        return {
          pageNumber: page.page_number,
          success: true,
          analysis,
        };
      } catch (error) {
        console.error(`Error analyzing slide ${page.page_number}:`, error);
        return {
          pageNumber: page.page_number,
          success: false,
          error: error.message,
        };
      }
    });

    const results = await Promise.all(analysisPromises);
    const successCount = results.filter(r => r.success).length;

    console.log(`Analysis complete: ${successCount}/${slidesWithImages.length} slides analyzed successfully`);

    const { error: updateAnalysisError } = await supabase
      .from('analyses')
      .update({ slides_analyzed_at: new Date().toISOString() })
      .eq('id', analysisId);

    if (updateAnalysisError) {
      console.error('Failed to update slides_analyzed_at:', updateAnalysisError);
    } else {
      console.log('Updated slides_analyzed_at timestamp for analysis:', analysisId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Analyzed ${successCount} out of ${slidesWithImages.length} slides`,
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in analyze-slides function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
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