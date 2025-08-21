import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Camera, Mail, Building2, GraduationCap, School, BookOpen, Briefcase, Lock, Upload, CheckCircle2, Trash2, Award } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

interface Student {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  faculty_name?: string;
  department_name?: string;
  year?: string;
}

interface Lecturer {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  faculty_name?: string;
  department_name?: string;
  title?: string;
}

export function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<Student | Lecturer | null>(null);
  const [isStudent, setIsStudent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    async function fetchUserData() {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError) throw authError;
        if (!authUser) {
          navigate('/giris-yap');
          return;
        }

        // First try to fetch student data
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select(`
            id,
            name,
            email,
            avatar_url,
            faculties (name),
            departments (name),
            year
          `)
          .eq('id', authUser.id)
          .maybeSingle();

        if (!studentError && studentData) {
          const userData = {
            ...studentData,
            faculty_name: studentData.faculties?.name,
            department_name: studentData.departments?.name
          };
          setUser(userData);
          setIsStudent(true);
          setLoading(false);
          return;
        }

        // If not a student, try lecturer
        const { data: lecturerData, error: lecturerError } = await supabase
          .from('lecturers')
          .select(`
            id,
            name,
            email,
            avatar_url,
            title,
            faculties (name),
            departments (name)
          `)
          .eq('id', authUser.id)
          .maybeSingle();

        if (!lecturerError && lecturerData) {
          const userData = {
            ...lecturerData,
            faculty_name: lecturerData.faculties?.name,
            department_name: lecturerData.departments?.name
          };
          setUser(userData);
          setIsStudent(false);
          setLoading(false);
          return;
        }

        // If we get here, no valid user profile was found
        throw new Error('Kullanıcı profili bulunamadı');
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err.message || 'Profil bilgileri yüklenirken bir hata oluştu');
        setLoading(false);
      }
    }

    fetchUserData();
  }, [navigate]);

  const handlePasswordChange = async () => {
    try {
      setPasswordError(null);
      setPasswordSuccess(false);
      setUpdating(true);

      if (newPassword.length < 6) {
        throw new Error('Şifre en az 6 karakter olmalıdır');
      }

      if (newPassword !== confirmPassword) {
        throw new Error('Şifreler eşleşmiyor');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(false);
      }, 2000);
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        throw new Error('Lütfen geçerli bir resim dosyası seçin');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Dosya boyutu 5MB\'dan küçük olmalıdır');
      }

      setUploadingPhoto(true);
      setError(null);
      setUploadSuccess(false);

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Kullanıcı bulunamadı');

      // Delete existing avatar if any
      await supabase.storage
        .from('profiles')
        .remove([`avatars/${authUser.id}.jpg`]);
      await supabase.storage
        .from('profiles')
        .remove([`avatars/${authUser.id}.jpeg`]);
      await supabase.storage
        .from('profiles')
        .remove([`avatars/${authUser.id}.png`]);
      await supabase.storage
        .from('profiles')
        .remove([`avatars/${authUser.id}.gif`]);

      const fileExt = file.name.split('.').pop();
      const fileName = `${authUser.id}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from(isStudent ? 'students' : 'lecturers')
        .update({ avatar_url: publicUrl })
        .eq('id', authUser.id);

      if (updateError) throw updateError;

      setUser(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      setUploadSuccess(true);

      setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoDelete = async () => {
    try {
      setUploadingPhoto(true);
      setError(null);
      setUploadSuccess(false);

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Kullanıcı bulunamadı');

      await supabase.storage
        .from('profiles')
        .remove([
          `avatars/${authUser.id}.jpg`,
          `avatars/${authUser.id}.jpeg`,
          `avatars/${authUser.id}.png`,
          `avatars/${authUser.id}.gif`
        ]);

      const { error: updateError } = await supabase
        .from(isStudent ? 'students' : 'lecturers')
        .update({ avatar_url: null })
        .eq('id', authUser.id);

      if (updateError) throw updateError;

      setUser(prev => prev ? { ...prev, avatar_url: undefined } : null);
      setUploadSuccess(true);

      setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#005baa]/10 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005baa]"></div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#005baa]/10 to-white flex items-center justify-center">
        <div className="text-red-600">{error || 'Bir hata oluştu'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#005baa]/10 to-white flex flex-col">
      <Header 
        userName={user.name}
        userRole={isStudent ? 'student' : 'lecturer'}
      />
      <div className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="relative h-48 bg-gradient-to-r from-[#005baa] to-[#0070d4]">
            <div className="absolute -bottom-16 left-8">
              <div className="relative">
                <div className="w-32 h-32 rounded-2xl bg-white flex items-center justify-center overflow-hidden shadow-lg">
                  {user.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[#005baa] text-5xl font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="absolute bottom-2 right-2 flex gap-2">
                  <label className="bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                    />
                    {uploadingPhoto ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#005baa]" />
                    ) : (
                      <Camera className="w-4 h-4 text-[#005baa]" />
                    )}
                  </label>
                  {user.avatar_url && (
                    <button
                      onClick={handlePhotoDelete}
                      disabled={uploadingPhoto}
                      className="bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {uploadSuccess && (
            <div className="mt-20 mx-8 mb-4 flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
              <span>Profil fotoğrafı başarıyla güncellendi</span>
            </div>
          )}

          <div className="mt-20 px-8 pb-8">
            <div className="space-y-8">
              {/* 1. Grup - Rol ve Unvan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-[#005baa]/10 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-[#005baa]" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Rol</p>
                    <p className="text-gray-900">{isStudent ? 'Öğrenci' : 'Akademisyen'}</p>
                  </div>
                </div>

                {!isStudent && (user as Lecturer).title ? (
                  <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-[#005baa]/10 flex items-center justify-center">
                      <Award className="h-5 w-5 text-[#005baa]" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Unvan</p>
                      <p className="text-gray-900">{(user as Lecturer).title}</p>
                    </div>
                  </div>
                ) : isStudent ? (
                  <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-[#005baa]/10 flex items-center justify-center">
                      <GraduationCap className="h-5 w-5 text-[#005baa]" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Sınıf</p>
                      <p className="text-gray-900">{(user as Student).year || '-'}</p>
                    </div>
                  </div>
                ) : (
                  <div></div>
                )}
              </div>

              {/* 2. Grup - Fakülte ve Bölüm */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-[#005baa]/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-[#005baa]" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Fakülte</p>
                    <p className="text-gray-900">{user.faculty_name || '-'}</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-[#005baa]/10 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-[#005baa]" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Bölüm</p>
                    <p className="text-gray-900">{user.department_name || '-'}</p>
                  </div>
                </div>
              </div>

              {/* 3. Grup - E-posta ve Şifre */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-[#005baa]/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-[#005baa]" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">E-posta</p>
                    <p className="text-gray-900">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-[#005baa]/10 flex items-center justify-center">
                    <Lock className="h-5 w-5 text-[#005baa]" />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-500">Şifre</p>
                    <button
                      onClick={() => setShowPasswordModal(true)}
                      className="text-[#005baa] hover:text-[#0070d4] transition-colors text-sm font-medium"
                    >
                      Şifreyi Değiştir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Şifre Değiştirme Modalı */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Şifre Değiştir</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yeni Şifre
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="En az 6 karakter"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Şifre Onayı
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Şifreyi tekrar girin"
                />
              </div>

              {passwordError && (
                <p className="text-sm text-red-600">{passwordError}</p>
              )}

              {passwordSuccess && (
                <p className="text-sm text-green-600">Şifreniz başarıyla değiştirildi!</p>
              )}

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError(null);
                    setPasswordSuccess(false);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  İptal
                </button>
                <button
                  onClick={handlePasswordChange}
                  disabled={updating || !newPassword || !confirmPassword}
                  className="px-4 py-2 bg-[#005baa] text-white rounded-md hover:bg-[#0070d4] transition-colors disabled:opacity-50"
                >
                  {updating ? 'Değiştiriliyor...' : 'Değiştir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}