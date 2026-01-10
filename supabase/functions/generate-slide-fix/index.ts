import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FixRequest {
  analysisId: string;
  pageNumber: number;
  slideTitle: string;
  slideScore: number;
  slideContent: string | null;
  slideFeedback: string | null;
  slideRecommendations: string[] | null;
  imageUrl: string | null;
}

interface GeneratedFix {
  issueType: string;
  issueDescription: string;
  exactReplacementText: string;
  visualRecommendations: string[];
  implementationSteps: string[];
  estimatedScoreImprovement: number;
  explanation: string;
  beforeExample: string;
  afterExample: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const requestData: FixRequest = await req.json();
    const {
      analysisId,
      pageNumber,
      slideTitle,
      slideScore,
      slideContent,
      slideFeedback,
      slideRecommendations,
      imageUrl,
    } = requestData;

    const currentScore = slideScore / 10;
    const scoreGap = 10 - currentScore;

    const systemPrompt = `You are an elite pitch deck consultant who has helped founders raise over $500M in venture capital. Your expertise includes working with Y Combinator companies, Sequoia-backed startups, and successful Series A-D companies.

You are analyzing the ACTUAL slide image provided. Your task is to:

1. DESCRIBE EXACTLY WHAT YOU SEE on the current slide (this is the "BEFORE")
2. Provide EXACT, IMPLEMENTATION-READY fixes based on what's actually there
3. Show specific improvements to the existing content, not generic advice

When you identify an issue, you provide:

1. EXACT TEXT REPLACEMENTS - Word-for-word improvements to what's currently on the slide
2. SPECIFIC VISUAL RECOMMENDATIONS - Concrete changes to existing layout/graphics
3. PRECISE FORMATTING CHANGES - Based on the current design
4. CONCRETE BEFORE/AFTER - Show what's there NOW vs. what it should say

CRITICAL:
- "beforeExample" must describe what you ACTUALLY SEE on the slide image
- Don't make up content that isn't there
- Fix what exists, don't propose entirely new content
- Quote actual text from the slide in your before example

Examples:
- BAD beforeExample: "Generic team description"
- GOOD beforeExample: "Current slide shows: 'Experienced team with background in tech' with no specific details or credentials"

- BAD: "Add a growth chart"
- GOOD: "Replace the static bullet points with a visual growth chart showing the MRR data already mentioned on the slide"

Your fixes should improve what's CURRENTLY on the slide, bringing it from its current score to 10/10.`;

    const userPromptText = `Analyze the slide image provided and provide a complete, implementation-ready fix.

SLIDE DETAILS:
- Title: ${slideTitle}
- Current Score: ${currentScore}/10 (needs ${scoreGap.toFixed(1)} point improvement)
- Extracted Text: ${slideContent || 'Not available'}

CURRENT ISSUES IDENTIFIED:
${slideFeedback || 'General improvement needed'}

EXPERT RECOMMENDATIONS:
${slideRecommendations?.join('\n') || 'None provided'}

INSTRUCTIONS:
1. First, describe EXACTLY what you see on the slide image (text, layout, visuals, design)
2. Identify the main issue preventing this from being a 10/10 slide
3. Provide specific, implementation-ready fixes that improve what's currently there
4. In "beforeExample", quote the actual text/content from the slide
5. In "afterExample", show exactly what it should say instead

Provide a JSON response with this exact structure:
{
  "issueType": "Brief category (e.g., 'Weak Team Credentials', 'Missing Traction Data', 'Poor Visual Design')",
  "issueDescription": "2-3 sentence description of the main problem based on what you see",
  "exactReplacementText": "The EXACT text to use on the slide. Be specific and complete. Use \\n for line breaks.",
  "visualRecommendations": [
    "Specific change to current layout/design",
    "Specific visual element to add/modify"
  ],
  "implementationSteps": [
    "Step 1: Specific action",
    "Step 2: Specific action",
    "Step 3: Specific action"
  ],
  "estimatedScoreImprovement": 3.5,
  "explanation": "Why this fix works and how it addresses VC concerns",
  "beforeExample": "EXACTLY what the slide currently shows (quote actual text from the image)",
  "afterExample": "What the slide should say after implementing the fix"
}

Be extremely specific. This is a premium feature - deliver expert-level, implementation-ready guidance based on the actual slide content.`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    if (imageUrl) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: userPromptText
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
              detail: 'high'
            }
          }
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: userPromptText
      });
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: messages,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        max_tokens: 2000,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const generatedFix: GeneratedFix = JSON.parse(openaiData.choices[0].message.content);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const saveResponse = await fetch(`${supabaseUrl}/rest/v1/analysis_slide_fixes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        analysis_id: analysisId,
        page_number: pageNumber,
        issue_type: generatedFix.issueType,
        issue_description: generatedFix.issueDescription,
        generated_fix: generatedFix,
        exact_replacement_text: generatedFix.exactReplacementText,
        visual_recommendations: generatedFix.visualRecommendations,
        implementation_steps: generatedFix.implementationSteps,
        estimated_score_improvement: generatedFix.estimatedScoreImprovement,
      }),
    });

    if (!saveResponse.ok) {
      const error = await saveResponse.text();
      console.error('Failed to save fix:', error);
      throw new Error('Failed to save fix to database');
    }

    const savedFix = await saveResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        fix: generatedFix,
        fixId: savedFix[0].id,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error generating fix:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to generate fix',
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