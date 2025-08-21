import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface EmailRequest {
  student_email: string;
  subject: string;
  body: string;
}

interface ResendResponse {
  id?: string;
  message?: string;
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function generateEmailHTML(subject: string, body: string): string {
  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: white;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #005baa 0%, #0070d4 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .header p {
          margin: 10px 0 0 0;
          opacity: 0.9;
          font-size: 16px;
        }
        .content {
          padding: 30px 20px;
        }
        .content h2 {
          color: #005baa;
          margin-top: 0;
          font-size: 20px;
          border-bottom: 2px solid #e8f4fd;
          padding-bottom: 10px;
        }
        .message-body {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #005baa;
          margin: 20px 0;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          border-top: 1px solid #e9ecef;
          color: #6c757d;
          font-size: 14px;
        }
        .footer a {
          color: #005baa;
          text-decoration: none;
        }
        .footer a:hover {
          text-decoration: underline;
        }
        .logo {
          display: inline-block;
          margin-bottom: 10px;
        }
        @media (max-width: 600px) {
          body {
            padding: 10px;
          }
          .header {
            padding: 20px 15px;
          }
          .content {
            padding: 20px 15px;
          }
          .header h1 {
            font-size: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🎓</div>
          <h1>Sakarya Üniversitesi</h1>
          <p>İşletme Fakültesi - Randevu Sistemi</p>
        </div>
        
        <div class="content">
          <h2>📧 ${subject}</h2>
          
          <div class="message-body">
            ${body}
          </div>
          
          <p style="margin-top: 30px; color: #6c757d; font-size: 14px;">
            Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.
          </p>
        </div>
        
        <div class="footer">
          <p>
            <strong>Sakarya Üniversitesi İşletme Fakültesi</strong><br>
            Esentepe Kampüsü, 54187 Serdivan/Sakarya<br>
            <a href="https://islf.sakarya.edu.tr" target="_blank">islf.sakarya.edu.tr</a> | 
            <a href="tel:02642957129">(0264) 295 71 29</a>
          </p>
          <p style="margin-top: 15px; font-size: 12px; opacity: 0.8;">
            © ${new Date().getFullYear()} Sakarya Üniversitesi. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function sendEmailWithResend(emailData: EmailRequest): Promise<ResendResponse> {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'SAU İşletme Fakültesi <noreply@yourdomain.com>', // Bu domain'i Resend'de doğrulamanız gerekiyor
      to: [emailData.student_email],
      subject: emailData.subject,
      html: generateEmailHTML(emailData.subject, emailData.body),
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${errorData}`);
  }

  return await response.json();
}

async function logEmailAttempt(emailData: EmailRequest, success: boolean, error?: string) {
  try {
    await supabase
      .from('debug_logs')
      .insert({
        function_name: 'send-student-notification',
        message: success ? 'E-posta başarıyla gönderildi' : 'E-posta gönderimi başarısız',
        details: {
          student_email: emailData.student_email,
          subject: emailData.subject,
          success,
          error,
          timestamp: new Date().toISOString(),
          resend_api_key_set: !!RESEND_API_KEY
        }
      });
  } catch (logError) {
    console.error('Logging error:', logError);
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }

  try {
    // Parse request body
    const requestBody = await req.text();
    
    if (!requestBody) {
      throw new Error('Request body is empty');
    }

    const emailData: EmailRequest = JSON.parse(requestBody);

    // Validate required fields
    if (!emailData.student_email || !emailData.subject || !emailData.body) {
      throw new Error('Missing required fields: student_email, subject, and body are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.student_email)) {
      throw new Error('Invalid email format');
    }

    console.log('Sending email to:', emailData.student_email);
    console.log('Subject:', emailData.subject);

    // Send email using Resend
    const result = await sendEmailWithResend(emailData);

    // Log successful attempt
    await logEmailAttempt(emailData, true);

    console.log('Email sent successfully:', result);

    return new Response(
      JSON.stringify({ 
        status: "OK",
        message: "Email sent successfully",
        email_id: result.id 
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );

  } catch (error) {
    console.error('Error sending email:', error);

    // Try to parse the original request for logging
    let emailData: Partial<EmailRequest> = {};
    try {
      const requestBody = await req.text();
      if (requestBody) {
        emailData = JSON.parse(requestBody);
      }
    } catch (parseError) {
      console.error('Could not parse request for logging:', parseError);
    }

    // Log failed attempt
    if (emailData.student_email) {
      await logEmailAttempt(emailData as EmailRequest, false, error.message);
    }

    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
});