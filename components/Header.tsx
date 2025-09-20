import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { languages } from '../i18n';

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const DefaultUserIcon: React.FC<{className?: string}> = ({className}) => (
     <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
     </svg>
);

const MenuIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

interface HeaderProps {
  title: string;
  description: string;
  theme: string;
  toggleTheme: () => void;
  userName: string | null;
  profileImage: string | null;
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, description, theme, toggleTheme, userName, profileImage, onMenuClick }) => {
  const { lang, setLang, t } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setShowLangMenu(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleLangChange = (langCode: keyof typeof languages) => {
    setLang(langCode);
    setShowLangMenu(false);
  }

  return (
    <header className="bg-white shadow-sm p-4 border-b-2 border-gray-100 flex justify-between items-center dark:bg-gray-800 dark:border-gray-700 flex-shrink-0">
      <div className="flex items-center">
        <button 
            onClick={onMenuClick} 
            className="p-1 mr-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 md:hidden"
            aria-label={t('header.openMenu', 'Open menu')}
        >
            <MenuIcon />
        </button>
        <div>
            <h1 className="text-xl md:text-2xl font-bold text-brand-green dark:text-brand-light-green">{title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 hidden md:block">{description}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2 md:space-x-4">
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="px-2 md:px-4 py-2 text-sm font-semibold rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-light-green"
                aria-label={t('header.changeLanguage', 'Change language')}
            >
                {t('header.language', 'Language')}
            </button>
            {showLangMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
                    <ul className="py-1">
                        {Object.entries(languages).map(([code, { nativeName }]) => (
                            <li key={code}>
                                <button
                                    onClick={() => handleLangChange(code as keyof typeof languages)}
                                    className={`w-full text-left px-4 py-2 text-sm ${lang === code ? 'font-bold bg-gray-100 dark:bg-gray-600' : ''} text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600`}
                                >
                                    {nativeName}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-light-green"
          aria-label="Toggle dark mode"
        >
          {theme === 'light' ? <MoonIcon /> : <SunIcon />}
        </button>
        <span className="text-gray-700 hidden md:block dark:text-gray-300">
            {userName ? t('header.welcomeUser', 'Welcome, {name}!').replace('{name}', userName) : t('header.welcome', 'Welcome, Farmer!')}
        </span>
        <div className="h-10 w-10 rounded-full object-cover bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
            {profileImage ? (
                <img
                  src={profileImage}
                  alt="User profile"
                  className="h-full w-full object-cover"
                />
            ) : (
                <DefaultUserIcon className="h-full w-full text-gray-400 dark:text-gray-500 p-1" />
            )}
        </div>
      </div>
    </header>
  );
};