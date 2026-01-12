import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_FROM_EMAIL = 'DeckFix Notifications <notifications@deckfix.ai>';
const SITE_URL = Deno.env.get('SITE_URL') || 'https://deckfix.ai';

interface AnalysisNotificationRequest {
  email: string;
  userName?: string;
  deckName: string;
  analysisId: string;
  status: 'completed' | 'failed';
  overallScore?: number;
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

    const { email, userName, deckName, analysisId, status, overallScore }: AnalysisNotificationRequest = await req.json();

    if (!email || !deckName || !analysisId || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Check if email was already sent for this analysis to prevent duplicates
    // We'll use a simple in-memory cache (for this request) or check notification table
    // For now, we'll rely on the finalize-analysis function to only call this once
    // But add logging to track duplicate calls
    console.log(`Sending analysis notification email for analysisId: ${analysisId}, status: ${status}`);

    const displayName = userName || email.split('@')[0];
    const analysisUrl = `${SITE_URL}/?view=analysis&analysisId=${analysisId}`;

    let subject: string;
    let emailContent: string;

    if (status === 'completed') {
      subject = `Your pitch deck "${deckName}" analysis is complete! 🎉`;
      emailContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Analysis Complete! 🎉</h1>
            </div>
            <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${displayName},</p>
              <p style="font-size: 16px; margin-bottom: 20px;">
                Great news! Your pitch deck <strong>"${deckName}"</strong> has been analyzed and is ready for review.
              </p>
              
              ${overallScore !== undefined ? `
              <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0;">
                <p style="color: #ffffff; font-size: 14px; margin: 0 0 10px 0; opacity: 0.9;">Overall Score</p>
                <p style="color: #ffffff; font-size: 48px; font-weight: bold; margin: 0;">${overallScore}/100</p>
              </div>
              ` : ''}

              <div style="background: #f8fafc; border-left: 4px solid #0f172a; padding: 20px; margin: 30px 0; border-radius: 8px;">
                <h2 style="font-size: 18px; font-weight: bold; color: #0f172a; margin: 0 0 15px 0;">What's Next?</h2>
                <ul style="margin: 0; padding-left: 20px; color: #475569;">
                  <li style="margin-bottom: 10px;">Review detailed feedback on each slide</li>
                  <li style="margin-bottom: 10px;">See actionable recommendations for improvement</li>
                  <li style="margin-bottom: 10px;">Get instant AI-generated fixes for critical issues</li>
                  <li style="margin-bottom: 0;">Make your deck investor-ready!</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${analysisUrl}" 
                   style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  View Analysis
                </a>
              </div>

              <p style="font-size: 16px; margin-bottom: 20px;">
                If you have any questions or need help, don't hesitate to reach out. We're here to help you succeed!
              </p>

              <p style="font-size: 16px; margin-bottom: 30px;">
                Best regards,<br>
                <strong>The DeckFix Team</strong>
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
              
              <div style="text-align: center; margin-bottom: 20px;">
                <p style="font-size: 14px; color: #64748b; margin-bottom: 10px;">Need help? We're here for you:</p>
                <p style="font-size: 14px; color: #64748b; margin: 5px 0;">
                  📧 <a href="mailto:support@deckfix.ai" style="color: #0f172a; text-decoration: none;">support@deckfix.ai</a>
                </p>
              </div>

              <p style="font-size: 12px; color: #94a3b8; margin: 0; text-align: center;">
                © ${new Date().getFullYear()} DeckFix by Planmoni, Inc. All rights reserved.<br>
                8345 Northwest 66th Street, Miami, FL 33195, United States
              </p>
            </div>
          </body>
        </html>
      `;
    } else {
      subject = `Analysis failed for "${deckName}"`;
      emailContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Analysis Failed</h1>
            </div>
            <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${displayName},</p>
              <p style="font-size: 16px; margin-bottom: 20px;">
                We encountered an issue while analyzing your pitch deck <strong>"${deckName}"</strong>.
              </p>
              
              <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 30px 0; border-radius: 8px;">
                <p style="color: #991b1b; margin: 0;">
                  Don't worry! This is usually a temporary issue. Please try uploading your deck again, or contact our support team if the problem persists.
                </p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${SITE_URL}" 
                   style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Try Again
                </a>
              </div>

              <p style="font-size: 16px; margin-bottom: 20px;">
                If you continue to experience issues, please contact our support team.
              </p>

              <p style="font-size: 16px; margin-bottom: 30px;">
                Best regards,<br>
                <strong>The DeckFix Team</strong>
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
              
              <div style="text-align: center; margin-bottom: 20px;">
                <p style="font-size: 14px; color: #64748b; margin-bottom: 10px;">Need help? We're here for you:</p>
                <p style="font-size: 14px; color: #64748b; margin: 5px 0;">
                  📧 <a href="mailto:support@deckfix.ai" style="color: #0f172a; text-decoration: none;">support@deckfix.ai</a>
                </p>
              </div>

              <p style="font-size: 12px; color: #94a3b8; margin: 0; text-align: center;">
                © ${new Date().getFullYear()} DeckFix by Planmoni, Inc. All rights reserved.<br>
                8345 Northwest 66th Street, Miami, FL 33195, United States
              </p>
            </div>
          </body>
        </html>
      `;
    }

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [email],
        subject,
        html: emailContent,
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
        message: 'Notification email sent successfully' 
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
    console.error('Error sending analysis notification email:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to send notification email',
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

