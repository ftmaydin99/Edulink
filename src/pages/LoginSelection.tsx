import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GraduationCap, UserSquare2 } from 'lucide-react';

export function LoginSelection() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <nav className="bg-[#005baa] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="flex-shrink-0 flex items-center">
                <a 
                  href="/" 
                  className="flex items-center hover:opacity-80 transition-opacity"
                >
                  <img 
                    src="https://islf.sakarya.edu.tr/assets/saufakulte/images/img_saulogo.png"
                    alt="SAU Logo"
                    className="h-8 w-auto"
                  />
                  <div className="ml-2 flex flex-col">
                    <span className="text-lg font-semibold text-white leading-tight">
                      SAKARYA ÜNİVERSİTESİ
                    </span>
                    <span className="text-sm text-white/90">
                      Edulink
                    </span>
                  </div>
                </a>
              </div>
              <div className="flex items-center space-x-4">
                <a href="/hakkimizda" className="text-white hover:text-white/80 transition-colors">
                  Hakkımızda
                </a>
                <a href="/iletisim" className="text-white hover:text-white/80 transition-colors">
                  İletişim
                </a>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a 
                href="/giris-yap" 
                className="bg-[#005baa] text-white px-4 py-2 rounded-md border border-white hover:bg-[#0070d4] transition-colors"
              >
                Giriş
              </a>
              <a 
                href="/ogrenci-giris?register=true" 
                className="bg-[#005baa] text-white px-4 py-2 rounded-md border border-white hover:bg-[#0070d4] transition-colors"
              >
                Kayıt Ol
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-grow py-12 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <a href="/" className="inline-flex items-center text-[#005baa] hover:text-[#0070d4] mb-8">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Ana Sayfaya Dön
          </a>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Giriş Yap
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sakarya Üniversitesi İşletme Fakültesi Randevu Sistemi
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-lg rounded-lg sm:px-10">
            <div className="space-y-4">
              <button
                onClick={() => navigate('/ogrenci-giris')}
                className="w-full flex items-center justify-center gap-3 px-4 py-4 border-2 border-[#005baa] rounded-lg text-[#005baa] hover:bg-[#005baa] hover:text-white transition-colors"
              >
                <GraduationCap className="h-6 w-6" />
                <span className="text-lg font-medium">Öğrenci Girişi</span>
              </button>

              <button
                onClick={() => navigate('/ogretim-elemani-giris')}
                className="w-full flex items-center justify-center gap-3 px-4 py-4 border-2 border-[#005baa] rounded-lg text-[#005baa] hover:bg-[#005baa] hover:text-white transition-colors"
              >
                <UserSquare2 className="h-6 w-6" />
                <span className="text-lg font-medium">Akademisyen Girişi</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}