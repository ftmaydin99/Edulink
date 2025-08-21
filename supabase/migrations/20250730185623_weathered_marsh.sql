-- E-posta sistemini yeniden oluştur

-- 1. Eski trigger'ları sil
DROP TRIGGER IF EXISTS appointment_email_trigger ON appointments;
DROP TRIGGER IF EXISTS update_appointment_student_info ON appointments;

-- 2. Eski fonksiyonları sil
DROP FUNCTION IF EXISTS send_appointment_email();
DROP FUNCTION IF EXISTS update_appointment_student_info();

-- 3. Yeni fonksiyon oluştur
CREATE OR REPLACE FUNCTION send_appointment_email()
RETURNS TRIGGER AS $$
DECLARE
  lecturer_data RECORD;
  student_data RECORD;
  email_payload JSONB;
BEGIN
  -- Debug log ekle
  INSERT INTO debug_logs (function_name, message, details)
  VALUES (
    'send_appointment_email_trigger',
    'Trigger çalıştı',
    jsonb_build_object(
      'appointment_id', NEW.id,
      'student_id', NEW.student_id,
      'lecturer_id', NEW.lecturer_id,
      'trigger_event', TG_OP,
      'timestamp', NOW()
    )
  );

  -- Sadece yeni randevu oluşturulduğunda e-posta gönder
  IF TG_OP = 'INSERT' THEN
    -- Akademisyen bilgilerini al
    SELECT name, email INTO lecturer_data
    FROM lecturers 
    WHERE id = NEW.lecturer_id;

    -- Öğrenci bilgilerini al
    SELECT name, email INTO student_data
    FROM students 
    WHERE id = NEW.student_id;

    -- E-posta payload'ı hazırla
    email_payload := jsonb_build_object(
      'student_name', COALESCE(NEW.student_name, student_data.name),
      'student_email', COALESCE(NEW.student_email, student_data.email),
      'lecturer_name', lecturer_data.name,
      'lecturer_email', lecturer_data.email,
      'date', NEW.date,
      'start_time', NEW.start_time,
      'end_time', NEW.end_time,
      'subject', NEW.subject,
      'message', NEW.message,
      'student_faculty', NEW.student_faculty,
      'student_department', NEW.student_department,
      'student_year', NEW.student_year
    );

    -- Debug log ekle
    INSERT INTO debug_logs (function_name, message, details)
    VALUES (
      'send_appointment_email_payload',
      'E-posta payload hazırlandı',
      jsonb_build_object(
        'payload', email_payload,
        'lecturer_found', lecturer_data IS NOT NULL,
        'student_found', student_data IS NOT NULL
      )
    );

    -- Edge Function'ı çağır
    BEGIN
      PERFORM
        net.http_post(
          url := 'https://btecrzscstuguecgbsux.supabase.co/functions/v1/send-appointment-email',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0ZWNyenNjc3R1Z3VlY2dic3V4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzAzNzI5NCwiZXhwIjoyMDUyNjEzMjk0fQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'
          ),
          body := jsonb_build_object('emailData', email_payload)
        );

      -- Başarı log'u
      INSERT INTO debug_logs (function_name, message, details)
      VALUES (
        'send_appointment_email_success',
        'Edge Function çağrıldı',
        jsonb_build_object(
          'appointment_id', NEW.id,
          'timestamp', NOW()
        )
      );

    EXCEPTION WHEN OTHERS THEN
      -- Hata log'u
      INSERT INTO debug_logs (function_name, message, details)
      VALUES (
        'send_appointment_email_error',
        'Edge Function çağrısında hata: ' || SQLERRM,
        jsonb_build_object(
          'appointment_id', NEW.id,
          'error', SQLERRM,
          'timestamp', NOW()
        )
      );
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger'ı oluştur
CREATE TRIGGER appointment_email_trigger
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION send_appointment_email();

-- 5. Test log'u ekle
INSERT INTO debug_logs (function_name, message, details)
VALUES (
  'email_system_recreated',
  'E-posta sistemi yeniden oluşturuldu',
  jsonb_build_object(
    'timestamp', NOW(),
    'version', '2.0'
  )
);