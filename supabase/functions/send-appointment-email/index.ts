import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface EmailData {
  student_name: string;
  student_email: string;
  lecturer_name: string;
  lecturer_email: string;
  date: string;
  start_time: string;
  end_time: string;
  subject: string;
  message: string;
  student_faculty: string;
  student_department: string;
  student_year: string;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GMAIL_USER = Deno.env.get('GMAIL_USER');
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

async function sendEmailWithSMTP(to: string, subject: string, html: string): Promise<boolean> {
  try {
    console.log('📧 SMTP ile e-posta gönderiliyor:', to);

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      console.log('❌ Gmail bilgileri eksik!');
      await supabase
        .from('debug_logs')
        .insert({
          function_name: 'send-appointment-email',
          message: 'Gmail bilgileri eksik',
          details: {
            to: to,
            gmail_user_set: !!GMAIL_USER,
            gmail_password_set: !!GMAIL_APP_PASSWORD,
            timestamp: new Date().toISOString()
          }
        });
      return false;
    }

    // Nodemailer benzeri SMTP gönderimi
    const emailPayload = {
      from: `"SAU İşletme Fakültesi" <${GMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html
    };

    // Gmail SMTP API çağrısı
    const smtpResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: 'gmail',
        template_id: 'template_custom',
        user_id: 'your_user_id', // EmailJS user ID gerekli
        template_params: {
          from_name: 'SAU İşletme Fakültesi',
          from_email: GMAIL_USER,
          to_email: to,
          subject: subject,
          message: html
        }
      })
    });

    if (smtpResponse.ok) {
      console.log('✅ E-posta başarıyla gönderildi:', to);
      
      await supabase
        .from('debug_logs')
        .insert({
          function_name: 'send-appointment-email',
          message: 'E-posta başarıyla gönderildi',
          details: {
            to: to,
            subject: subject,
            from: GMAIL_USER,
            smtp_response: 'success',
            timestamp: new Date().toISOString()
          }
        });
      
      return true;
    } else {
      throw new Error(`SMTP Error: ${smtpResponse.status}`);
    }

  } catch (error) {
    console.error('❌ SMTP hatası:', error);
    
    await supabase
      .from('debug_logs')
      .insert({
        function_name: 'send-appointment-email',
        message: 'SMTP hatası',
        details: {
          to: to,
          error: error.message,
          gmail_user: GMAIL_USER,
          timestamp: new Date().toISOString()
        }
      });
    
    return false;
  }
}

// Alternatif: Resend API kullanarak gönderim
async function sendEmailWithResend(to: string, subject: string, html: string): Promise<boolean> {
  try {
    console.log('📧 Resend API ile e-posta gönderiliyor:', to);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer re_demo_key`, // Gerçek API key gerekli
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `SAU İşletme Fakültesi <${GMAIL_USER}>`,
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    if (response.ok) {
      console.log('✅ Resend ile e-posta gönderildi:', to);
      return true;
    } else {
      const errorData = await response.text();
      console.error('❌ Resend API hatası:', response.status, errorData);
      return false;
    }

  } catch (error) {
    console.error('❌ Resend e-posta hatası:', error);
    return false;
  }
}

// Basit SMTP gönderimi (test için)
async function sendTestEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    console.log('🧪 Test e-posta gönderimi:', to);
    
    // Gerçek e-posta gönderimi için fetch kullanarak bir e-posta servisi çağırın
    // Örnek: SendGrid, Mailgun, veya başka bir servis
    
    // Şimdilik debug log ekleyelim
    await supabase
      .from('debug_logs')
      .insert({
        function_name: 'send-appointment-email',
        message: 'Test e-posta gönderildi',
        details: {
          to: to,
          subject: subject,
          from: GMAIL_USER,
          mode: 'test',
          gmail_configured: !!(GMAIL_USER && GMAIL_APP_PASSWORD),
          timestamp: new Date().toISOString()
        }
      });

    console.log('✅ Test e-posta "gönderildi":', to);
    return true;

  } catch (error) {
    console.error('❌ Test e-posta hatası:', error);
    return false;
  }
}

function generateStudentEmailHTML(emailData: EmailData): string {
  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Randevu Onayı</title>
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
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 30px 20px;
        }
        .status-banner {
          background-color: #cce5ff;
          color: #004085;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          margin-bottom: 25px;
          font-weight: 600;
          font-size: 18px;
        }
        .appointment-details {
          background-color: #f8f9fa;
          padding: 25px;
          border-radius: 8px;
          border-left: 4px solid #005baa;
          margin: 20px 0;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 25px 20px;
          text-align: center;
          border-top: 1px solid #e9ecef;
          color: #6c757d;
          font-size: 14px;
        }
        .button {
          background-color: #005baa;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          display: inline-block;
          margin: 15px 0;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div style="font-size: 24px; margin-bottom: 10px;">🎓</div>
          <h1>Edulink</h1>
          <p>Sakarya Üniversitesi İşletme Fakültesi</p>
        </div>
        
        <div class="content">
          <div class="status-banner">
            📅 Randevu Talebiniz Alınmıştır
          </div>
          
          <p>Sayın ${emailData.student_name},</p>
          
          <p>Randevu talebiniz başarıyla alınmıştır. Akademisyen tarafından onaylandığında bilgilendirileceksiniz.</p>
          
          <div class="appointment-details">
            <h3 style="margin-top: 0; color: #005baa;">📋 Randevu Detayları</h3>
            <p><strong>👨‍🏫 Akademisyen:</strong> ${emailData.lecturer_name}</p>
            <p><strong>📅 Tarih:</strong> ${formatDate(emailData.date)}</p>
            <p><strong>🕐 Saat:</strong> ${emailData.start_time} - ${emailData.end_time}</p>
            <p><strong>📝 Konu:</strong> ${emailData.subject}</p>
          </div>
          
          ${emailData.message ? `
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <strong>💬 Mesajınız:</strong><br>
            ${emailData.message}
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="https://sparkly-macaron-fe2a34.netlify.app/randevularim" class="button">
              📋 Randevularımı Görüntüle
            </a>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Edulink - Sakarya Üniversitesi İşletme Fakültesi</strong></p>
          <p>Esentepe Kampüsü, 54187 Serdivan/Sakarya</p>
          <p>© ${new Date().getFullYear()} Sakarya Üniversitesi. Tüm hakları saklıdır.</p>
          <p style="margin-top: 15px; font-size: 12px; opacity: 0.8;">
            Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateLecturerEmailHTML(emailData: EmailData): string {
  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Yeni Randevu Talebi</title>
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
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 30px 20px;
        }
        .status-banner {
          background-color: #d4edda;
          color: #155724;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          margin-bottom: 25px;
          font-weight: 600;
          font-size: 18px;
        }
        .appointment-details {
          background-color: #f8f9fa;
          padding: 25px;
          border-radius: 8px;
          border-left: 4px solid #005baa;
          margin: 20px 0;
        }
        .student-info {
          background-color: #e8f4fd;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #0070d4;
          margin: 20px 0;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 25px 20px;
          text-align: center;
          border-top: 1px solid #e9ecef;
          color: #6c757d;
          font-size: 14px;
        }
        .button {
          background-color: #005baa;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          display: inline-block;
          margin: 15px 0;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div style="font-size: 24px; margin-bottom: 10px;">🎓</div>
          <h1>Edulink</h1>
          <p>Sakarya Üniversitesi İşletme Fakültesi</p>
        </div>
        
        <div class="content">
          <div class="status-banner">
            🔔 Yeni Randevu Talebi Aldınız
          </div>
          
          <p>Sayın ${emailData.lecturer_name},</p>
          
          <p>Yeni bir randevu talebi aldınız. Bu randevu talebini onaylamanız veya reddetmeniz gerekmektedir.</p>
          
          <div class="appointment-details">
            <h3 style="margin-top: 0; color: #005baa;">📋 Randevu Detayları</h3>
            <p><strong>📅 Tarih:</strong> ${formatDate(emailData.date)}</p>
            <p><strong>🕐 Saat:</strong> ${emailData.start_time} - ${emailData.end_time}</p>
            <p><strong>📝 Konu:</strong> ${emailData.subject}</p>
          </div>
          
          <div class="student-info">
            <h3 style="margin-top: 0; color: #0070d4;">👤 Öğrenci Bilgileri</h3>
            <p><strong>👨‍🎓 Ad Soyad:</strong> ${emailData.student_name}</p>
            <p><strong>📧 E-posta:</strong> ${emailData.student_email}</p>
            <p><strong>🏛️ Fakülte:</strong> ${emailData.student_faculty}</p>
            <p><strong>📚 Bölüm:</strong> ${emailData.student_department}</p>
            <p><strong>🎓 Sınıf:</strong> ${emailData.student_year}</p>
          </div>
          
          ${emailData.message ? `
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <strong>💬 Öğrenci Mesajı:</strong><br>
            ${emailData.message}
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="https://sparkly-macaron-fe2a34.netlify.app/ogretim-elemani/randevu-talepleri" class="button">
              📋 Randevu Taleplerini Görüntüle
            </a>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Edulink - Sakarya Üniversitesi İşletme Fakültesi</strong></p>
          <p>Esentepe Kampüsü, 54187 Serdivan/Sakarya</p>
          <p>© ${new Date().getFullYear()} Sakarya Üniversitesi. Tüm hakları saklıdır.</p>
          <p style="margin-top: 15px; font-size: 12px; opacity: 0.8;">
            Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('=== EDULINK E-POSTA FUNCTION BAŞLADI ===');
    
    const requestBody = await req.text();
    console.log('📧 Request alındı, e-posta gönderiliyor...');
    
    const { emailData } = JSON.parse(requestBody);
    
    if (!emailData) {
      throw new Error('E-posta verisi bulunamadı');
    }

    console.log('📋 E-posta gönderimi başlıyor...');
    console.log('Gmail User:', GMAIL_USER);
    console.log('Gmail Password Set:', !!GMAIL_APP_PASSWORD);

    // Test e-posta gönderimi (şimdilik)
    const studentEmailSuccess = await sendTestEmail(
      emailData.student_email,
      '📅 Randevu Talebiniz Alındı - SAU İşletme Fakültesi',
      generateStudentEmailHTML(emailData)
    );

    const lecturerEmailSuccess = await sendTestEmail(
      emailData.lecturer_email,
      '🔔 Yeni Randevu Talebi - SAU İşletme Fakültesi',
      generateLecturerEmailHTML(emailData)
    );

    // Ana debug log ekle
    await supabase
      .from('debug_logs')
      .insert({
        function_name: 'send-appointment-email',
        message: 'E-posta gönderim durumu',
        details: {
          student_email_sent: studentEmailSuccess,
          lecturer_email_sent: lecturerEmailSuccess,
          student_email: emailData.student_email,
          lecturer_email: emailData.lecturer_email,
          gmail_user: GMAIL_USER,
          gmail_configured: !!(GMAIL_USER && GMAIL_APP_PASSWORD),
          mode: 'test_mode',
          timestamp: new Date().toISOString(),
          function_version: '6.0_debug_mode'
        }
      });

    console.log('✅ E-POSTA FUNCTION TAMAMLANDI');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'E-postalar gönderildi (test modu)',
        student_email_sent: studentEmailSuccess,
        lecturer_email_sent: lecturerEmailSuccess,
        gmail_user: GMAIL_USER,
        gmail_configured: !!(GMAIL_USER && GMAIL_APP_PASSWORD),
        mode: 'test_mode',
        note: 'Gerçek e-posta gönderimi için SMTP servisi gerekli'
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );

  } catch (error) {
    console.error('❌ E-posta gönderme hatası:', error);
    
    await supabase
      .from('debug_logs')
      .insert({
        function_name: 'send-appointment-email',
        message: 'E-posta gönderme hatası',
        details: {
          error: error.message,
          stack: error.stack,
          gmail_user: GMAIL_USER,
          timestamp: new Date().toISOString(),
          function_version: '6.0_error'
        }
      });

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        status: 500
      }
    );
  }
});