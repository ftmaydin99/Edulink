import React, { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { supabase } from '../lib/supabase';

interface User {
  name: string;
  role: 'student' | 'lecturer';
}

export function About() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function getUserData() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        return;
      }

      // Önce öğrenci olarak kontrol et
      const { data: studentData } = await supabase
        .from('students')
        .select('name')
        .eq('id', authUser.id)
        .maybeSingle();

      if (studentData) {
        setUser({
          name: studentData.name,
          role: 'student'
        });
        return;
      }

      // Öğrenci değilse akademisyen olarak kontrol et
      const { data: lecturerData } = await supabase
        .from('lecturers')
        .select('name')
        .eq('id', authUser.id)
        .maybeSingle();

      if (lecturerData) {
        setUser({
          name: lecturerData.name,
          role: 'lecturer'
        });
      }
    }

    getUserData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header 
        userName={user?.name}
        userRole={user?.role}
      />
      <div className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col items-start gap-4 mb-8">
          <a 
            href="https://www.aacsb.edu/accredited/s/sakarya-university" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center px-4 py-2 bg-[#002B5C] text-white rounded-md hover:bg-[#003B7C] transition-colors shadow-md"
          >
            AACSB Accredited
          </a>
          <div className="w-full aspect-video rounded-lg overflow-hidden shadow-lg">
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/SzylP9CExv4"
              title="Sakarya Üniversitesi Tanıtım"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            ></iframe>
          </div>
        </div>
        
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Hakkımızda</h1>
          
          <div className="space-y-6 text-gray-700">
            <p>
              Biz, Sakarya Üniversitesi İşletme Fakültesi Yönetim Bilişim Sistemleri bölümü öğrencileri olarak, üniversite 
              hayatında karşılaştığımız iletişim problemlerine pratik çözümler sunmayı hedefleyen bir ekibiz. Projemizi 
              fakültemiz öğrencilerinin akademisyenlerle daha kolay iletişim kurabilmesi, randevu alabilmesi ve 
              görüşmelerini, fikir alışverişini, danışmanlığını Dr. Faruk Durmaz'ın rehberliğinde, herkesin kolayca 
              kullanabileceği basit ve işlevsel bir sistem tasarlamaya odaklandık.
            </p>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Projemiz Hakkında</h2>
              <p>
                Projemizi, Sakarya Üniversitesi İşletme Fakültesi'nde öğrenci ve akademisyenler arasındaki iletişimi 
                kolaylaştırmak için geliştirdik. Fakültemizde 5000+ öğrenci akademik danışmanlık olarak akademisyenlere 
                başvuruyor, akademisyenlerin müsaitliklerini sistemden takip ederek randevu alabilecekleri gibi kendileri 
                randevu oluşturmayı amaçlamaktadır.
              </p>
            </div>

            <p>
              Sistem kullanıcı dostu ve kolay takip olarak ve sadece İşletme Fakültesi kapsamında pilot olarak 
              uygulanacaktır. Bu proje sayesinde hem akademisyenlerin zamanı daha verimli kullanılabilecek, hem de 
              öğrenciler danışmanla ya da akademisyen ile daha düzenli bir şekilde görüşebilecek.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}