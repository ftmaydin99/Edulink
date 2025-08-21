/*
  # Öğretim Elemanları Tablosu Güncellemesi

  1. Değişiklikler
    - password sütununu kaldır (şifreler artık Supabase Auth'da tutulacak)
    - Güvenlik politikalarını güncelle
    - must_change_password sütunu için varsayılan değer ayarla

  2. Güvenlik
    - Öğretim elemanları kendi profillerini yönetebilir
    - Kimlik doğrulaması yapılmış kullanıcılar için politikalar güncellendi
*/

-- Remove password column if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lecturers' AND column_name = 'password'
  ) THEN
    ALTER TABLE lecturers DROP COLUMN password;
  END IF;
END $$;

-- Update existing policies
DROP POLICY IF EXISTS "Lecturers can manage their own profile" ON lecturers;
DROP POLICY IF EXISTS "Lecturers can view their own profile" ON lecturers;

-- Create new policies
CREATE POLICY "Lecturers can manage their own profile"
ON lecturers
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Update existing data to ensure must_change_password is set
UPDATE lecturers
SET must_change_password = true
WHERE must_change_password IS NULL;