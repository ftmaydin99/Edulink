/*
  # Öğretim Elemanı Giriş Sistemi Güncellemesi

  1. Değişiklikler
    - Şifre sütunu kaldırıldı (Supabase Auth tarafından yönetilecek)
    - RLS politikaları güncellendi
    - Öğretim elemanlarının kendi profillerini yönetebilmeleri için politika eklendi
  
  2. Güvenlik
    - Kimlik doğrulama Supabase Auth üzerinden yapılacak
    - Öğretim elemanları sadece kendi profillerini görüntüleyebilir ve düzenleyebilir
*/

-- Şifre sütununu kaldır
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lecturers' AND column_name = 'password'
  ) THEN
    ALTER TABLE lecturers DROP COLUMN password;
  END IF;
END $$;

-- Mevcut politikaları kaldır
DROP POLICY IF EXISTS "Lecturers can manage their own profile" ON lecturers;
DROP POLICY IF EXISTS "Lecturers can view their own profile" ON lecturers;

-- Yeni politika oluştur
CREATE POLICY "Lecturers can manage their own profile"
ON lecturers
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Mevcut kayıtların must_change_password değerini güncelle
UPDATE lecturers
SET must_change_password = true
WHERE must_change_password IS NULL;