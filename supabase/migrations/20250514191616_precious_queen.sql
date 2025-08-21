/*
  # Sakarya Üniversitesi İşletme Fakültesi Randevu Sistemi Veritabanı

  1. Yeni Tablolar
    - `students` (Öğrenciler)
      - Öğrenci profil bilgileri
      - Sakarya Üniversitesi e-posta zorunluluğu
    - `lecturers` (Öğretim Görevlileri)
      - Öğretim üyesi profil bilgileri
      - İlk giriş şifre değiştirme kontrolü
    - `availabilities` (Müsaitlik Zamanları)
      - Öğretim üyelerinin müsait oldukları zamanlar
    - `appointments` (Randevular)
      - Öğrenci-öğretim üyesi randevuları
      - Randevu durumu takibi
    - `messages` (Mesajlar)
      - Öğrenci-öğretim üyesi arası mesajlaşma
      
  2. Güvenlik
    - Her tablo için satır seviyesi güvenlik (RLS)
    - Kullanıcı rollerine göre erişim politikaları
*/

-- Students tablosu
CREATE TABLE students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL CHECK (email LIKE '%@ogr.sakarya.edu.tr'),
  password text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Lecturers tablosu
CREATE TABLE lecturers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL CHECK (email LIKE '%@sakarya.edu.tr'),
  password text NOT NULL,
  must_change_password boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Availabilities tablosu
CREATE TABLE availabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecturer_id uuid NOT NULL REFERENCES lecturers(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- Appointments tablosu
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  lecturer_id uuid NOT NULL REFERENCES lecturers(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL CHECK (status IN ('bekliyor', 'onaylandı', 'iptal')) DEFAULT 'bekliyor',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_appointment_time CHECK (start_time < end_time)
);

-- Messages tablosu
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_student_id uuid REFERENCES students(id) ON DELETE SET NULL,
  from_lecturer_id uuid REFERENCES lecturers(id) ON DELETE SET NULL,
  to_student_id uuid REFERENCES students(id) ON DELETE SET NULL,
  to_lecturer_id uuid REFERENCES lecturers(id) ON DELETE SET NULL,
  content text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  CONSTRAINT valid_message_participants CHECK (
    (from_student_id IS NOT NULL AND from_lecturer_id IS NULL) OR
    (from_student_id IS NULL AND from_lecturer_id IS NOT NULL)
  )
);

-- Enable Row Level Security
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE availabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Students için politikalar
CREATE POLICY "Students can view their own profile"
  ON students FOR SELECT
  USING (auth.uid() = id);

-- Lecturers için politikalar
CREATE POLICY "Lecturers can view their own profile"
  ON lecturers FOR SELECT
  USING (auth.uid() = id);

-- Availabilities için politikalar
CREATE POLICY "Anyone can view availabilities"
  ON availabilities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Lecturers can manage their availabilities"
  ON availabilities FOR ALL
  USING (auth.uid()::uuid = lecturer_id);

-- Appointments için politikalar
CREATE POLICY "Students can view their appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (auth.uid()::uuid = student_id);

CREATE POLICY "Lecturers can view their appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (auth.uid()::uuid = lecturer_id);

CREATE POLICY "Students can create appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::uuid = student_id);

-- Messages için politikalar
CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    auth.uid()::uuid = from_student_id OR
    auth.uid()::uuid = from_lecturer_id OR
    auth.uid()::uuid = to_student_id OR
    auth.uid()::uuid = to_lecturer_id
  );

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid()::uuid = from_student_id OR
    auth.uid()::uuid = from_lecturer_id
  );