/*
  # Fakülte ve Bölüm tabloları

  1. Yeni Tablolar
    - `faculties` (Fakülteler)
      - Üniversitedeki fakültelerin listesi
    - `departments` (Bölümler)
      - Fakültelere bağlı bölümler
    
  2. Değişiklikler
    - `students` tablosuna fakülte, bölüm ve sınıf bilgileri eklendi
*/

-- Fakülteler tablosu
CREATE TABLE faculties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Bölümler tablosu
CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id uuid NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(faculty_id, name)
);

-- Students tablosuna yeni sütunlar ekle
ALTER TABLE students
ADD COLUMN faculty_id uuid REFERENCES faculties(id),
ADD COLUMN department_id uuid REFERENCES departments(id),
ADD COLUMN year text CHECK (year IN ('Hazırlık', '1. Sınıf', '2. Sınıf', '3. Sınıf', '4. Sınıf'));

-- RLS politikaları
ALTER TABLE faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Herkes fakülte ve bölümleri görüntüleyebilir
CREATE POLICY "Anyone can view faculties"
ON faculties FOR SELECT
TO public
USING (true);

CREATE POLICY "Anyone can view departments"
ON departments FOR SELECT
TO public
USING (true);

-- Örnek fakülte ve bölüm verileri
INSERT INTO faculties (name) VALUES
  ('İşletme Fakültesi'),
  ('Mühendislik Fakültesi'),
  ('Fen Edebiyat Fakültesi'),
  ('Eğitim Fakültesi'),
  ('Tıp Fakültesi');

-- İşletme Fakültesi bölümleri
WITH fakulte AS (SELECT id FROM faculties WHERE name = 'İşletme Fakültesi')
INSERT INTO departments (faculty_id, name)
SELECT id, name FROM fakulte, unnest(ARRAY[
  'İşletme',
  'Uluslararası Ticaret',
  'Finansal Ekonometri',
  'İnsan Kaynakları Yönetimi'
]) AS name;

-- Mühendislik Fakültesi bölümleri
WITH fakulte AS (SELECT id FROM faculties WHERE name = 'Mühendislik Fakültesi')
INSERT INTO departments (faculty_id, name)
SELECT id, name FROM fakulte, unnest(ARRAY[
  'Bilgisayar Mühendisliği',
  'Elektrik-Elektronik Mühendisliği',
  'Makine Mühendisliği',
  'Endüstri Mühendisliği'
]) AS name;