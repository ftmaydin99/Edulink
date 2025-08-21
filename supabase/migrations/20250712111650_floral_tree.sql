/*
  # Randevu E-posta Bildirimi Trigger'ı

  1. Trigger Function
    - Yeni randevu eklendiğinde otomatik e-posta gönderir
    - Edge function'ı çağırır

  2. Trigger
    - appointments tablosuna INSERT sonrası çalışır
    - Sadece yeni randevular için tetiklenir
*/

-- Trigger function oluştur
CREATE OR REPLACE FUNCTION trigger_appointment_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Edge function'ı asenkron olarak çağır
  PERFORM
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-appointment-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'record', to_jsonb(NEW)
      )
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger oluştur
DROP TRIGGER IF EXISTS appointment_email_notification ON appointments;

CREATE TRIGGER appointment_email_notification
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_appointment_email();

-- Trigger'ın sadece yeni randevular için çalışmasını sağla
COMMENT ON TRIGGER appointment_email_notification ON appointments IS 
'Yeni randevu eklendiğinde öğrenci ve akademisyene e-posta gönderir';