/*
  # Webhook Tabanlı E-posta Sistemi Düzeltmesi

  1. Webhook URL'i düzeltme
  2. HTTP request formatını düzeltme
  3. Hata yönetimini iyileştirme
  4. Debug loglarını artırma
*/

-- Önce mevcut trigger'ı kaldır
DROP TRIGGER IF EXISTS appointment_email_notification ON appointments;
DROP FUNCTION IF EXISTS trigger_appointment_email();

-- Yeni webhook tabanlı function
CREATE OR REPLACE FUNCTION trigger_appointment_email()
RETURNS TRIGGER AS $$
DECLARE
    webhook_url TEXT;
    payload JSONB;
    response_status INTEGER;
    response_body TEXT;
BEGIN
    -- Debug log
    INSERT INTO debug_logs (function_name, message, details)
    VALUES ('trigger_appointment_email', 'Trigger başladı', jsonb_build_object('appointment_id', NEW.id));

    -- Webhook URL'i oluştur
    webhook_url := 'https://btecrzscstuguecgbsux.supabase.co/functions/v1/send-appointment-email';
    
    -- Payload hazırla
    payload := jsonb_build_object(
        'record', jsonb_build_object(
            'id', NEW.id,
            'student_name', NEW.student_name,
            'student_email', NEW.student_email,
            'lecturer_id', NEW.lecturer_id,
            'date', NEW.date,
            'start_time', NEW.start_time,
            'end_time', NEW.end_time,
            'subject', NEW.subject,
            'message', NEW.message,
            'student_faculty', NEW.student_faculty,
            'student_department', NEW.student_department,
            'student_year', NEW.student_year
        )
    );

    -- Debug log - payload
    INSERT INTO debug_logs (function_name, message, details)
    VALUES ('trigger_appointment_email', 'Payload hazırlandı', payload);

    BEGIN
        -- HTTP POST isteği gönder
        SELECT status, content INTO response_status, response_body
        FROM net.http_post(
            url := webhook_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
            ),
            body := payload
        );

        -- Debug log - response
        INSERT INTO debug_logs (function_name, message, details)
        VALUES ('trigger_appointment_email', 'HTTP response alındı', 
                jsonb_build_object('status', response_status, 'body', response_body));

        -- Başarılı ise notification_sent'i güncelle
        IF response_status BETWEEN 200 AND 299 THEN
            UPDATE appointments 
            SET notification_sent = true 
            WHERE id = NEW.id;
            
            INSERT INTO debug_logs (function_name, message, details)
            VALUES ('trigger_appointment_email', 'E-posta başarıyla gönderildi', 
                    jsonb_build_object('appointment_id', NEW.id));
        ELSE
            INSERT INTO debug_logs (function_name, message, details)
            VALUES ('trigger_appointment_email', 'E-posta gönderimi başarısız', 
                    jsonb_build_object('status', response_status, 'body', response_body));
        END IF;

    EXCEPTION WHEN OTHERS THEN
        -- Hata durumunda log
        INSERT INTO debug_logs (function_name, message, details)
        VALUES ('trigger_appointment_email', 'HTTP request hatası', 
                jsonb_build_object('error', SQLERRM, 'sqlstate', SQLSTATE));
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı yeniden oluştur
CREATE TRIGGER appointment_email_notification
    AFTER INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_appointment_email();

-- Service role key'i ayarla (gerçek key ile değiştirin)
-- Bu komutu gerçek service role key ile çalıştırın:
-- SELECT set_config('app.settings.service_role_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', false);

-- Test için debug loglarını temizle
DELETE FROM debug_logs WHERE function_name = 'trigger_appointment_email';

-- Debug: Mevcut ayarları kontrol et
INSERT INTO debug_logs (function_name, message, details)
VALUES ('system_check', 'Sistem durumu', 
        jsonb_build_object(
            'pg_net_available', (SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_net')),
            'service_key_set', (current_setting('app.settings.service_role_key', true) IS NOT NULL)
        ));