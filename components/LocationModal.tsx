import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface LocationModalProps {
  onAllow: () => Promise<void>;
  onManual: () => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({ onAllow, onManual }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  const handleAllowClick = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      await onAllow();
      // On success, the parent component will close this modal.
    } catch (err: any) {
      setError(err.message || 'Could not get location. Please check your browser settings and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full transform transition-all">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-brand-light-green/20 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-brand-light-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{t('locationModal.title')}</h3>
          <p className="mt-3 text-gray-600 dark:text-gray-400">
            {t('locationModal.description')}
          </p>
        </div>
        
        {error && (
            <div className="mt-4 text-center text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 p-3 rounded-lg">
                {error}
            </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            onClick={handleAllowClick}
            disabled={isProcessing}
            className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-3 bg-brand-green text-base font-medium text-white hover:bg-brand-light-green focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-light-green disabled:bg-gray-400 transition"
          >
            {isProcessing ? t('locationModal.detecting') : t('locationModal.allowButton')}
          </button>
          <button
            onClick={onManual}
            className="w-full inline-flex justify-center rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-3 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-light-green transition"
          >
            {t('locationModal.manualButton')}
          </button>
        </div>
      </div>
    </div>
  );
};
