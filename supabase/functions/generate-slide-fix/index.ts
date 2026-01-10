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

Your task is to provide EXACT, IMPLEMENTATION-READY fixes for pitch deck slides - not vague advice. When you identify an issue, you provide:

1. EXACT TEXT REPLACEMENTS - Word-for-word what to write, not "consider adding" or "you should"
2. SPECIFIC VISUAL RECOMMENDATIONS - Exact images/graphics to add with descriptions
3. PRECISE FORMATTING CHANGES - Bullet points, layout adjustments with exact specifications
4. CONCRETE EXAMPLES - Show before/after with actual text

For example:
- BAD: "Add more details about your team's experience"
- GOOD: "Replace 'Experienced team' with 'Team with 10+ years at Google, Meta, and Tesla. Previously scaled products to 50M+ users.'"

- BAD: "Include a visual"
- GOOD: "Add a growth chart showing MRR progression: Jan $10K → Jun $50K (5x in 6 months). Use a line graph with green upward trend."

- BAD: "Make it more concise"
- GOOD: "Replace paragraph with bullets:\n• Serves 500+ enterprise customers\n• $2M ARR, growing 20% MoM\n• Team of 12, including 4 ex-Stripe engineers"

Your fixes should bring slides from their current score to 10/10 if implemented correctly. Be specific, actionable, and results-oriented.`;

    const userPrompt = `Analyze this pitch deck slide and provide a complete, implementation-ready fix.

SLIDE DETAILS:
- Title: ${slideTitle}
- Current Score: ${currentScore}/10 (needs ${scoreGap.toFixed(1)} point improvement)
- Content: ${slideContent || 'Not available'}

CURRENT ISSUES:
${slideFeedback || 'General improvement needed'}

RECOMMENDATIONS:
${slideRecommendations?.join('\n') || 'None provided'}

${imageUrl ? `The slide has an image at: ${imageUrl}` : 'The slide currently has no visual elements.'}

Provide a JSON response with this exact structure:
{
  "issueType": "Brief category (e.g., 'Weak Team Credentials', 'Missing Traction Data', 'Poor Visual Design')",
  "issueDescription": "2-3 sentence description of the main problem",
  "exactReplacementText": "The EXACT text to use on the slide. Be specific and complete. Use \\n for line breaks.",
  "visualRecommendations": [
    "Specific visual element 1 with details",
    "Specific visual element 2 with details"
  ],
  "implementationSteps": [
    "Step 1: Specific action",
    "Step 2: Specific action",
    "Step 3: Specific action"
  ],
  "estimatedScoreImprovement": 3.5,
  "explanation": "Why this fix works and how it addresses VC concerns",
  "beforeExample": "What the slide currently says (or the problem)",
  "afterExample": "What the slide should say after the fix"
}

Be extremely specific. This is a premium feature - deliver expert-level, implementation-ready guidance.`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
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