# 📧 Edulink E-posta Bildirim Sistemi Kurulum Rehberi

## 🎯 Sistem Özeti

Edulink randevu sistemi için otomatik e-posta bildirimleri:
- **Gönderen:** sakaryaedulink@gmail.com
- **Alıcılar:** Öğrenci + İlgili Akademisyen
- **Tetikleyiciler:** Randevu oluşturma, onaylama, iptal, erteleme

## 🔧 Gmail SMTP Kurulumu

### 1. Gmail App Password Oluşturma

1. **Google Hesabınıza gidin:** [myaccount.google.com](https://myaccount.google.com)
2. **"Güvenlik" sekmesine** tıklayın
3. **"2 Adımlı Doğrulama"** aktif olmalı (yoksa aktif edin)
4. **"Uygulama şifreleri"** bölümüne gidin
5. **"Uygulama seç"** → **"Mail"** seçin
6. **"Cihaz seç"** → **"Diğer"** seçin → **"Edulink"** yazın
7. **16 haneli şifreyi** kopyalayın (örnek: `abcd efgh ijkl mnop`)

### 2. Supabase Environment Variables

Supabase Dashboard → **Settings** → **Environment Variables**:

```bash
GMAIL_USER=sakaryaedulink@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
```

## 📨 E-posta Bildirim Senaryoları

### 1. **Randevu Oluşturulduğunda**
- **Öğrenciye:** "📅 Randevu Talebiniz Alındı"
- **Akademisyene:** "🔔 Yeni Randevu Talebi"

### 2. **Randevu Onaylandığında**
- **Öğrenciye:** "✅ Randevunuz Onaylandı"
- **Akademisyene:** "✅ Randevu Onaylandı"

### 3. **Randevu İptal Edildiğinde**
- **Öğrenciye:** "❌ Randevunuz İptal Edildi"
- **Akademisyene:** "❌ Randevu İptal Edildi"

### 4. **Randevu Ertelendiğinde**
- **Öğrenciye:** "📅 Randevunuz Ertelendi"
- **Akademisyene:** "📅 Randevu Ertelendi"

## 📋 E-posta İçeriği

Her e-posta şu bilgileri içerir:
- ✅ **Randevu Tarihi ve Saati**
- ✅ **Öğrenci/Akademisyen Adı**
- ✅ **Randevu Konusu**
- ✅ **Durum Bilgisi**
- ✅ **Fakülte/Bölüm Bilgileri**
- ✅ **İlgili Mesajlar**
- ✅ **Sistem Linkler**

## 🚀 Kurulum Adımları

### 1. Edge Function Deploy
```bash
# Supabase CLI ile
supabase functions deploy send-edulink-notification

# Veya Supabase Dashboard'dan manuel upload
```

### 2. Database Trigger'ları Oluştur
```sql
-- Supabase SQL Editor'da çalıştırın
-- create_email_triggers.sql içeriğini kopyalayıp yapıştırın
```

### 3. Environment Variables Ayarla
```bash
GMAIL_USER=sakaryaedulink@gmail.com
GMAIL_APP_PASSWORD=your_16_digit_app_password
```

## 🔍 Test ve Debug

### Debug Loglarını Kontrol Edin
```sql
SELECT * FROM debug_logs 
WHERE function_name = 'send-edulink-notification'
ORDER BY created_at DESC 
LIMIT 10;
```

### Test Randevusu Oluşturun
1. Öğrenci olarak giriş yapın
2. Yeni randevu oluşturun
3. E-posta gelip gelmediğini kontrol edin
4. Akademisyen olarak randevuyu onaylayın
5. Tekrar e-posta kontrolü yapın

## ⚠️ Önemli Notlar

1. **Gmail Güvenlik:** App Password kullanılmalı (normal şifre değil)
2. **SMTP Ayarları:** Gmail SMTP `smtp.gmail.com:587` TLS
3. **Rate Limits:** Gmail günlük gönderim limitleri vardır
4. **Spam Kontrolü:** E-postalar spam klasörüne düşebilir
5. **Domain Reputation:** İlk kullanımda e-postalar gecikebilir

## 🐛 Troubleshooting

### E-posta gönderilmiyor?
1. ✅ Gmail App Password doğru mu?
2. ✅ Environment variables set edildi mi?
3. ✅ Trigger'lar çalışıyor mu?
4. ✅ Debug logs kontrol edildi mi?

### SMTP Hatası?
- Gmail SMTP: `smtp.gmail.com:587`
- TLS/STARTTLS aktif olmalı
- App Password kullanılmalı

### Trigger Çalışmıyor?
```sql
-- Trigger'ları kontrol et
SELECT * FROM information_schema.triggers 
WHERE trigger_name LIKE '%appointment_email%';
```

## 📞 Destek

Sorun yaşarsanız:
1. Debug logs tablosunu kontrol edin
2. Supabase function logs'unu inceleyin
3. Gmail SMTP ayarlarını doğrulayın
4. Test e-postası gönderin

---

**🎓 Edulink - Sakarya Üniversitesi İşletme Fakültesi**