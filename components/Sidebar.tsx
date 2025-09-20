import React from 'react';
import { FEATURES } from '../constants';
import type { Feature } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface SidebarProps {
  activeFeature: Feature;
  setActiveFeature: (feature: Feature) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeFeature, setActiveFeature, isOpen, setIsOpen }) => {
  const { t } = useLanguage();

  const handleFeatureClick = (feature: Feature) => {
    setActiveFeature(feature);
    if (window.innerWidth < 768) { // md breakpoint
        setIsOpen(false);
    }
  };

  return (
    <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-brand-green text-white flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-4 border-b border-green-700 flex items-center justify-center md:justify-start">
         <img
          src="https://storage.googleapis.com/aistudio-hub-generative-ai/e491c121-724d-4702-901a-6a5c9f5f0d61/logo.png"
          alt="AgriGenius Logo"
          className="h-10 w-10 md:h-12 md:w-12 rounded-full object-cover"
        />
        <h1 className="text-xl font-bold ml-3 tracking-wider">{t('sidebar.title', 'AgriGenius')}</h1>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-2">
        {FEATURES.map((feature) => (
          <button
            key={feature.id}
            onClick={() => handleFeatureClick(feature)}
            className={`w-full flex items-center p-3 rounded-lg transition-colors ${
              activeFeature.id === feature.id
                ? 'bg-brand-light-green text-white'
                : 'text-green-100 hover:bg-green-600 hover:bg-opacity-75'
            }`}
          >
            {feature.icon}
            <span className="ml-4 font-semibold">{t(feature.name)}</span>
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-green-700">
        <button className="w-full flex items-center p-3 rounded-lg text-green-100 hover:bg-green-600 hover:bg-opacity-75">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="ml-4 font-semibold">{t('sidebar.logout', 'Logout')}</span>
        </button>
      </div>
    </aside>
  );
};