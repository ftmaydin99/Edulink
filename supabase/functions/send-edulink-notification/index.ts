import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface EmailNotificationData {
  type: 'appointment_created' | 'appointment_approved' | 'appointment_cancelled' | 'appointment_rescheduled';
  appointment: {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    subject: string;
    message?: string;
    status: string;
    reschedule_reason?: string;
    rescheduled_date?: string;
    rescheduled_start_time?: string;
    rescheduled_end_time?: string;
  };
  student: {
    name: string;
    email: string;
    faculty: string;
    department: string;
    year: string;
  };
  lecturer: {
    name: string;
    email: string;
    title?: string;
  };
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || 're_demo_key_for_testing';

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

function getEmailContent(data: EmailNotificationData, isForStudent: boolean) {
  const { type, appointment, student, lecturer } = data;
  
  let subject = '';
  let statusText = '';
  let actionText = '';
  
  switch (type) {
    case 'appointment_created':
      subject = isForStudent 
        ? '📅 Randevu Talebiniz Alındı - Edulink'
        : '🔔 Yeni Randevu Talebi - Edulink';
      statusText = isForStudent ? 'Randevu talebiniz alınmıştır' : 'Yeni bir randevu talebi aldınız';
      actionText = isForStudent 
        ? 'Randevunuz akademisyen tarafından onaylandığında bilgilendirileceksiniz.'
        : 'Bu randevu talebini onaylamanız veya reddetmeniz gerekmektedir.';
      break;
      
    case 'appointment_approved':
      subject = isForStudent 
        ? '✅ Randevunuz Onaylandı - Edulink'
        : '✅ Randevu Onaylandı - Edulink';
      statusText = isForStudent ? 'Randevunuz onaylanmıştır' : 'Randevuyu onayladınız';
      actionText = isForStudent 
        ? 'Randevunuza zamanında katılmayı unutmayın.'
        : 'Öğrenci randevuya katılacaktır.';
      break;
      
    case 'appointment_cancelled':
      subject = isForStudent 
        ? '❌ Randevunuz İptal Edildi - Edulink'
        : '❌ Randevu İptal Edildi - Edulink';
      statusText = isForStudent ? 'Randevunuz iptal edilmiştir' : 'Randevu iptal edilmiştir';
      actionText = isForStudent 
        ? 'Yeni randevu almak için sistemi kullanabilirsiniz.'
        : 'Öğrenci bilgilendirilmiştir.';
      break;
      
    case 'appointment_rescheduled':
      subject = isForStudent 
        ? '📅 Randevunuz Ertelendi - Edulink'
        : '📅 Randevu Ertelendi - Edulink';
      statusText = isForStudent ? 'Randevunuz ertelenmiştir' : 'Randevuyu ertelediğiniz';
      actionText = isForStudent 
        ? 'Yeni randevu zamanını onaylamanız gerekmektedir.'
        : 'Öğrencinin onayını bekliyorsunuz.';
      break;
  }

  const html = `
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
        .header .subtitle {
          margin: 10px 0 0 0;
          opacity: 0.9;
          font-size: 16px;
        }
        .content {
          padding: 30px 20px;
        }
        .status-banner {
          background-color: ${type === 'appointment_approved' ? '#d4edda' : 
                            type === 'appointment_cancelled' ? '#f8d7da' : 
                            type === 'appointment_rescheduled' ? '#fff3cd' : '#cce5ff'};
          color: ${type === 'appointment_approved' ? '#155724' : 
                  type === 'appointment_cancelled' ? '#721c24' : 
                  type === 'appointment_rescheduled' ? '#856404' : '#004085'};
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
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #e9ecef;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 600;
          color: #495057;
          min-width: 120px;
        }
        .detail-value {
          color: #212529;
          text-align: right;
          flex: 1;
        }
        .reschedule-info {
          background-color: #fff3cd;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #ffc107;
          margin: 20px 0;
        }
        .action-text {
          background-color: #e8f4fd;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #0070d4;
          margin: 20px 0;
          font-style: italic;
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
        .footer {
          background-color: #f8f9fa;
          padding: 25px 20px;
          text-align: center;
          border-top: 1px solid #e9ecef;
          color: #6c757d;
          font-size: 14px;
        }
        .footer a {
          color: #005baa;
          text-decoration: none;
        }
        .logo {
          font-size: 24px;
          margin-bottom: 10px;
        }
        @media (max-width: 600px) {
          body { padding: 10px; }
          .header { padding: 20px 15px; }
          .content { padding: 20px 15px; }
          .detail-row { flex-direction: column; align-items: flex-start; }
          .detail-value { text-align: left; margin-top: 5px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🎓</div>
          <h1>Edulink</h1>
          <div class="subtitle">Sakarya Üniversitesi İşletme Fakültesi Randevu Sistemi</div>
        </div>
        
        <div class="content">
          <div class="status-banner">
            ${statusText}
          </div>
          
          <p>Sayın ${isForStudent ? student.name : lecturer.name},</p>
          
          <div class="appointment-details">
            <h3 style="margin-top: 0; color: #005baa;">📋 Randevu Detayları</h3>
            
            <div class="detail-row">
              <span class="detail-label">${isForStudent ? '👨‍🏫 Akademisyen:' : '👨‍🎓 Öğrenci:'}</span>
              <span class="detail-value">${isForStudent ? lecturer.name : student.name}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">📅 Tarih:</span>
              <span class="detail-value">${formatDate(appointment.date)}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">🕐 Saat:</span>
              <span class="detail-value">${appointment.start_time} - ${appointment.end_time}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">📝 Konu:</span>
              <span class="detail-value">${appointment.subject}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">📊 Durum:</span>
              <span class="detail-value">${appointment.status === 'bekliyor' ? 'Onay Bekliyor' : 
                                        appointment.status === 'onaylandı' ? 'Onaylandı' : 
                                        appointment.status === 'iptal' ? 'İptal Edildi' : 
                                        appointment.status === 'awaiting_student_approval' ? 'Öğrenci Onayı Bekliyor' : appointment.status}</span>
            </div>
            
            ${!isForStudent && student.faculty ? `
            <div class="detail-row">
              <span class="detail-label">🏛️ Fakülte:</span>
              <span class="detail-value">${student.faculty}</span>
            </div>
            ` : ''}
            
            ${!isForStudent && student.department ? `
            <div class="detail-row">
              <span class="detail-label">📚 Bölüm:</span>
              <span class="detail-value">${student.department}</span>
            </div>
            ` : ''}
            
            ${!isForStudent && student.year ? `
            <div class="detail-row">
              <span class="detail-label">🎓 Sınıf:</span>
              <span class="detail-value">${student.year}</span>
            </div>
            ` : ''}
          </div>
          
          ${appointment.message ? `
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <strong>💬 ${isForStudent ? 'Mesajınız:' : 'Öğrenci Mesajı:'}</strong><br>
            ${appointment.message}
          </div>
          ` : ''}
          
          ${type === 'appointment_rescheduled' && appointment.rescheduled_date ? `
          <div class="reschedule-info">
            <h4 style="margin-top: 0; color: #856404;">📅 Yeni Randevu Zamanı</h4>
            <p><strong>Tarih:</strong> ${formatDate(appointment.rescheduled_date)}</p>
            <p><strong>Saat:</strong> ${appointment.rescheduled_start_time} - ${appointment.rescheduled_end_time}</p>
            ${appointment.reschedule_reason ? `<p><strong>Erteleme Nedeni:</strong> ${appointment.reschedule_reason}</p>` : ''}
          </div>
          ` : ''}
          
          <div class="action-text">
            ${actionText}
          </div>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="https://sparkly-macaron-fe2a34.netlify.app/${isForStudent ? 'randevularim' : 'ogretim-elemani/randevu-talepleri'}" class="button">
              📋 ${isForStudent ? 'Randevularımı Görüntüle' : 'Randevu Taleplerini Görüntüle'}
            </a>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Edulink - Sakarya Üniversitesi İşletme Fakültesi</strong></p>
          <p>Esentepe Kampüsü, 54187 Serdivan/Sakarya</p>
          <p><a href="https://islf.sakarya.edu.tr">islf.sakarya.edu.tr</a> | (0264) 295 71 29</p>
          <p style="margin-top: 15px; font-size: 12px; opacity: 0.8;">
            Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.<br>
            © ${new Date().getFullYear()} Sakarya Üniversitesi. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

async function sendEmailWithResend(to: string, subject: string, html: string): Promise<boolean> {
  try {
    console.log('📧 Resend API ile e-posta gönderiliyor:', to);

    if (!RESEND_API_KEY || RESEND_API_KEY === 're_demo_key_for_testing') {
      console.log('⚠️ Resend API key bulunamadı, simülasyon modu');
      return true; // Simülasyon modu
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SAU İşletme Fakültesi <noreply@yourdomain.com>',
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

async function logEmailAttempt(data: EmailNotificationData, recipient: string, success: boolean, error?: string) {
  try {
    await supabase
      .from('debug_logs')
      .insert({
        function_name: 'send-edulink-notification',
        message: success ? 'E-posta başarıyla gönderildi' : 'E-posta gönderimi başarısız',
        details: {
          type: data.type,
          appointment_id: data.appointment.id,
          recipient,
          success,
          error,
          timestamp: new Date().toISOString(),
          resend_api_configured: !!(RESEND_API_KEY && RESEND_API_KEY !== 're_demo_key_for_testing'),
          mode: 'resend_api'
        }
      });
  } catch (logError) {
    console.error('Logging error:', logError);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

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
    console.log('=== EDULINK E-POSTA NOTIFICATION BAŞLADI ===');
    
    const requestBody = await req.text();
    console.log('Request body:', requestBody);
    
    const data: EmailNotificationData = JSON.parse(requestBody);
    
    if (!data || !data.type || !data.appointment || !data.student || !data.lecturer) {
      throw new Error('Eksik e-posta verisi');
    }

    console.log('E-posta bildirimi:', data.type, 'Randevu ID:', data.appointment.id);

    // Öğrenciye e-posta gönder
    const studentEmailContent = getEmailContent(data, true);
    const studentEmailSuccess = await sendEmailWithResend(
      data.student.email,
      studentEmailContent.subject,
      studentEmailContent.html
    );

    // Akademisyene e-posta gönder
    const lecturerEmailContent = getEmailContent(data, false);
    const lecturerEmailSuccess = await sendEmailWithResend(
      data.lecturer.email,
      lecturerEmailContent.subject,
      lecturerEmailContent.html
    );

    // Log both attempts
    await logEmailAttempt(data, data.student.email, studentEmailSuccess);
    await logEmailAttempt(data, data.lecturer.email, lecturerEmailSuccess);

    console.log('=== EDULINK E-POSTA NOTIFICATION TAMAMLANDI ===');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'E-posta bildirimleri gönderildi',
        student_email_sent: studentEmailSuccess,
        lecturer_email_sent: lecturerEmailSuccess,
        type: data.type,
        mode: 'resend_api'
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );

  } catch (error) {
    console.error('E-posta bildirim hatası:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
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