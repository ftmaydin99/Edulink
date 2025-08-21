# Resend API E-posta Kurulumu

## 🚀 Resend API Kurulumu

### 1. Resend Hesabı Oluşturun
1. [resend.com](https://resend.com) adresine gidin
2. Ücretsiz hesap oluşturun
3. E-posta adresinizi doğrulayın

### 2. API Key Alın
1. Resend Dashboard'a giriş yapın
2. **API Keys** bölümüne gidin
3. **Create API Key** butonuna tıklayın
4. Key'e bir isim verin (örn: "SAU Randevu Sistemi")
5. **Full access** seçin
6. API Key'i kopyalayın (örn: `re_123abc...`)

### 3. Domain Doğrulaması (Önemli!)
1. **Domains** bölümüne gidin
2. **Add Domain** butonuna tıklayın
3. Domain adınızı girin (örn: `yourdomain.com`)
4. DNS kayıtlarını domain sağlayıcınıza ekleyin
5. Doğrulama tamamlanana kadar bekleyin

**Not:** Domain doğrulaması yapılmadan e-posta gönderilemez!

### 4. Supabase Environment Variables
Supabase Dashboard → **Settings** → **Environment Variables**:

```
RESEND_API_KEY=re_123abc...
```

### 5. Edge Function'ı Deploy Edin
```bash
supabase functions deploy send-student-notification
```

## 📧 Function Kullanımı

### API Endpoint
```
POST https://your-project.supabase.co/functions/v1/send-student-notification
```

### Request Format
```json
{
  "student_email": "ogrenci@ogr.sakarya.edu.tr",
  "subject": "Randevu Onaylandı",
  "body": "Sayın öğrenci,\n\nRandevunuz onaylanmıştır.\n\nTarih: 15 Ocak 2025\nSaat: 14:00\n\nSaygılarımla."
}
```

### Response (Başarılı)
```json
{
  "status": "OK",
  "message": "Email sent successfully",
  "email_id": "abc123..."
}
```

### Response (Hatalı)
```json
{
  "error": "Invalid email format",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## 🔧 Frontend'den Kullanım

```typescript
const sendNotificationEmail = async (studentEmail: string, subject: string, body: string) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-student-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        student_email: studentEmail,
        subject: subject,
        body: body
      })
    });

    if (!response.ok) {
      throw new Error('E-posta gönderimi başarısız');
    }

    const result = await response.json();
    console.log('E-posta gönderildi:', result);
    return result;
  } catch (error) {
    console.error('E-posta hatası:', error);
    throw error;
  }
};

// Kullanım örneği
await sendNotificationEmail(
  'ogrenci@ogr.sakarya.edu.tr',
  'Randevu Onaylandı',
  'Sayın öğrenci,\n\nRandevunuz onaylanmıştır.\n\nTarih: 15 Ocak 2025\nSaat: 14:00\n\nSaygılarımla.'
);
```

## 🐛 Debug ve Test

### Debug Loglarını Kontrol Edin
```sql
SELECT * FROM debug_logs 
WHERE function_name = 'send-student-notification'
ORDER BY created_at DESC 
LIMIT 5;
```

### Test Request (curl)
```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-student-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "student_email": "test@example.com",
    "subject": "Test E-postası",
    "body": "Bu bir test mesajıdır."
  }'
```

## ⚠️ Önemli Notlar

1. **Domain Doğrulaması Zorunlu:** Resend'de domain doğrulaması yapmadan e-posta gönderilemez
2. **From Adresi:** `from` adresi doğrulanmış domain'den olmalı
3. **Rate Limits:** Resend'in günlük/aylık limitleri vardır
4. **CORS:** Function CORS destekli, frontend'den direkt çağrılabilir
5. **Error Handling:** Tüm hatalar JSON formatında döner
6. **Logging:** Tüm e-posta denemeleri `debug_logs` tablosuna kaydedilir

## 🎯 Sonraki Adımlar

1. Resend hesabı oluşturun
2. Domain doğrulaması yapın
3. API Key'i Supabase'e ekleyin
4. Function'ı deploy edin
5. Test edin!