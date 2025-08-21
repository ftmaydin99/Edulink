# 🎯 Environment Variables'a Gitme Rehberi

## Şu Anda Bulunduğunuz Yer: ✅ DOĞRU!
**Settings → API Keys** sayfasındasınız.

## 📍 Environment Variables'a Gitme Adımları:

### 1. Sol Menüden "Vault" Seçeneğine Tıklayın
Ekran görüntünüzde sol menüde **"Vault"** yazan bölümü görüyorsunuz. Oraya tıklayın.

### 2. Vault Sayfasında Environment Variables Bulun
Vault sayfasında **"Secrets"** veya **"Environment Variables"** bölümü olacak.

### 3. Yeni Secret Ekleyin
**"New Secret"** veya **"Add Secret"** butonuna tıklayın.

## 📝 Eklenecek Environment Variable:

### Gmail için:
- **Name/Key:** `GMAIL_USER`
- **Value:** `sakaryaedulink@gmail.com`

### İkinci Secret:
- **Name/Key:** `GMAIL_APP_PASSWORD`
- **Value:** `ukve efjj wrlb ubam`

## 🔄 Alternatif Yol - Edge Functions Üzerinden:

Eğer Vault bulamıyorsanız:

1. Sol menüden **"Edge Functions"** seçin
2. `send-appointment-email` fonksiyonunu bulun
3. Fonksiyon ayarlarında **"Environment Variables"** bölümü olacak

## ⚠️ Önemli Notlar:

- **GMAIL_APP_PASSWORD** için Gmail'den aldığınız 16 haneli şifreyi kullanın
- **Normal Gmail şifrenizi kullanmayın!**
- Şifreler gizli tutulacak ve fonksiyonlarda `Deno.env.get()` ile erişilebilecek

## 🎯 Sonraki Adım:
Environment Variables eklendikten sonra Edge Function'ı deploy edin ve e-posta sistemi çalışmaya başlayacak!

---

**📧 Edulink E-posta Sistemi - Supabase Kurulum**