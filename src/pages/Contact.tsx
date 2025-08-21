import React, { useEffect, useState } from 'react';
import { Phone, Mail, Globe, Clock } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { supabase } from '../lib/supabase';

export function Contact() {
  const [student, setStudent] = useState<{ name: string } | null>(null);

  useEffect(() => {
    async function getStudentData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data: studentData } = await supabase
        .from('students')
        .select('name')
        .eq('id', user.id)
        .single();

      if (studentData) {
        setStudent(studentData);
      }
    }

    getStudentData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header 
        userName={student?.name}
        userRole="student"
      />
      <div className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="h-full">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3022.8652931608674!2d30.332726776332784!3d40.74232657138451!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14ccadf2977958d7%3A0x3dd3ee05da4a2297!2sSakarya%20%C3%9Cniversitesi%20%C4%B0%C5%9Fletme%20Fak%C3%BCltesi!5e0!3m2!1str!2str!4v1707861547057!5m2!1str!2str"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: '400px' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>

            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">İletişim Bilgileri</h1>
              
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Adres</h2>
                  <p className="text-gray-700">
                    Sakarya Üniversitesi İşletme Fakültesi Dekanlığı<br />
                    Esentepe Kampüsü 54187<br />
                    Serdivan / Sakarya / Türkiye
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="h-5 w-5 text-sau-blue" />
                    <span>Telefon:</span>
                    <a href="tel:02642957129" className="text-sau-blue hover:text-sau-light-blue transition-colors">
                      0 (264) 295 71 29
                    </a>
                  </div>

                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail className="h-5 w-5 text-sau-blue" />
                    <span>E-posta:</span>
                    <a href="mailto:islf@sakarya.edu.tr" className="text-sau-blue hover:text-sau-light-blue transition-colors">
                      islf@sakarya.edu.tr
                    </a>
                  </div>

                  <div className="flex items-center gap-2 text-gray-700">
                    <Globe className="h-5 w-5 text-sau-blue" />
                    <span>Web:</span>
                    <a href="https://islf.sakarya.edu.tr" target="_blank" rel="noopener noreferrer" className="text-sau-blue hover:text-sau-light-blue transition-colors">
                      islf.sakarya.edu.tr
                    </a>
                  </div>

                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock className="h-5 w-5 text-sau-blue" />
                    <span>Çalışma Saatleri:</span>
                    <span>Pazartesi - Cuma: 08:00 - 17:00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}