/*
  # E-posta Sistemi Debug ve Test

  1. Debug Logs
    - E-posta gönderim durumlarını takip etmek için
    - Hata durumlarını loglamak için

  2. Test Function
    - E-posta sistemini test etmek için
    - Manuel trigger çalıştırmak için
*/

-- Debug logs tablosu zaten var, sadece kontrol edelim
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debug_logs') THEN
    CREATE TABLE debug_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz DEFAULT now(),
      function_name text,
      message text,
      details jsonb
    );
    
    ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Only authenticated users can view debug logs"
      ON debug_logs
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- E-posta trigger'ını yeniden oluştur
DROP TRIGGER IF EXISTS appointment_email_notification ON appointments;
DROP FUNCTION IF EXISTS trigger_appointment_email();

CREATE OR REPLACE FUNCTION trigger_appointment_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Debug log ekle
  INSERT INTO debug_logs (function_name, message, details)
  VALUES (
    'trigger_appointment_email',
    'Trigger çalıştı',
    jsonb_build_object(
      'appointment_id', NEW.id,
      'student_id', NEW.student_id,
      'lecturer_id', NEW.lecturer_id,
      'status', NEW.status
    )
  );

  -- Edge function'ı çağır
  PERFORM
    net.http_post(
      url := 'https://btecrzscstuguecgbsux.supabase.co/functions/v1/send-appointment-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('record', to_jsonb(NEW))
    );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Hata durumunda da log ekle
  INSERT INTO debug_logs (function_name, message, details)
  VALUES (
    'trigger_appointment_email',
    'Trigger hatası: ' || SQLERRM,
    jsonb_build_object(
      'appointment_id', NEW.id,
      'error', SQLERRM
    )
  );
  
  -- Hata olsa bile randevu oluşturulsun
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı oluştur
CREATE TRIGGER appointment_email_notification
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_appointment_email();

-- Test function'ı
CREATE OR REPLACE FUNCTION test_email_system(appointment_id_param uuid)
RETURNS jsonb AS $$
DECLARE
  appointment_record appointments%ROWTYPE;
  result jsonb;
BEGIN
  -- Randevu kaydını getir
  SELECT * INTO appointment_record
  FROM appointments
  WHERE id = appointment_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Randevu bulunamadı');
  END IF;
  
  -- E-posta trigger'ını manuel çalıştır
  PERFORM trigger_appointment_email() FROM (SELECT appointment_record.*) AS t;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'E-posta sistemi test edildi',
    'appointment_id', appointment_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;