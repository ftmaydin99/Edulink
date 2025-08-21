/*
  # Randevu erteleme nedeni saklama sistemi
  
  1. Değişiklikler
    - appointments tablosuna reschedule_reason sütunu zaten mevcut
    - Trigger fonksiyonunu güncelle erteleme nedenini saklamak için
    - RLS politikalarını koru
    
  2. Güvenlik
    - Mevcut RLS politikaları korunuyor
    - Sadece öğretim görevlileri erteleme nedeni ekleyebilir
*/

-- Trigger fonksiyonunu güncelle erteleme nedenini saklamak için
CREATE OR REPLACE FUNCTION handle_appointment_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_is_lecturer boolean;
  v_message_content text;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- User validation
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized operation';
  END IF;

  -- Check if user is a lecturer
  SELECT EXISTS (
    SELECT 1 FROM lecturers WHERE id = v_user_id
  ) INTO v_is_lecturer;

  -- Set processed_by based on user type
  IF v_is_lecturer THEN
    NEW.processed_by := v_user_id; -- Only for lecturers
  ELSE
    NEW.processed_by := NULL;      -- For students
  END IF;

  NEW.processed_at := CURRENT_TIMESTAMP;

  -- Handle cancellation messages
  IF NEW.status = 'iptal' THEN
    -- Insert cancellation message
    IF v_is_lecturer THEN
      -- Lecturer cancelling appointment
      v_message_content := format(
        'Randevunuz öğretim görevlisi tarafından iptal edilmiştir.%sTarih: %s%sSaat: %s%sİptal Nedeni: %s',
        E'\n',
        NEW.date,
        E'\n',
        NEW.start_time,
        E'\n',
        COALESCE(NEW.reschedule_reason, 'Belirtilmemiş')
      );
      
      INSERT INTO messages (
        from_lecturer_id,
        to_student_id,
        content,
        appointment_id
      )
      VALUES (
        v_user_id,
        NEW.student_id,
        v_message_content,
        NEW.id
      );
    ELSE
      -- Student cancelling appointment
      v_message_content := format(
        'Öğrenci randevuyu iptal etti.%sTarih: %s%sSaat: %s%sİptal Nedeni: %s',
        E'\n',
        NEW.date,
        E'\n',
        NEW.start_time,
        E'\n',
        COALESCE(NEW.reschedule_reason, 'Belirtilmemiş')
      );
      
      INSERT INTO messages (
        from_student_id,
        to_lecturer_id,
        content,
        appointment_id
      )
      VALUES (
        v_user_id,
        NEW.lecturer_id,
        v_message_content,
        NEW.id
      );
    END IF;
  END IF;

  -- Handle reschedule requests (awaiting_student_approval status)
  IF NEW.status = 'awaiting_student_approval' THEN
    -- Send reschedule request message to student
    v_message_content := format(
      'Randevunuz ertelenmiştir ve onayınız bekleniyor.%sEski Tarih: %s - %s%sYeni Tarih: %s - %s%sErteleme Nedeni: %s',
      E'\n',
      NEW.date,
      NEW.start_time,
      E'\n',
      COALESCE(NEW.rescheduled_date::text, 'Belirtilmemiş'),
      COALESCE(NEW.rescheduled_start_time::text, 'Belirtilmemiş'),
      E'\n',
      COALESCE(NEW.reschedule_reason, 'Belirtilmemiş')
    );
    
    INSERT INTO messages (
      from_lecturer_id,
      to_student_id,
      content,
      appointment_id
    )
    VALUES (
      v_user_id,
      NEW.student_id,
      v_message_content,
      NEW.id
    );
  END IF;

  -- Log the status change
  INSERT INTO debug_logs (function_name, message, details)
  VALUES (
    'handle_appointment_status_change',
    'Status changed successfully',
    jsonb_build_object(
      'appointment_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'user_id', v_user_id,
      'is_lecturer', v_is_lecturer,
      'reschedule_reason', NEW.reschedule_reason
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;