import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_FROM_EMAIL = 'Martins Osodi <martins@deckfix.ai>';

interface WelcomeEmailRequest {
  email: string;
  fullName?: string;
}

serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set');
    }

    const { email, fullName }: WelcomeEmailRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: email' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const userName = fullName || email.split('@')[0];

    // Send welcome email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [email],
        subject: 'Welcome to DeckFix! 🚀',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Welcome to DeckFix! 🚀</h1>
              </div>
              <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <p style="font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>
                <p style="font-size: 16px; margin-bottom: 20px;">
                  Welcome to DeckFix! We're thrilled to have you join our community of entrepreneurs and startups working to perfect their pitch decks.
                </p>
                <p style="font-size: 16px; margin-bottom: 30px;">
                  You now have <strong>100 free credits</strong> to get started. Here's what you can do:
                </p>
                
                <div style="background: #f8fafc; border-left: 4px solid #0f172a; padding: 20px; margin: 30px 0; border-radius: 8px;">
                  <h2 style="font-size: 18px; font-weight: bold; color: #0f172a; margin: 0 0 15px 0;">Getting Started</h2>
                  <ol style="margin: 0; padding-left: 20px; color: #475569;">
                    <li style="margin-bottom: 10px;">Upload your pitch deck PDF</li>
                    <li style="margin-bottom: 10px;">Get AI-powered analysis and feedback</li>
                    <li style="margin-bottom: 10px;">Review detailed recommendations</li>
                    <li style="margin-bottom: 0;">Improve your deck and secure funding!</li>
                  </ol>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${Deno.env.get('SITE_URL') || 'https://deckfix.ai'}" 
                     style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Upload Your First Pitch Deck
                  </a>
                </div>

                <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 30px 0;">
                  <h3 style="font-size: 16px; font-weight: bold; color: #0f172a; margin: 0 0 10px 0;">💡 Pro Tips</h3>
                  <ul style="margin: 0; padding-left: 20px; color: #475569;">
                    <li style="margin-bottom: 8px;">Each page of your pitch deck costs 1 credit to analyze</li>
                    <li style="margin-bottom: 8px;">Earn 50 free credits by referring friends</li>
                    <li style="margin-bottom: 8px;">Get detailed, VC-level feedback on every slide</li>
                    <li style="margin-bottom: 0;">Use our AI recommendations to improve your deck</li>
                  </ul>
                </div>

                <p style="font-size: 16px; margin-bottom: 20px;">
                  If you have any questions or need help, don't hesitate to reach out. We're here to help you succeed!
                </p>

                <p style="font-size: 16px; margin-bottom: 30px;">
                  Best regards,<br>
                  <strong>Martins Osodi</strong><br>
                  <span style="color: #64748b;">Founder, DeckFix</span>
                </p>

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                
                <div style="text-align: center; margin-bottom: 20px;">
                  <p style="font-size: 14px; color: #64748b; margin-bottom: 10px;">Need help? We're here for you:</p>
                  <p style="font-size: 14px; color: #64748b; margin: 5px 0;">
                    📧 <a href="mailto:support@deckfix.ai" style="color: #0f172a; text-decoration: none;">support@deckfix.ai</a>
                  </p>
                  <p style="font-size: 14px; color: #64748b; margin: 5px 0;">
                    📞 <a href="tel:+17402141009" style="color: #0f172a; text-decoration: none;">+1 740 214 1009</a>
                  </p>
                </div>

                <p style="font-size: 12px; color: #94a3b8; margin: 0; text-align: center;">
                  © ${new Date().getFullYear()} DeckFix by Planmoni, Inc. All rights reserved.<br>
                  8345 Northwest 66th Street, Miami, FL 33195, United States
                </p>
              </div>
            </body>
          </html>
        `,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error('Resend API error:', errorData);
      throw new Error(`Failed to send email: ${resendResponse.status} ${errorData}`);
    }

    const resendData = await resendResponse.json();

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: resendData.id,
        message: 'Welcome email sent successfully' 
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to send welcome email',
        details: error.toString()
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});

