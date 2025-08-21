/*
  # E-posta Bildirim Sistemi Kurulumu

  1. Trigger Functions
    - Randevu eklendikinde otomatik e-posta gönderimi
    - E-posta gönderim durumu loglama

  2. Security
    - Edge function çağrısı için gerekli izinler
    - Trigger güvenlik ayarları
*/

-- E-posta gönderimi için trigger function
CREATE OR REPLACE FUNCTION trigger_appointment_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Edge function'ı çağır (webhook tarzı)
  PERFORM
    net.http_post(
      url := 'https://your-project-ref.supabase.co/functions/v1/send-appointment-email',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
      body := json_build_object('record', row_to_json(NEW))::text
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Appointments tablosuna trigger ekle
DROP TRIGGER IF EXISTS appointment_email_notification ON appointments;
CREATE TRIGGER appointment_email_notification
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_appointment_email();

-- Trigger açıklaması ekle
COMMENT ON TRIGGER appointment_email_notification ON appointments IS 'Yeni randevu eklendiğinde öğrenci ve akademisyene e-posta gönderir';