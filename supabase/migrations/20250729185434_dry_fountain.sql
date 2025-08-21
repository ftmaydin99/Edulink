/*
  # Debug logs RLS politikasını düzelt
  
  1. Güvenlik
    - Debug logs tablosuna yazma izni ver
    - Trigger'ların çalışabilmesi için gerekli
  
  2. Değişiklikler
    - RLS politikasını güncelle
    - INSERT izni ekle
*/

-- Debug logs tablosu için RLS politikasını güncelle
DROP POLICY IF EXISTS "Only authenticated users can view debug logs" ON debug_logs;

-- Yeni politikalar oluştur
CREATE POLICY "Anyone can insert debug logs"
  ON debug_logs
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view debug logs"
  ON debug_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Trigger function'ı güvenlik bağlamında çalıştır
CREATE OR REPLACE FUNCTION send_appointment_email()
RETURNS TRIGGER 
SECURITY DEFINER -- Bu önemli: function'ı owner olarak çalıştır
AS $$
DECLARE
  lecturer_data RECORD;
  student_data RECORD;
  faculty_name TEXT;
  department_name TEXT;
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

  -- Debug log ekle (artık çalışacak)
  INSERT INTO debug_logs (function_name, message, details)
  VALUES (
    'send_appointment_email_trigger',
    'Trigger başarıyla çalıştı',
    jsonb_build_object(
      'appointment_id', NEW.id,
      'student_email', student_data.email,
      'lecturer_email', lecturer_data.email,
      'faculty_name', faculty_name,
      'department_name', department_name,
      'appointment_date', NEW.date,
      'appointment_time', NEW.start_time,
      'trigger_event', TG_OP,
      'timestamp', NOW()
    )
  );

  -- Edge function'ı çağır (e-posta gönderimi için)
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-edulink-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
    ),
    body := jsonb_build_object(
      'type', 'appointment_created',
      'appointment', jsonb_build_object(
        'id', NEW.id,
        'date', NEW.date,
        'start_time', NEW.start_time,
        'end_time', NEW.end_time,
        'subject', NEW.subject,
        'message', NEW.message,
        'status', NEW.status
      ),
      'student', jsonb_build_object(
        'name', student_data.name,
        'email', student_data.email,
        'faculty', faculty_name,
        'department', department_name,
        'year', (SELECT year FROM students WHERE id = NEW.student_id)
      ),
      'lecturer', jsonb_build_object(
        'name', lecturer_data.name,
        'email', lecturer_data.email,
        'title', (SELECT title FROM lecturers WHERE id = NEW.lecturer_id)
      )
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Hata durumunda da log ekle
    INSERT INTO debug_logs (function_name, message, details)
    VALUES (
      'send_appointment_email_trigger_error',
      'Trigger hatası: ' || SQLERRM,
      jsonb_build_object(
        'appointment_id', NEW.id,
        'error_message', SQLERRM,
        'error_state', SQLSTATE,
        'timestamp', NOW()
      )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;