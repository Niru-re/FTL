import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageCode } from '../../i18n/translations';

export const LanguageSelector: React.FC<{ variant?: 'light' | 'dark' | 'compact' }> = ({ variant = 'light' }) => {
  const { language, setLanguage } = useLanguage();

  const options: { code: LanguageCode; label: string; short: string }[] = [
    { code: 'en', label: 'English', short: 'EN' },
    { code: 'hi', label: 'हिन्दी', short: 'HI' },
    { code: 'mr', label: 'मराठी', short: 'MR' }
  ];

  return (
    <div className="flex items-center gap-1 bg-slate-100/90 p-0.5 rounded-xl border border-slate-200 shadow-2xs">
      <div className="pl-1.5 pr-0.5 text-gray-400 flex items-center">
        <Globe className="w-3.5 h-3.5 text-orange-500" />
      </div>
      {options.map((opt) => (
        <button
          key={opt.code}
          type="button"
          onClick={() => setLanguage(opt.code)}
          className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
            language === opt.code
              ? 'bg-white text-orange-600 shadow-xs border border-orange-200'
              : 'text-slate-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-slate-900 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-slate-200/50'
          }`}
          title={opt.label}
        >
          {variant === 'compact' ? opt.short : opt.label}
        </button>
      ))}
    </div>
  );
};
