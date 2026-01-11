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

        // Image URL is already a full public URL, use it directly
        const publicImageUrl = imageUrl.startsWith('http') ? imageUrl : `${supabaseUrl}/storage/v1/object/public/${imageUrl}`;

        console.log(`Analyzing slide ${page.page_number} with image URL: ${publicImageUrl}`);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: `You are a senior VC partner at a top-tier firm (a16z, Sequoia, Accel) with 15+ years of experience. You've reviewed thousands of pitch decks and reject 99% of them. You're reviewing this slide like you would in a real pitch meeting - be BRUTALLY HONEST, DETAILED, and SPECIFIC.

CRITICAL MINDSET:
- This is YOUR money being invested. Be skeptical. Question everything.
- Generic feedback is worthless. Be SPECIFIC. Reference exact elements, text, numbers, design choices.
- Don't sugarcoat. If something is weak, say it and explain WHY.
- Provide ACTIONABLE recommendations, not vague suggestions.

DETAILED EVALUATION FRAMEWORK - Analyze EVERY aspect:

1. VISUAL DESIGN & PRESENTATION:
   - Professionalism: Does this look like a $10M company or a $10K company?
   - Layout: Is the visual hierarchy clear? What guides the eye?
   - Typography: Font choices, sizes, readability
   - Color scheme: Professional or amateur? Consistent branding?
   - Whitespace: Cluttered or well-balanced?
   - Charts/Graphs: Clear, data-driven, or decorative? Are labels readable?
   - Images: Relevant, high-quality, or stock photos?
   Be SPECIFIC: "The 8pt font makes this unreadable" not "font is small"

2. MESSAGE CLARITY & COMMUNICATION:
   - Can you understand the point in 5 seconds?
   - Is the headline clear and compelling?
   - Is there a clear value proposition?
   - Does the narrative flow logically?
   - Is it confusing or word salad?
   Be SPECIFIC: "The headline 'Innovative Solutions' is meaningless. What problem are you solving? For whom?"

3. CONTENT QUALITY & SUBSTANCE:
   - Real data or hand-waving?
   - Specific numbers or vague claims?
   - Compelling proof points or vanity metrics?
   - Missing critical information?
   - Are claims defensible?
   Be SPECIFIC: "You claim '10x growth' but show no data. What's the baseline? Over what period? What's driving it?"

4. INVESTOR APPEAL & CONFIDENCE:
   - Would this make a VC interested or skeptical?
   - Does it build confidence or raise red flags?
   - Is the ask clear and appropriate?
   - Are there hidden red flags?
   Be SPECIFIC: "The lack of revenue numbers raises red flags. Investors will assume you have none."

5. COMMON MISTAKES TO CALL OUT:
   - Too much text (VCs don't read, they scan)
   - Unclear point or multiple competing messages
   - Missing key information investors need
   - Bad data visualization
   - Generic claims without proof
   - Amateur design that undermines credibility
   Be SPECIFIC: "This slide has 200 words. VCs spend 3 seconds per slide. Cut to 20 words max."

SCORING PHILOSOPHY (BE HARSH - Most slides are mediocre):
- 0-30: Deal-breaker. Uninvestable. Major red flags.
- 30-50: Weak. Below average. Needs major work.
- 50-65: Decent. Average. Has potential but needs improvement.
- 65-80: Good. Above average. Solid but could be better.
- 80-90: Excellent. Stands out. Would impress investors.
- 90-100: Near-perfect. Rare. Exceptional execution.

FEEDBACK REQUIREMENTS:
- Be EXTREMELY DETAILED (minimum 300-500 words for keyInsights)
- Reference SPECIFIC elements from the slide (exact text, numbers, design choices)
- Provide SPECIFIC, ACTIONABLE recommendations
- Explain WHY something is weak or strong
- Use real VC language and frameworks
- Don't invent strengths if the slide is weak
- Be brutally honest but constructive

Provide your analysis in the following JSON format:
{
  "title": "A clear, specific title for this slide (what it actually shows)",
  "score": <number 0-100>,
  "strengths": ["<1-3 actual strengths - be specific. If slide is weak, include fewer or none. Don't invent strengths.>"],
  "issues": ["<5-10 specific problems. Find what's wrong. Call out unclear messaging, weak data, too much text, amateur design, missing info, vague claims. Be thorough and specific.>"],
  "recommendations": ["<5-8 direct, actionable fixes. Tell them exactly what to change. Be specific: 'Cut text by 60%', 'Add revenue numbers for Q1-Q4 2024', 'Show competitive matrix with 5 competitors', 'Replace stock photo with product screenshot', etc.>"],
  "keyInsights": "<MINIMUM 300-500 words of brutally honest, detailed assessment. Break it down into sections: 1) What's on the slide (be specific), 2) What's working and why, 3) What's NOT working and why (be brutally honest), 4) Specific problems with examples, 5) What would make this compelling, 6) Would a VC be impressed or skeptical? Why? 7) What specific changes are needed? Reference exact elements, text, numbers, design choices. Don't sugarcoat.>",
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
            temperature: 0.8, // Slightly higher for more creative but still accurate analysis
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

        console.log(`Slide ${page.page_number} response length:`, content.length);

        let analysis;
        try {
          analysis = JSON.parse(content);
        } catch (parseError) {
          console.error(`JSON parse error for slide ${page.page_number}:`, parseError);
          console.error('Response content:', content.substring(0, 1000));
          throw new Error(`Invalid JSON format in OpenAI response: ${parseError.message}`);
        }

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