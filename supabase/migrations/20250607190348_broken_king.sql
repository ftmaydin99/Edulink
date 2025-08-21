/*
  # Devam randevusu sistemi
  
  1. Yeni Sütunlar
    - `is_follow_up`: Bu bir devam randevusu mu?
    - `created_by_faculty`: Hoca tarafından mı oluşturulmuş?
    - `related_to_appointment_id`: Önceki randevuya referans
    
  2. Güvenlik
    - Mevcut RLS politikaları korunuyor
    - Yeni sütunlar için uygun kısıtlamalar ekleniyor
*/

-- Yeni sütunları ekle
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS is_follow_up boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS created_by_faculty boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS related_to_appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL;

-- İndeks ekle
CREATE INDEX IF NOT EXISTS idx_appointments_follow_up ON appointments(is_follow_up);
CREATE INDEX IF NOT EXISTS idx_appointments_created_by_faculty ON appointments(created_by_faculty);
CREATE INDEX IF NOT EXISTS idx_appointments_related_to ON appointments(related_to_appointment_id);

-- Öğretim görevlilerinin randevu oluşturabilmesi için politika güncelle
DROP POLICY IF EXISTS "Lecturers can update their appointments" ON appointments;

CREATE POLICY "Lecturers can update their appointments"
ON appointments FOR UPDATE
TO public
USING (lecturer_id = auth.uid())
WITH CHECK (lecturer_id = auth.uid());

-- Öğretim görevlilerinin randevu oluşturabilmesi için yeni politika
CREATE POLICY "Lecturers can create appointments"
ON appointments FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = lecturer_id AND created_by_faculty = true
);

-- Devam randevusu oluşturma fonksiyonu
CREATE OR REPLACE FUNCTION create_follow_up_appointment(
  p_original_appointment_id uuid,
  p_date date,
  p_start_time time,
  p_end_time time
) RETURNS uuid AS $$
DECLARE
  v_lecturer_id uuid;
  v_student_id uuid;
  v_student_name text;
  v_student_email text;
  v_student_faculty text;
  v_student_department text;
  v_student_year text;
  v_new_appointment_id uuid;
  v_message_content text;
BEGIN
  -- Orijinal randevu bilgilerini al
  SELECT 
    lecturer_id, student_id, student_name, student_email,
    student_faculty, student_department, student_year
  INTO 
    v_lecturer_id, v_student_id, v_student_name, v_student_email,
    v_student_faculty, v_student_department, v_student_year
  FROM appointments
  WHERE id = p_original_appointment_id;

  -- Yetki kontrolü
  IF v_lecturer_id != auth.uid() THEN
    RAISE EXCEPTION 'Bu randevu için devam randevusu oluşturma yetkiniz yok';
  END IF;

  -- Yeni randevu oluştur
  INSERT INTO appointments (
    student_id,
    lecturer_id,
    date,
    start_time,
    end_time,
    status,
    is_follow_up,
    created_by_faculty,
    related_to_appointment_id,
    student_name,
    student_email,
    student_faculty,
    student_department,
    student_year,
    subject,
    message,
    processed_at,
    processed_by
  )
  VALUES (
    v_student_id,
    v_lecturer_id,
    p_date,
    p_start_time,
    p_end_time,
    'onaylandı',
    true,
    true,
    p_original_appointment_id,
    v_student_name,
    v_student_email,
    v_student_faculty,
    v_student_department,
    v_student_year,
    'Takip Toplantısı',
    'Öğretim görevlisi tarafından oluşturulan devam randevusu',
    CURRENT_TIMESTAMP,
    auth.uid()
  )
  RETURNING id INTO v_new_appointment_id;

  -- Öğrenciye mesaj gönder
  v_message_content := format(
    'Hocanız sizin için yeni bir devam randevusu oluşturdu:%sTarih: %s%sSaat: %s - %s',
    E'\n',
    to_char(p_date, 'DD.MM.YYYY'),
    E'\n',
    p_start_time::text,
    p_end_time::text
  );

  INSERT INTO messages (
    from_lecturer_id,
    to_student_id,
    content,
    appointment_id
  )
  VALUES (
    v_lecturer_id,
    v_student_id,
    v_message_content,
    v_new_appointment_id
  );

  RETURN v_new_appointment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;