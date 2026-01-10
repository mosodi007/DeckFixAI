import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface IssueFixRequest {
  analysisId: string;
  issueType: 'deal_breaker' | 'red_flag' | 'missing_slide';
  issueTitle: string;
  issueDescription: string;
  issueRecommendation?: string;
  issueImpact?: string;
  issueSuggestedContent?: string;
  issueCategory?: string;
  issueSeverity?: string;
  deckContext?: {
    fileName?: string;
    overallScore?: number;
    keyMetrics?: any;
  };
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

async function getUserCreditBalance(supabaseClient: any, userId: string) {
  const { data, error } = await supabaseClient
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user credits:', error);
    return null;
  }

  return data;
}

async function deductCredits(
  supabaseClient: any,
  userId: string,
  creditCost: number,
  description: string,
  metadata: Record<string, unknown> = {}
) {
  const currentCredits = await getUserCreditBalance(supabaseClient, userId);

  if (!currentCredits) {
    throw new Error('Unable to fetch credit balance');
  }

  if (currentCredits.credits_balance < creditCost) {
    throw new Error('Insufficient credits');
  }

  const newBalance = currentCredits.credits_balance - creditCost;
  let newSubscriptionCredits = currentCredits.subscription_credits;
  let newPurchasedCredits = currentCredits.purchased_credits;

  if (currentCredits.subscription_credits >= creditCost) {
    newSubscriptionCredits -= creditCost;
  } else {
    const remainingToDeduct = creditCost - currentCredits.subscription_credits;
    newSubscriptionCredits = 0;
    newPurchasedCredits -= remainingToDeduct;
  }

  const { error: updateError } = await supabaseClient
    .from('user_credits')
    .update({
      credits_balance: newBalance,
      subscription_credits: newSubscriptionCredits,
      purchased_credits: newPurchasedCredits,
    })
    .eq('user_id', userId);

  if (updateError) {
    console.error('Error updating credits:', updateError);
    throw new Error('Failed to update credits');
  }

  await supabaseClient
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount: -creditCost,
      transaction_type: 'deduction',
      description,
      complexity_score: 50,
      credits_cost: creditCost,
      balance_after: newBalance,
      metadata,
    });

  return newBalance;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const authHeader = req.headers.get('Authorization');
    let user = null;

    const supabaseClient = createClient(
      supabaseUrl!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader || '' } } }
    );

    if (authHeader) {
      const { data: userData, error: userError } = await supabaseClient.auth.getUser();
      if (!userError && userData?.user) {
        user = userData.user;
        console.log('Authenticated user:', user.id);
      }
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const requestData: IssueFixRequest = await req.json();
    const {
      analysisId,
      issueType,
      issueTitle,
      issueDescription,
      issueRecommendation,
      issueImpact,
      issueSuggestedContent,
      issueCategory,
      issueSeverity,
      deckContext,
    } = requestData;

    const ISSUE_FIX_COST = 5;

    if (user) {
      const userCredits = await getUserCreditBalance(supabaseClient, user.id);

      if (!userCredits) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Unable to fetch credit balance',
            requiresAuth: false,
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      if (userCredits.credits_balance < ISSUE_FIX_COST) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Insufficient credits',
            requiresUpgrade: true,
            currentBalance: userCredits.credits_balance,
            requiredCredits: ISSUE_FIX_COST,
          }),
          {
            status: 402,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      await deductCredits(
        supabaseClient,
        user.id,
        ISSUE_FIX_COST,
        `Issue fix: ${issueTitle}`,
        {
          analysisId,
          issueType,
          issueTitle,
        }
      );

      console.log(`Deducted ${ISSUE_FIX_COST} credits from user ${user.id}`);
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication required',
          requiresAuth: true,
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (issueType === 'deal_breaker') {
      systemPrompt = `You are an elite venture capital pitch deck consultant who has helped founders raise over $500M. You specialize in identifying and fixing critical deal-breaking issues that make decks uninvestable.

Your task is to provide ACTIONABLE, IMPLEMENTATION-READY solutions to fix deal-breaking issues. These are critical problems that investors won't overlook.

You provide:
1. EXACT solutions with specific details
2. Clear before/after examples showing the transformation
3. Step-by-step implementation that founders can follow immediately
4. Visual recommendations for maximum impact
5. Expert explanation of why this fix addresses VC concerns`;

      userPrompt = `CRITICAL DEAL-BREAKER ISSUE:

Title: ${issueTitle}

Problem: ${issueDescription}

${issueImpact ? `Investor Impact: ${issueImpact}` : ''}

${issueRecommendation ? `Expert Recommendation: ${issueRecommendation}` : ''}

Deck Context:
- Overall Deck Score: ${deckContext?.overallScore || 'Unknown'}/100
- Company: ${deckContext?.keyMetrics?.company || 'Not specified'}

TASK:
Provide a complete, implementation-ready fix for this deal-breaking issue. This is a premium feature - be extremely specific and actionable.

Respond with JSON:
{
  "issueType": "${issueTitle}",
  "issueDescription": "Clear description of why this is a deal-breaker",
  "exactReplacementText": "EXACT content/text to add or replace. Be specific and complete. Use \\n for line breaks. This should be copy-paste ready.",
  "visualRecommendations": [
    "Specific visual element to add with exact details",
    "Layout change with precise specification"
  ],
  "implementationSteps": [
    "Step 1: Detailed action with specifics",
    "Step 2: Detailed action with specifics",
    "Step 3: Detailed action with specifics"
  ],
  "estimatedScoreImprovement": 15.0,
  "explanation": "Why this fix makes the deck investable - reference specific VC concerns",
  "beforeExample": "What the deck currently has (or lacks) regarding this issue",
  "afterExample": "What the deck will have after implementing this fix"
}`;
    } else if (issueType === 'red_flag') {
      systemPrompt = `You are an elite venture capital pitch deck consultant. You specialize in identifying and fixing red flags that concern investors.

Red flags are issues that make investors hesitant or concerned about the investment opportunity. Your fixes must address investor psychology and build confidence.

You provide:
1. Specific solutions that address the underlying concern
2. Clear examples of how to reframe or add missing information
3. Implementation steps that can be executed immediately
4. Visual recommendations for credibility
5. Explanation of investor psychology`;

      userPrompt = `RED FLAG ISSUE:

Title: ${issueTitle}

Problem: ${issueDescription}

${issueImpact ? `Investor Impact: ${issueImpact}` : ''}

${issueCategory ? `Category: ${issueCategory}` : ''}

${issueSeverity ? `Severity: ${issueSeverity}` : ''}

Deck Context:
- Overall Deck Score: ${deckContext?.overallScore || 'Unknown'}/100
- Company: ${deckContext?.keyMetrics?.company || 'Not specified'}

TASK:
Provide a complete fix that addresses this red flag and builds investor confidence.

Respond with JSON in this exact format:
{
  "issueType": "${issueTitle}",
  "issueDescription": "Why this raises concerns for investors",
  "exactReplacementText": "Specific content to add or replace. Be detailed and copy-paste ready. Use \\n for line breaks.",
  "visualRecommendations": [
    "Specific visual element with exact details",
    "Design change with precise specification"
  ],
  "implementationSteps": [
    "Step 1: Specific action",
    "Step 2: Specific action",
    "Step 3: Specific action"
  ],
  "estimatedScoreImprovement": 8.0,
  "explanation": "How this fix addresses investor concerns and builds confidence",
  "beforeExample": "Current state that raises the red flag",
  "afterExample": "Improved state that resolves the concern"
}`;
    } else if (issueType === 'missing_slide') {
      systemPrompt = `You are an elite pitch deck consultant who has worked with Y Combinator companies and helped them secure Series A-D funding.

You specialize in creating missing critical slides that investors expect to see. Your content is always investor-focused, data-driven, and persuasive.

You provide:
1. Complete slide content that's production-ready
2. Specific data points and structure
3. Visual recommendations for professional presentation
4. Implementation steps to create the slide
5. Explanation of why investors need this`;

      userPrompt = `MISSING SLIDE:

Title: ${issueTitle}

Why It's Needed: ${issueDescription}

${issueSuggestedContent ? `Suggested Content: ${issueSuggestedContent}` : ''}

Deck Context:
- Overall Deck Score: ${deckContext?.overallScore || 'Unknown'}/100
- Company: ${deckContext?.keyMetrics?.company || 'Not specified'}
- Industry: ${deckContext?.keyMetrics?.industry || 'Not specified'}
- Stage: ${deckContext?.keyMetrics?.stage || 'Not specified'}

TASK:
Create complete, production-ready content for this missing slide. Be specific and provide exact text and structure.

Respond with JSON:
{
  "issueType": "Missing: ${issueTitle}",
  "issueDescription": "Why investors expect this slide",
  "exactReplacementText": "Complete slide content - headings, bullets, data points. Be extremely detailed. Use \\n\\n for sections and \\n for bullets.",
  "visualRecommendations": [
    "Specific chart or visual element to include",
    "Layout suggestion with exact placement",
    "Design element for professional appearance"
  ],
  "implementationSteps": [
    "Step 1: Create slide with specific title",
    "Step 2: Add content sections with specifics",
    "Step 3: Add visuals with details",
    "Step 4: Polish and review"
  ],
  "estimatedScoreImprovement": 10.0,
  "explanation": "Why this slide is essential for investors and what questions it answers",
  "beforeExample": "Deck currently missing this critical information",
  "afterExample": "Complete slide with all necessary content and structure"
}`;
    }

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
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
        max_tokens: 2500,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const generatedFix: GeneratedFix = JSON.parse(openaiData.choices[0].message.content);

    // Save to database
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
        page_number: 0,
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
    console.error('Error generating issue fix:', error);
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