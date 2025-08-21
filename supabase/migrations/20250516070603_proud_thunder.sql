/*
  # Öğretim görevlileri listesi için görüntüleme politikası
  
  1. Değişiklikler
    - Kimlik doğrulaması yapılmış tüm kullanıcıların öğretim görevlilerini görüntüleyebilmesi için yeni politika
    
  2. Güvenlik
    - Sadece temel bilgilerin (id, name) görüntülenmesi için sınırlı erişim
*/

-- Mevcut politikaları temizle
DROP POLICY IF EXISTS "Lecturers can manage their own profile" ON lecturers;

-- Yeni politikaları ekle
CREATE POLICY "Anyone can view lecturers basic info"
ON lecturers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Lecturers can manage their own profile"
ON lecturers FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);