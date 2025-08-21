-- Tüm trigger fonksiyonlarını düzelt
-- 1. update_appointment_student_info fonksiyonunu düzelt
CREATE OR REPLACE FUNCTION update_appointment_student_info()
RETURNS TRIGGER AS $$
BEGIN
  -- Öğrenci bilgilerini al
  SELECT 
    s.name,
    s.email,
    f.name as faculty_name,
    d.name as department_name,
    s.year
  INTO 
    NEW.student_name,
    NEW.student_email,
    NEW.student_faculty,
    NEW.student_department,
    NEW.student_year
  FROM students s
  LEFT JOIN faculties f ON s.faculty_id = f.id
  LEFT JOIN departments d ON s.department_id = d.id
  WHERE s.id = NEW.student_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. update_student_info fonksiyonunu düzelt (eğer varsa)
CREATE OR REPLACE FUNCTION update_student_info()
RETURNS TRIGGER AS $$
BEGIN
  -- Öğrenci bilgilerini güncelle
  SELECT 
    s.name,
    s.email,
    f.name as faculty_name,
    d.name as department_name,
    s.year
  INTO 
    NEW.student_name,
    NEW.student_email,
    NEW.student_faculty,
    NEW.student_department,
    NEW.student_year
  FROM students s
  LEFT JOIN faculties f ON s.faculty_id = f.id
  LEFT JOIN departments d ON s.department_id = d.id
  WHERE s.id = NEW.student_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger'ları yeniden oluştur
DROP TRIGGER IF EXISTS update_appointment_student_info ON appointments;
DROP TRIGGER IF EXISTS update_student_info ON appointments;

CREATE TRIGGER update_appointment_student_info
  BEFORE INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_student_info();

CREATE TRIGGER update_student_info
  BEFORE INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_student_info();