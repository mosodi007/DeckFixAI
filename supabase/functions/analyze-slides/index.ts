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

        // imageUrl now contains the storage path like "slide-images/analysisId/page_X.jpg"
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
                content: `You are an expert pitch deck consultant analyzing individual slides for startups. Provide detailed, actionable feedback that helps founders improve their pitch deck to be more attractive to investors.

For each slide, analyze:
1. Visual Design & Layout
2. Content Quality & Clarity
3. Message Effectiveness
4. Data Presentation
5. Investor Appeal

Provide your analysis in the following JSON format:
{
  "title": "A clear title for this slide",
  "score": <number 0-100>,
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "issues": ["issue 1", "issue 2", "issue 3"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "keyInsights": "2-3 sentences of the most important insights about this slide",
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
