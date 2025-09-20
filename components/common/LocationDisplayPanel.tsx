import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

const MapPinIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-brand-green dark:text-brand-light-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

interface LocationDisplayPanelProps {
  location: string | null;
}

export const LocationDisplayPanel: React.FC<LocationDisplayPanelProps> = ({ location }) => {
  const { t } = useLanguage();

  if (!location) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-8 flex items-start space-x-4 border-l-4 border-brand-light-green">
      <div className="flex-shrink-0 pt-1">
        <MapPinIcon />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('common.showingResultsFor', 'Showing results for:')}</p>
        <p className="text-lg font-bold text-gray-800 dark:text-white">{location}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('common.locationApproximation', '(Location is an approximation. Enter a specific address for best results.)')}</p>
      </div>
    </div>
  );
};
