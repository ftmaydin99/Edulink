// E-posta sistemi test scripti
console.log('🧪 E-posta sistemi test ediliyor...');

// Test için debug loglarını kontrol etmek için SQL sorgusu
const debugQuery = `
SELECT 
  created_at,
  function_name,
  message,
  details
FROM debug_logs 
WHERE function_name = 'send-edulink-notification'
ORDER BY created_at DESC 
LIMIT 5;
`;

console.log('📊 Debug loglarını kontrol etmek için Supabase SQL Editor\'da şu sorguyu çalıştırın:');
console.log(debugQuery);

console.log('\n✅ Environment Variables başarıyla eklendi:');
console.log('- GMAIL_USER: sakaryaedulink@gmail.com');
console.log('- GMAIL_APP_PASSWORD: [GİZLİ]');

console.log('\n🎯 Test için yapılacaklar:');
console.log('1. Öğrenci olarak giriş yapın');
console.log('2. Yeni randevu oluşturun');
console.log('3. E-posta gelip gelmediğini kontrol edin');
console.log('4. Debug loglarını Supabase\'de kontrol edin');