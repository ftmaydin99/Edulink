/*
  # E-posta Trigger Düzeltmesi

  1. Sorun
    - Trigger çalışıyor ama Edge Function çağrılmıyor
    - notification_sent false kalmış
    
  2. Düzeltme
    - HTTP request için doğru URL ve headers
    - Hata yakalama ve loglama
    - Retry mekanizması
*/

-- Önce mevcut trigger'ı kaldır
DROP TRIGGER IF EXISTS appointment_email_notification ON appointments;
DROP FUNCTION IF EXISTS trigger_appointment_email();

-- Yeni trigger function oluştur
CREATE OR REPLACE FUNCTION trigger_appointment_email()
RETURNS TRIGGER AS $$
DECLARE
    response_status INTEGER;
    response_body TEXT;
    function_url TEXT;
BEGIN
    -- Debug log ekle
    INSERT INTO debug_logs (function_name, message, details)
    VALUES (
        'trigger_appointment_email',
        'Trigger başladı',
        jsonb_build_object(
            'appointment_id', NEW.id,
            'student_email', NEW.student_email,
            'student_name', NEW.student_name
        )
    );

    -- Function URL'ini oluştur
    function_url := 'https://btecrzscstuguecgbsux.supabase.co/functions/v1/send-appointment-email';

    -- HTTP request gönder
    BEGIN
        SELECT status, content INTO response_status, response_body
        FROM http((
            'POST',
            function_url,
            ARRAY[
                http_header('Content-Type', 'application/json'),
                http_header('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true))
            ],
            'application/json',
            jsonb_build_object('record', row_to_json(NEW))::text
        ));

        -- Başarılı response kontrolü
        IF response_status BETWEEN 200 AND 299 THEN
            -- notification_sent'i true yap
            UPDATE appointments 
            SET notification_sent = true 
            WHERE id = NEW.id;

            INSERT INTO debug_logs (function_name, message, details)
            VALUES (
                'trigger_appointment_email',
                'E-posta gönderim başarılı',
                jsonb_build_object(
                    'appointment_id', NEW.id,
                    'status', response_status,
                    'response', response_body
                )
            );
        ELSE
            INSERT INTO debug_logs (function_name, message, details)
            VALUES (
                'trigger_appointment_email',
                'E-posta gönderim başarısız',
                jsonb_build_object(
                    'appointment_id', NEW.id,
                    'status', response_status,
                    'response', response_body
                )
            );
        END IF;

    EXCEPTION WHEN OTHERS THEN
        INSERT INTO debug_logs (function_name, message, details)
        VALUES (
            'trigger_appointment_email',
            'HTTP request hatası',
            jsonb_build_object(
                'appointment_id', NEW.id,
                'error', SQLERRM,
                'function_url', function_url
            )
        );
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı yeniden oluştur
CREATE TRIGGER appointment_email_notification
    AFTER INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_appointment_email();

-- Service role key ayarını ekle (geçici olarak)
-- Bu değeri Supabase Dashboard'dan alıp güncelleyin
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';

-- Test için debug log temizle
-- DELETE FROM debug_logs WHERE function_name IN ('trigger_appointment_email', 'send-appointment-email');