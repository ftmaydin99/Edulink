import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Users, Clock, CheckCircle2 } from 'lucide-react';
import { StudentAuth } from './pages/StudentAuth';
import { LecturerAuth } from './pages/LecturerAuth';
import { LecturerPasswordChange } from './pages/LecturerPasswordChange';
import { StudentDashboard } from './pages/StudentDashboard';
import { LecturerDashboard } from './pages/LecturerDashboard';
import { LecturerAppointments } from './pages/LecturerAppointments';
import { LecturerNotes } from './pages/LecturerNotes';
import { Profile } from './pages/Profile';
import { AppointmentCreate } from './pages/AppointmentCreate';
import { AppointmentsList } from './pages/AppointmentsList';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import { LecturerContact } from './pages/LecturerContact';
import { RegisterSelection } from './pages/RegisterSelection';
import { LoginSelection } from './pages/LoginSelection';
import { supabase } from './lib/supabase';
import { Footer } from './components/Footer';

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate('/giris-yap');
      } else if (event === 'USER_DELETED' || event === 'TOKEN_REFRESHED' && !session) {
        navigate('/giris-yap');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <AuthWrapper>
        <Routes>
          <Route path="/ogrenci-panel" element={<StudentDashboard />} />
          <Route path="/ogretim-elemani-panel" element={<LecturerDashboard />} />
          <Route path="/ogretim-elemani/randevu-talepleri" element={<LecturerAppointments />} />
          <Route path="/ogretim-elemani/notlarim" element={<LecturerNotes />} />
          <Route path="/ogrenci-giris" element={<StudentAuth />} />
          <Route path="/ogretim-elemani-giris" element={<LecturerAuth />} />
          <Route path="/ogretim-elemani/sifre-degistir" element={<LecturerPasswordChange />} />
          <Route path="/profil" element={<Profile />} />
          <Route path="/randevu-al" element={<AppointmentCreate />} />
          <Route path="/randevularim" element={<AppointmentsList />} />
          <Route path="/hakkimizda" element={<About />} />
          <Route path="/iletisim" element={<Contact />} />
          <Route path="/ogretim-elemani/iletisim" element={<LecturerContact />} />
          <Route path="/kayit-ol" element={<RegisterSelection />} />
          <Route path="/giris-yap" element={<LoginSelection />} />
          <Route path="/" element={
            <>
              <div className="min-h-screen bg-gray-50 flex flex-col">
                <nav className="bg-[#005baa] shadow-lg">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                      <div className="flex items-center space-x-8">
                        <div className="flex-shrink-0 flex items-center">
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

                <main className="flex-grow">
                  <div className="py-12 bg-[#005baa]/5">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                      <div className="text-center">
                        <h1 className="text-4xl font-bold text-gray-900">
                          Sakarya Üniversitesi İşletme Fakültesi
                        </h1>
                        <p className="text-4xl font-bold text-gray-900 mt-4">
                          Randevu Sistemi
                        </p>
                        <div className="mt-8 flex justify-center gap-4">
                          <a 
                            href="/ogrenci-giris?register=true" 
                            className="bg-[#005baa] text-white px-8 py-3 rounded-md text-lg font-medium hover:bg-[#0070d4] transition-colors shadow-md"
                          >
                            Kayıt Ol
                          </a>
                          <a 
                            href="/giris-yap" 
                            className="bg-white text-[#005baa] px-8 py-3 rounded-md text-lg font-medium border-2 border-[#005baa] hover:bg-gray-50 transition-colors shadow-md"
                          >
                            Giriş Yap
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="py-12">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                      <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
                        Sistemin Özellikleri
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="bg-white p-6 rounded-lg shadow-md text-center">
                          <div className="flex justify-center mb-4">
                            <Users className="h-12 w-12 text-[#005baa]" />
                          </div>
                          <h3 className="text-xl font-semibold mb-2">Kolay Randevu Sistemi</h3>
                          <p className="text-gray-600">
                            Akademisyenlerin müsait olduğu zamanları görebilir ve kolayca randevu alabilirsiniz
                          </p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-md text-center">
                          <div className="flex justify-center mb-4">
                            <Users className="h-12 w-12 text-[#005baa]" />
                          </div>
                          <h3 className="text-xl font-semibold mb-2">Akademisyen Profilleri</h3>
                          <p className="text-gray-600">
                            Tüm akademisyenlere tek bir yerden ulaşabilirsiniz
                          </p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-md text-center">
                          <div className="flex justify-center mb-4">
                            <Clock className="h-12 w-12 text-[#005baa]" />
                          </div>
                          <h3 className="text-xl font-semibold mb-2">Randevu Takibi</h3>
                          <p className="text-gray-600">
                            Onaylanan, bekleyen ve geçmiş randevularınızı kolayca takip edebilirsiniz
                          </p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-md text-center">
                          <div className="flex justify-center mb-4">
                            <CheckCircle2 className="h-12 w-12 text-[#005baa]" />
                          </div>
                          <h3 className="text-xl font-semibold mb-2">Durum Bildirimleri</h3>
                          <p className="text-gray-600">
                            Randevularınızın durumu değiştiğinde anında haberdar olursunuz
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </main>

                <Footer />
              </div>
            </>
          } />
        </Routes>
      </AuthWrapper>
    </Router>
  );
}

export default App;