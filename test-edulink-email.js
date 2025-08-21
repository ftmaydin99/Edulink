// Edulink E-posta Bildirim Sistemi Test Dosyası

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Test verisi
const testEmailData = {
  type: 'appointment_created', // appointment_created, appointment_approved, appointment_cancelled, appointment_rescheduled
  appointment: {
    id: 'test-appointment-123',
    date: '2025-01-20',
    start_time: '14:00',
    end_time: '14:30',
    subject: 'Akademik Danışmanlık',
    message: 'Ders seçimi konusunda danışmanlık almak istiyorum.',
    status: 'bekliyor'
  },
  student: {
    name: 'Ahmet Yılmaz',
    email: 'ahmet.yilmaz@ogr.sakarya.edu.tr',
    faculty: 'İşletme Fakültesi',
    department: 'Yönetim Bilişim Sistemleri',
    year: '3. Sınıf'
  },
  lecturer: {
    name: 'Dr. Faruk Durmaz',
    email: 'fdurmaz@sakarya.edu.tr',
    title: 'Dr. Öğr. Üyesi'
  }
};

async function testEdulinkEmailNotification() {
  console.log('🧪 Edulink E-posta Bildirim Testi Başlıyor...\n');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-edulink-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(testEmailData)
    });

    console.log('📡 Response Status:', response.status);
    console.log('📡 Response Headers:', Object.fromEntries(response.headers.entries()));

    const result = await response.json();
    console.log('📧 Response Body:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('\n✅ TEST BAŞARILI!');
      console.log(`📨 Öğrenci e-postası: ${result.student_email_sent ? '✅ Gönderildi' : '❌ Gönderilemedi'}`);
      console.log(`📨 Akademisyen e-postası: ${result.lecturer_email_sent ? '✅ Gönderildi' : '❌ Gönderilemedi'}`);
      console.log(`📋 Bildirim Tipi: ${result.type}`);
    } else {
      console.log('\n❌ TEST BAŞARISIZ!');
      console.log('Hata:', result.error);
    }

  } catch (error) {
    console.error('\n💥 Test Hatası:', error.message);
  }
}

// Farklı senaryoları test et
async function testAllScenarios() {
  const scenarios = [
    { type: 'appointment_created', description: 'Randevu Oluşturuldu' },
    { type: 'appointment_approved', description: 'Randevu Onaylandı' },
    { type: 'appointment_cancelled', description: 'Randevu İptal Edildi' },
    { 
      type: 'appointment_rescheduled', 
      description: 'Randevu Ertelendi',
      extraData: {
        reschedule_reason: 'Acil toplantı nedeniyle ertelendi',
        rescheduled_date: '2025-01-22',
        rescheduled_start_time: '15:00',
        rescheduled_end_time: '15:30'
      }
    }
  ];

  for (const scenario of scenarios) {
    console.log(`\n🎯 Test Senaryosu: ${scenario.description}`);
    console.log('='.repeat(50));
    
    const testData = {
      ...testEmailData,
      type: scenario.type,
      appointment: {
        ...testEmailData.appointment,
        ...(scenario.extraData || {})
      }
    };

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-edulink-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(testData)
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ ${scenario.description} - Başarılı`);
        console.log(`   Öğrenci: ${result.student_email_sent ? '✅' : '❌'} | Akademisyen: ${result.lecturer_email_sent ? '✅' : '❌'}`);
      } else {
        console.log(`❌ ${scenario.description} - Başarısız: ${result.error}`);
      }

    } catch (error) {
      console.log(`💥 ${scenario.description} - Hata: ${error.message}`);
    }

    // Testler arası bekleme
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Kullanım
console.log('🎓 EDULINK E-POSTA BİLDİRİM SİSTEMİ TEST ARACI');
console.log('='.repeat(60));
console.log('⚠️  SUPABASE_URL ve SUPABASE_ANON_KEY değerlerini güncelleyin!');
console.log('📧 Gmail SMTP ayarlarının yapıldığından emin olun!');
console.log('='.repeat(60));

// Tek test için:
// testEdulinkEmailNotification();

// Tüm senaryolar için:
// testAllScenarios();

module.exports = {
  testEdulinkEmailNotification,
  testAllScenarios,
  testEmailData
};