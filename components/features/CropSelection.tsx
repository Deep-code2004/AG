import React, { useState, useCallback, useEffect } from 'react';
import { getCropRecommendations } from '../../services/geminiService';
import type { CropRecommendation } from '../../types';
import { Spinner } from '../common/Spinner';
import { useLanguage } from '../../context/LanguageContext';
import { languages } from '../../i18n';
import { setCachedData, getCachedData } from '../../services/offlineService';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { LocationDisplayPanel } from '../common/LocationDisplayPanel';

type LanguageCode = keyof typeof languages;

interface CropSelectionProps {
    userLocation: string | null;
    onLocationChange: (location: string) => void;
    onDetectLocation: () => Promise<void>;
    lang: LanguageCode;
}

const FeatureCard: React.FC<{ title: string; children: React.ReactNode; icon: React.ReactNode }> = ({ title, children, icon }) => (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 dark:bg-gray-800">
        <div className="p-6">
            <div className="flex items-center mb-4">
                <div className="p-3 bg-brand-light-green/20 rounded-full mr-4 text-brand-light-green">
                    {icon}
                </div>
                <h3 className="text-xl font-bold text-brand-green dark:text-brand-light-green">{title}</h3>
            </div>
            {children}
        </div>
    </div>
);

const LeafIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const LocationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-hover:text-brand-light-green transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const MiniSpinner = () => (
    <svg className="animate-spin h-5 w-5 text-brand-green" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


export const CropSelection: React.FC<CropSelectionProps> = ({ userLocation, onLocationChange, onDetectLocation, lang }) => {
    const [soilType, setSoilType] = useState('Loamy');
    const [rainfall, setRainfall] = useState('750');
    const [recommendations, setRecommendations] = useState<CropRecommendation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDetecting, setIsDetecting] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const isOnline = useOfflineStatus();
    const { t } = useLanguage();

    const location = userLocation || '';
    
    useEffect(() => {
        const cached = getCachedData<CropRecommendation[]>('cropRecommendations');
        if (cached) {
            setRecommendations(cached.data);
            setLastUpdated(cached.timestamp);
        }
    }, []);

    const handleDetectLocation = async () => {
        if (!isOnline) {
            alert(t('common.offline'));
            return;
        }
        setIsDetecting(true);
        try {
            if (navigator.permissions) {
                const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
                if (permissionStatus.state === 'denied') {
                    alert("Location access has been blocked. Please enable it in your browser settings to use this feature.");
                    setIsDetecting(false);
                    return;
                }
            }
            await onDetectLocation();
        } catch (e) {
            const message = e instanceof Error ? e.message : "Could not detect location.";
            alert(message);
            console.error("Could not auto-detect location.", e);
        } finally {
            setIsDetecting(false);
        }
    };

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isOnline) {
            alert(t('common.offline'));
            return;
        }
        setLoading(true);
        setError(null);
        setRecommendations([]);

        try {
            const result = await getCropRecommendations(location, soilType, rainfall, lang);
            setRecommendations(result);
            setCachedData('cropRecommendations', result);
            setLastUpdated(new Date().toISOString());
        } catch (err) {
            setError(t('cropSelection.fetchError'));
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [location, soilType, rainfall, lang, t, isOnline]);

    return (
        <div className="max-w-7xl mx-auto">
            <LocationDisplayPanel location={userLocation} />
            <div className="bg-white p-6 rounded-lg shadow-md mb-8 dark:bg-gray-800">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('cropSelection.locationLabel', 'Enter Location / Address')}</label>
                         <div className="relative mt-1">
                            <input type="text" id="location" value={location} onChange={(e) => onLocationChange(e.target.value)} className="block w-full px-3 py-2 pr-10 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-light-green focus:border-brand-light-green text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" />
                             <button 
                                type="button" 
                                onClick={handleDetectLocation}
                                disabled={isDetecting}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 group disabled:opacity-50"
                                aria-label={t('common.useCurrentLocation')}
                            >
                                {isDetecting ? <MiniSpinner/> : <LocationIcon />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="soilType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('cropSelection.soilType')}</label>
                        <select id="soilType" value={soilType} onChange={(e) => setSoilType(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-light-green focus:border-brand-light-green text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <option value="Loamy">{t('cropSelection.loamy')}</option>
                            <option value="Sandy">{t('cropSelection.sandy')}</option>
                            <option value="Clay">{t('cropSelection.clay')}</option>
                            <option value="Alluvial">{t('cropSelection.alluvial')}</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="rainfall" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('cropSelection.rainfall')}</label>
                        <input type="number" id="rainfall" value={rainfall} onChange={(e) => setRainfall(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-light-green focus:border-brand-light-green text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" />
                    </div>
                    <button type="submit" disabled={loading || !location || !isOnline} className="w-full bg-brand-green hover:bg-brand-light-green text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-400">
                        {loading ? t('cropSelection.thinking') : t('cropSelection.getRecommendations')}
                    </button>
                </form>
            </div>

            {loading && <Spinner />}
            {error && <div className="text-center text-red-500 bg-red-100 p-4 rounded-lg dark:bg-red-900/50 dark:text-red-300">{error}</div>}

            {!isOnline && lastUpdated && (
                <div className="text-center text-sm text-gray-600 dark:text-gray-400 bg-yellow-100 dark:bg-yellow-900/40 p-3 rounded-lg mb-4">
                    {t('common.lastUpdated')} {new Date(lastUpdated).toLocaleString()}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {recommendations.map((rec, index) => (
                    <FeatureCard key={index} title={rec.cropName} icon={<LeafIcon />}>
                         <p className="text-gray-600 mb-4 dark:text-gray-400">{rec.reason}</p>
                         <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                            <li><strong>{t('cropSelection.sowingSeason')}:</strong> {rec.sowingSeason}</li>
                            <li><strong>{t('cropSelection.yieldPotential')}:</strong> {rec.yieldPotential}</li>
                            <li><strong>{t('cropSelection.waterNeeds')}:</strong> {rec.waterRequirements}</li>
                        </ul>
                    </FeatureCard>
                ))}
            </div>
            
            {!loading && recommendations.length === 0 && !error && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <h2 className="text-2xl font-semibold mb-2">{t('cropSelection.readyTitle')}</h2>
                    <p>{t('cropSelection.readyDescription')}</p>
                </div>
            )}
        </div>
    );
};
