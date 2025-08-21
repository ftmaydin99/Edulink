/*
  # E-posta Trigger Kurulumu

  1. Extensions
    - pg_net extension'ını etkinleştirir (HTTP istekleri için)
  
  2. Functions
    - trigger_appointment_email: Randevu oluşturulduğunda e-posta gönderir
  
  3. Triggers
    - appointment_email_notification: INSERT sonrası otomatik çalışır
*/

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to trigger email sending
CREATE OR REPLACE FUNCTION trigger_appointment_email()
RETURNS TRIGGER AS $$
DECLARE
  lecturer_email TEXT;
  lecturer_name TEXT;
  student_name TEXT;
  student_email TEXT;
  faculty_name TEXT;
  department_name TEXT;
  site_url TEXT := 'https://sparkly-macaron-fe2a34.netlify.app';
BEGIN
  -- Get lecturer information
  SELECT l.email, l.name 
  INTO lecturer_email, lecturer_name
  FROM lecturers l 
  WHERE l.id = NEW.lecturer_id;

  -- Get student information
  SELECT s.name, s.email
  INTO student_name, student_email
  FROM students s 
  WHERE s.id = NEW.student_id;

  -- Get faculty and department names
  SELECT f.name 
  INTO faculty_name
  FROM faculties f 
  WHERE f.id = NEW.student_faculty;

  SELECT d.name 
  INTO department_name
  FROM departments d 
  WHERE d.id = NEW.student_department;

  -- Log the email trigger
  INSERT INTO debug_logs (function_name, message, details)
  VALUES (
    'trigger_appointment_email',
    'Email trigger activated',
    jsonb_build_object(
      'appointment_id', NEW.id,
      'student_email', student_email,
      'lecturer_email', lecturer_email,
      'date', NEW.date,
      'time', NEW.start_time
    )
  );

  -- Call the edge function to send emails
  PERFORM net.http_post(
    url := site_url || '/functions/v1/send-appointment-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'appointment_id', NEW.id,
      'student_name', student_name,
      'student_email', student_email,
      'lecturer_name', lecturer_name,
      'lecturer_email', lecturer_email,
      'faculty_name', faculty_name,
      'department_name', department_name,
      'date', NEW.date,
      'start_time', NEW.start_time,
      'end_time', NEW.end_time,
      'subject', NEW.subject,
      'message', NEW.message,
      'site_url', site_url
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log any errors
    INSERT INTO debug_logs (function_name, message, details)
    VALUES (
      'trigger_appointment_email',
      'Error in email trigger: ' || SQLERRM,
      jsonb_build_object(
        'appointment_id', NEW.id,
        'error', SQLERRM
      )
    );
    
    -- Don't fail the appointment creation if email fails
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for appointment email notifications
DROP TRIGGER IF EXISTS appointment_email_notification ON appointments;
CREATE TRIGGER appointment_email_notification
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_appointment_email();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA net TO postgres, anon, authenticated, service_role;