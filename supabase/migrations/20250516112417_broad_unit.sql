/*
  # Appointments tablosuna öğrenci bilgileri ekleme
  
  1. Yeni Sütunlar
    - student_name: Öğrencinin adı
    - student_email: Öğrencinin e-posta adresi
    - student_faculty: Öğrencinin fakültesi
    - student_department: Öğrencinin bölümü
    - student_year: Öğrencinin sınıfı
    
  2. Mevcut Veriler
    - Mevcut randevular için öğrenci bilgilerini students tablosundan al
    - Yeni sütunları doldur
*/

-- Yeni sütunları ekle
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS student_name text,
ADD COLUMN IF NOT EXISTS student_email text,
ADD COLUMN IF NOT EXISTS student_faculty text,
ADD COLUMN IF NOT EXISTS student_department text,
ADD COLUMN IF NOT EXISTS student_year text;

-- Mevcut randevuların öğrenci bilgilerini güncelle
UPDATE appointments a
SET 
  student_name = s.name,
  student_email = s.email,
  student_faculty = f.name,
  student_department = d.name,
  student_year = s.year
FROM 
  students s
  LEFT JOIN faculties f ON s.faculty_id = f.id
  LEFT JOIN departments d ON s.department_id = d.id
WHERE 
  a.student_id = s.id;