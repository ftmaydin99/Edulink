/*
  # Randevu onaylama sistemini düzelt
  
  1. Değişiklikler
    - Trigger fonksiyonunu güncelle
    - Onaylanan ve iptal edilen randevular için indeksler ekle
    - RLS politikalarını güncelle
*/

-- Mevcut trigger'ları kaldır
DROP TRIGGER IF EXISTS appointment_status_change ON appointments;
DROP TRIGGER IF EXISTS appointment_status_update ON appointments;
DROP FUNCTION IF EXISTS handle_appointment_status_change();
DROP FUNCTION IF EXISTS update_appointment_status();

-- Yeni trigger fonksiyonu
CREATE OR REPLACE FUNCTION handle_appointment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Randevu onaylandığında
  IF NEW.status = 'onaylandı' THEN
    INSERT INTO approved_appointments (
      appointment_id, student_id, lecturer_id, date, start_time, end_time,
      subject, message, student_name, student_email, student_faculty,
      student_department, student_year, approved_by
    )
    VALUES (
      NEW.id, NEW.student_id, NEW.lecturer_id, NEW.date, NEW.start_time, NEW.end_time,
      NEW.subject, NEW.message, NEW.student_name, NEW.student_email, NEW.student_faculty,
      NEW.student_department, NEW.student_year, auth.uid()
    );
  END IF;

  -- Randevu iptal edildiğinde
  IF NEW.status = 'iptal' THEN
    INSERT INTO cancelled_appointments (
      appointment_id, student_id, lecturer_id, date, start_time, end_time,
      subject, message, student_name, student_email, student_faculty,
      student_department, student_year, cancelled_by
    )
    VALUES (
      NEW.id, NEW.student_id, NEW.lecturer_id, NEW.date, NEW.start_time, NEW.end_time,
      NEW.subject, NEW.message, NEW.student_name, NEW.student_email, NEW.student_faculty,
      NEW.student_department, NEW.student_year, auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Yeni trigger oluştur
CREATE TRIGGER appointment_status_change
  AFTER UPDATE ON appointments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION handle_appointment_status_change();

-- İndeksler ekle
CREATE INDEX IF NOT EXISTS idx_approved_appointments_lecturer_id ON approved_appointments(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_cancelled_appointments_lecturer_id ON cancelled_appointments(lecturer_id);

-- RLS politikalarını güncelle
DROP POLICY IF EXISTS "Lecturers can view their approved appointments" ON approved_appointments;
DROP POLICY IF EXISTS "Lecturers can view their cancelled appointments" ON cancelled_appointments;

CREATE POLICY "Lecturers can view their approved appointments"
ON approved_appointments FOR SELECT
TO authenticated
USING (auth.uid()::uuid = lecturer_id);

CREATE POLICY "Lecturers can view their cancelled appointments"
ON cancelled_appointments FOR SELECT
TO authenticated
USING (auth.uid()::uuid = lecturer_id);