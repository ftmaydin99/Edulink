-- Trigger'ı güncelle - Edge Function çağırsın
CREATE OR REPLACE FUNCTION send_appointment_email()
RETURNS TRIGGER AS $$
DECLARE
  lecturer_data RECORD;
  student_data RECORD;
  faculty_name TEXT;
  department_name TEXT;
  email_payload JSONB;
  http_response RECORD;
BEGIN
  -- Akademisyen bilgilerini al
  SELECT name, email INTO lecturer_data
  FROM lecturers 
  WHERE id = NEW.lecturer_id;
  
  -- Öğrenci bilgilerini al
  SELECT name, email INTO student_data
  FROM students 
  WHERE id = NEW.student_id;
  
  -- Fakülte adını al
  SELECT name INTO faculty_name
  FROM faculties 
  WHERE id = (SELECT faculty_id FROM students WHERE id = NEW.student_id);
  
  -- Bölüm adını al
  SELECT name INTO department_name
  FROM departments 
  WHERE id = (SELECT department_id FROM students WHERE id = NEW.student_id);

  -- E-posta payload'ını hazırla
  email_payload := jsonb_build_object(
    'emailData', jsonb_build_object(
      'student_name', student_data.name,
      'student_email', student_data.email,
      'lecturer_name', lecturer_data.name,
      'lecturer_email', lecturer_data.email,
      'date', NEW.date,
      'start_time', NEW.start_time,
      'end_time', NEW.end_time,
      'subject', NEW.subject,
      'message', NEW.message,
      'student_faculty', COALESCE(faculty_name, 'Belirtilmemiş'),
      'student_department', COALESCE(department_name, 'Belirtilmemiş'),
      'student_year', COALESCE(NEW.student_year, 'Belirtilmemiş')
    )
  );

  -- Edge Function'ı çağır
  SELECT * INTO http_response
  FROM http((
    'POST',
    current_setting('app.supabase_url') || '/functions/v1/send-appointment-email',
    ARRAY[
      http_header('Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')),
      http_header('Content-Type', 'application/json')
    ],
    'application/json',
    email_payload::text
  )::http_request);

  -- Debug log ekle
  INSERT INTO debug_logs (function_name, message, details)
  VALUES (
    'send_appointment_email_trigger',
    'Trigger çalıştı ve Edge Function çağrıldı',
    jsonb_build_object(
      'appointment_id', NEW.id,
      'student_email', student_data.email,
      'lecturer_email', lecturer_data.email,
      'http_status', http_response.status,
      'http_response', http_response.content,
      'trigger_event', TG_OP,
      'timestamp', NOW()
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Hata durumunda da log ekle
    INSERT INTO debug_logs (function_name, message, details)
    VALUES (
      'send_appointment_email_trigger',
      'Trigger hatası',
      jsonb_build_object(
        'appointment_id', NEW.id,
        'error', SQLERRM,
        'timestamp', NOW()
      )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- HTTP extension'ını etkinleştir
CREATE EXTENSION IF NOT EXISTS http;

-- Supabase ayarlarını set et (bu değerleri gerçek değerlerle değiştirin)
-- Bu ayarlar session bazında olduğu için her trigger çalışmasında set edilmeli
-- Alternatif olarak bu değerleri doğrudan kod içinde kullanabilirsiniz