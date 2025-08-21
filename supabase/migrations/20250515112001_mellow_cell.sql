/*
  # Fakülte ve Bölüm Verilerini Ekle

  1. Yeni Veriler
    - Tüm fakülteler ve bölümleri ekle
    - Her fakülte için ilgili bölümleri tanımla

  2. Güvenlik
    - Mevcut RLS politikaları korunuyor
*/

-- Mevcut verileri temizle
TRUNCATE TABLE departments CASCADE;
TRUNCATE TABLE faculties CASCADE;

-- Fakülteleri ekle
INSERT INTO faculties (name) VALUES
  ('İşletme Fakültesi'),
  ('Mühendislik Fakültesi'),
  ('Fen Edebiyat Fakültesi'),
  ('Eğitim Fakültesi'),
  ('Tıp Fakültesi'),
  ('Hukuk Fakültesi'),
  ('Diş Hekimliği Fakültesi'),
  ('Sağlık Bilimleri Fakültesi'),
  ('İlahiyat Fakültesi'),
  ('Spor Bilimleri Fakültesi');

-- İşletme Fakültesi bölümleri
WITH fakulte AS (SELECT id FROM faculties WHERE name = 'İşletme Fakültesi')
INSERT INTO departments (faculty_id, name)
SELECT id, name FROM fakulte, unnest(ARRAY[
  'İşletme',
  'Uluslararası Ticaret',
  'Finansal Ekonometri',
  'İnsan Kaynakları Yönetimi',
  'Muhasebe ve Finans Yönetimi',
  'Yönetim Bilişim Sistemleri'
]) AS name;

-- Mühendislik Fakültesi bölümleri
WITH fakulte AS (SELECT id FROM faculties WHERE name = 'Mühendislik Fakültesi')
INSERT INTO departments (faculty_id, name)
SELECT id, name FROM fakulte, unnest(ARRAY[
  'Bilgisayar Mühendisliği',
  'Elektrik-Elektronik Mühendisliği',
  'Makine Mühendisliği',
  'Endüstri Mühendisliği',
  'İnşaat Mühendisliği',
  'Metalurji ve Malzeme Mühendisliği',
  'Çevre Mühendisliği',
  'Gıda Mühendisliği'
]) AS name;

-- Fen Edebiyat Fakültesi bölümleri
WITH fakulte AS (SELECT id FROM faculties WHERE name = 'Fen Edebiyat Fakültesi')
INSERT INTO departments (faculty_id, name)
SELECT id, name FROM fakulte, unnest(ARRAY[
  'Matematik',
  'Fizik',
  'Kimya',
  'Biyoloji',
  'Türk Dili ve Edebiyatı',
  'Tarih',
  'Sosyoloji',
  'Psikoloji'
]) AS name;

-- Eğitim Fakültesi bölümleri
WITH fakulte AS (SELECT id FROM faculties WHERE name = 'Eğitim Fakültesi')
INSERT INTO departments (faculty_id, name)
SELECT id, name FROM fakulte, unnest(ARRAY[
  'Matematik Öğretmenliği',
  'Fen Bilgisi Öğretmenliği',
  'Türkçe Öğretmenliği',
  'İngilizce Öğretmenliği',
  'Sınıf Öğretmenliği',
  'Okul Öncesi Öğretmenliği'
]) AS name;

-- Tıp Fakültesi bölümleri
WITH fakulte AS (SELECT id FROM faculties WHERE name = 'Tıp Fakültesi')
INSERT INTO departments (faculty_id, name)
SELECT id, name FROM fakulte, unnest(ARRAY[
  'Tıp'
]) AS name;

-- Hukuk Fakültesi bölümleri
WITH fakulte AS (SELECT id FROM faculties WHERE name = 'Hukuk Fakültesi')
INSERT INTO departments (faculty_id, name)
SELECT id, name FROM fakulte, unnest(ARRAY[
  'Hukuk'
]) AS name;

-- Diş Hekimliği Fakültesi bölümleri
WITH fakulte AS (SELECT id FROM faculties WHERE name = 'Diş Hekimliği Fakültesi')
INSERT INTO departments (faculty_id, name)
SELECT id, name FROM fakulte, unnest(ARRAY[
  'Diş Hekimliği'
]) AS name;

-- Sağlık Bilimleri Fakültesi bölümleri
WITH fakulte AS (SELECT id FROM faculties WHERE name = 'Sağlık Bilimleri Fakültesi')
INSERT INTO departments (faculty_id, name)
SELECT id, name FROM fakulte, unnest(ARRAY[
  'Hemşirelik',
  'Fizyoterapi ve Rehabilitasyon',
  'Beslenme ve Diyetetik',
  'Ebelik'
]) AS name;

-- İlahiyat Fakültesi bölümleri
WITH fakulte AS (SELECT id FROM faculties WHERE name = 'İlahiyat Fakültesi')
INSERT INTO departments (faculty_id, name)
SELECT id, name FROM fakulte, unnest(ARRAY[
  'İlahiyat'
]) AS name;

-- Spor Bilimleri Fakültesi bölümleri
WITH fakulte AS (SELECT id FROM faculties WHERE name = 'Spor Bilimleri Fakültesi')
INSERT INTO departments (faculty_id, name)
SELECT id, name FROM fakulte, unnest(ARRAY[
  'Beden Eğitimi ve Spor Öğretmenliği',
  'Spor Yöneticiliği',
  'Antrenörlük Eğitimi',
  'Rekreasyon'
]) AS name;