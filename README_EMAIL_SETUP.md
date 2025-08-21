# Gmail E-posta Entegrasyonu Kurulum Rehberi

## 🚨 ÖNEMLİ: Gerçek E-posta Gönderimi İçin

Şu anda sistem **simülasyon modunda** çalışıyor. Gerçek e-posta göndermek için:

### Seçenek 1: EmailJS Entegrasyonu (Önerilen)
1. [EmailJS](https://emailjs.com) hesabı oluşturun
2. Gmail service'i ekleyin
3. Template oluşturun
4. User ID'yi Edge Function'a ekleyin

### Seçenek 2: Resend API (Profesyonel)
1. [Resend](https://resend.com) hesabı oluşturun
2. API key alın
3. Domain doğrulaması yapın
4. Edge Function'ı güncelleyin

### Seçenek 3: SendGrid API
1. [SendGrid](https://sendgrid.com) hesabı oluşturun
2. API key alın
3. Sender doğrulaması yapın
4. Edge Function'ı güncelleyin

## 🔧 Gmail SMTP Kurulumu

### 1. Gmail App Password Oluşturma

1. **Google Hesabınıza gidin:** [myaccount.google.com](https://myaccount.google.com)
2. **"Güvenlik" sekmesine** tıklayın
3. **"2 Adımlı Doğrulama"** aktif olmalı (yoksa aktif edin)
4. **"Uygulama şifreleri"** bölümüne gidin
5. **"Uygulama seç"** → **"Mail"** seçin
6. **"Cihaz seç"** → **"Diğer"** seçin → **"Supabase"** yazın
7. **16 haneli şifreyi** kopyalayın (örnek: `abcd efgh ijkl mnop`)

### 2. Supabase Environment Variables

Supabase Dashboard'da şu environment variable'ları ekleyin:

```bash
GMAIL_USER=zeynepfatma281@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
SITE_URL=https://your-new-site.netlify.app
```

### 3. E-posta Gönderim Durumu Kontrol

Debug loglarını kontrol edin:
```sql
SELECT * FROM debug_logs 
WHERE function_name = 'send-appointment-email'
ORDER BY created_at DESC 
LIMIT 5;
```

### 3. Kurulum Adımları

1. **Migration'ı çalıştırın:**
   ```sql
   -- Supabase SQL Editor'da çalıştırın
   -- setup_email_trigger.sql içeriğini kopyalayıp yapıştırın
   ```

2. **Edge Function'ı deploy edin:**
   - Supabase CLI ile: `supabase functions deploy send-appointment-email`
   - Veya Supabase Dashboard'dan manuel upload

3. **Test edin:**
   - Bir randevu oluşturun
   - E-posta gelip gelmediğini kontrol edin

## 📧 E-posta Şablonları

### Öğrenci E-postası:
- ✅ Randevu onay bilgisi
- ✅ Akademisyen bilgileri
- ✅ Tarih ve saat
- ✅ Randevularını görüntüleme linki

### Akademisyen E-postası:
- ✅ Yeni randevu talebi bildirimi
- ✅ Öğrenci bilgileri
- ✅ Randevu detayları
- ✅ Randevu yönetim linki

## 🔍 Troubleshooting

### E-posta gönderilmiyor?
1. Gmail App Password doğru mu?
2. Environment variables set edildi mi?
3. Trigger çalışıyor mu? (debug_logs tablosunu kontrol edin)

### SMTP Hatası?
- Gmail SMTP: `smtp.gmail.com:587`
- TLS/STARTTLS aktif olmalı
- App Password kullanılmalı (normal şifre değil)

## 🚀 Alternatif E-posta Servisleri

Eğer Gmail SMTP çalışmazsa:
- **Resend:** [resend.com](https://resend.com) (Önerilen)
- **SendGrid:** [sendgrid.com](https://sendgrid.com)
- **EmailJS:** [emailjs.com](https://emailjs.com)