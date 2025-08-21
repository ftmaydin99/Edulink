import React from 'react';

export function Footer() {
  return (
    <footer className="bg-gray-100 mt-auto py-3 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between text-sm">
          <a 
            href="https://isletme.sakarya.edu.tr/tr" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex flex-col text-gray-500 hover:text-gray-700 transition-colors"
          >
            <span>Sakarya Üniversitesi</span>
            <span>İşletme Fakültesi</span>
          </a>
          <div className="text-gray-500 text-center">
            © 2025 Sakarya Üniversitesi İşletme Fakültesi. Tüm hakları saklıdır.
          </div>
          <div className="w-[120px]"></div>
        </div>
      </div>
    </footer>
  );
}