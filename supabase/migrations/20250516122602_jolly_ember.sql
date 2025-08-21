/*
  # Fix appointment status trigger
  
  1. Changes
    - Drop existing trigger and function
    - Create new trigger function with proper error handling
    - Add better logging
    - Fix appointment status updates
    
  2. Security
    - Maintain existing RLS policies
*/

-- Mevcut trigger ve fonksiyonları temizle
DROP TRIGGER IF EXISTS appointment_status_change ON appointments;
DROP FUNCTION IF EXISTS handle_appointment_status_change();

-- Yeni trigger fonksiyonu
CREATE OR REPLACE FUNCTION handle_appointment_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Mevcut kullanıcı ID'sini al
  v_user_id := auth.uid();
  
  -- Kullanıcı kontrolü
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized operation';
  END IF;

  -- Log the status change
  INSERT INTO debug_logs (function_name, message, details)
  VALUES (
    'handle_appointment_status_change',
    'Processing status change',
    jsonb_build_object(
      'appointment_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'user_id', v_user_id
    )
  );

  -- Randevu onaylandığında
  IF NEW.status = 'onaylandı' AND OLD.status = 'bekliyor' THEN
    -- Onaylanan randevular tablosuna ekle
    INSERT INTO approved_appointments (
      appointment_id, student_id, lecturer_id, date, start_time, end_time,
      subject, message, student_name, student_email, student_faculty,
      student_department, student_year, approved_by
    )
    VALUES (
      NEW.id, NEW.student_id, NEW.lecturer_id, NEW.date, NEW.start_time, NEW.end_time,
      NEW.subject, NEW.message, NEW.student_name, NEW.student_email, NEW.student_faculty,
      NEW.student_department, NEW.student_year, v_user_id
    );

    -- Log successful approval
    INSERT INTO debug_logs (function_name, message, details)
    VALUES (
      'handle_appointment_status_change',
      'Appointment approved successfully',
      jsonb_build_object(
        'appointment_id', NEW.id,
        'approved_by', v_user_id
      )
    );
  END IF;

  -- Randevu iptal edildiğinde
  IF NEW.status = 'iptal' AND OLD.status = 'bekliyor' THEN
    -- İptal edilen randevular tablosuna ekle
    INSERT INTO cancelled_appointments (
      appointment_id, student_id, lecturer_id, date, start_time, end_time,
      subject, message, student_name, student_email, student_faculty,
      student_department, student_year, cancelled_by
    )
    VALUES (
      NEW.id, NEW.student_id, NEW.lecturer_id, NEW.date, NEW.start_time, NEW.end_time,
      NEW.subject, NEW.message, NEW.student_name, NEW.student_email, NEW.student_faculty,
      NEW.student_department, NEW.student_year, v_user_id
    );

    -- Log successful cancellation
    INSERT INTO debug_logs (function_name, message, details)
    VALUES (
      'handle_appointment_status_change',
      'Appointment cancelled successfully',
      jsonb_build_object(
        'appointment_id', NEW.id,
        'cancelled_by', v_user_id
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error
    INSERT INTO debug_logs (function_name, message, details)
    VALUES (
      'handle_appointment_status_change',
      'Error occurred',
      jsonb_build_object(
        'error', SQLERRM,
        'appointment_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı yeniden oluştur
CREATE TRIGGER appointment_status_change
  AFTER UPDATE ON appointments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION handle_appointment_status_change();