import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, UserCircle2 } from 'lucide-react';

interface Faculty {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}

const YEAR_OPTIONS = ['Hazırlık', '1. Sınıf', '2. Sınıf', '3. Sınıf', '4. Sınıf'];

export function StudentAuth() {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(!searchParams.get('register'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    async function fetchFaculties() {
      const { data, error } = await supabase
        .from('faculties')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Fakülteler yüklenirken hata:', error);
        return;
      }
      
      setFaculties(data || []);
    }

    fetchFaculties();
  }, []);

  useEffect(() => {
    async function fetchDepartments() {
      if (!facultyId) {
        setDepartments([]);
        return;
      }

      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('faculty_id', facultyId)
        .order('name');
      
      if (error) {
        console.error('Bölümler yüklenirken hata:', error);
        return;
      }
      
      setDepartments(data || []);
      setDepartmentId('');
    }

    fetchDepartments();
  }, [facultyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!email.endsWith('@ogr.sakarya.edu.tr')) {
        throw new Error('Lütfen geçerli bir öğrenci e-posta adresi giriniz');
      }

      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (signInError) {
          if (signInError.message === 'Invalid login credentials') {
            throw new Error('Geçersiz e-posta veya şifre. Lütfen tekrar deneyin.');
          }
          throw signInError;
        }
        
        navigate('/ogrenci-panel');
      } else {
        if (!facultyId || !departmentId || !year) {
          throw new Error('Lütfen fakülte, bölüm ve sınıf bilgilerini seçiniz');
        }

        const { data: { user }, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: 'student'
            }
          }
        });

        if (signUpError) {
          if (signUpError.message.includes('User already registered')) {
            setError('Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapın.');
            setIsLogin(true);
            setLoading(false);
            return;
          }
          throw signUpError;
        }

        if (!user?.id) {
          throw new Error('Kullanıcı kaydı başarısız oldu. Lütfen tekrar deneyin.');
        }

        const { error: insertError } = await supabase
          .from('students')
          .insert([{ 
            id: user.id,
            email,
            name,
            faculty_id: facultyId,
            department_id: departmentId,
            year
          }]);
        
        if (insertError) {
          await supabase.auth.signOut();
          
          if (insertError.message.includes('violates row-level security policy')) {
            throw new Error('Güvenlik politikası hatası. Lütfen daha sonra tekrar deneyin.');
          }
          throw insertError;
        }

        navigate('/ogrenci-giris');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
          <div className="text-center">
            <UserCircle2 className="mx-auto h-12 w-12 text-[#005baa]" />
            <h2 className="mt-3 text-2xl font-bold text-gray-900">
              {isLogin ? 'Öğrenci Girişi' : 'Öğrenci Kaydı'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Sakarya Üniversitesi İşletme Fakültesi Randevu Sistemi
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-lg rounded-lg sm:px-10">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {!isLogin && (
                <>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Ad Soyad
                    </label>
                    <div className="mt-1">
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#005baa] focus:border-[#005baa] sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="faculty" className="block text-sm font-medium text-gray-700">
                      Fakülte
                    </label>
                    <div className="mt-1">
                      <select
                        id="faculty"
                        name="faculty"
                        required
                        value={facultyId}
                        onChange={(e) => setFacultyId(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#005baa] focus:border-[#005baa] sm:text-sm"
                      >
                        <option value="">Seçiniz</option>
                        {faculties.map((faculty) => (
                          <option key={faculty.id} value={faculty.id}>
                            {faculty.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                      Bölüm
                    </label>
                    <div className="mt-1">
                      <select
                        id="department"
                        name="department"
                        required
                        value={departmentId}
                        onChange={(e) => setDepartmentId(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#005baa] focus:border-[#005baa] sm:text-sm"
                        disabled={!facultyId}
                      >
                        <option value="">Seçiniz</option>
                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                      Sınıf
                    </label>
                    <div className="mt-1">
                      <select
                        id="year"
                        name="year"
                        required
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#005baa] focus:border-[#005baa] sm:text-sm"
                      >
                        <option value="">Seçiniz</option>
                        {YEAR_OPTIONS.map((yearOption) => (
                          <option key={yearOption} value={yearOption}>
                            {yearOption}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  E-posta
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#005baa] focus:border-[#005baa] sm:text-sm"
                    placeholder="@ogr.sakarya.edu.tr"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Şifre
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#005baa] focus:border-[#005baa] sm:text-sm"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        {error}
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#005baa] hover:bg-[#0070d4] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005baa] disabled:opacity-50 transition-colors"
                >
                  {loading ? 'İşleniyor...' : (isLogin ? 'Giriş Yap' : 'Kayıt Ol')}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="w-full text-center text-sm text-[#005baa] hover:text-[#0070d4] transition-colors"
              >
                {isLogin ? 'Hesabınız yok mu? Kayıt olun' : 'Zaten hesabınız var mı? Giriş yapın'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}