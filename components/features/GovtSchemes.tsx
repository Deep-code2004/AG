import React, { useState, useCallback, useEffect } from 'react';
import { getGovtSchemes } from '../../services/geminiService';
import type { GovtScheme, GroundingSource } from '../../types';
import { Spinner } from '../common/Spinner';
import { SourceList } from '../common/SourceList';
import { useLanguage } from '../../context/LanguageContext';
import { languages } from '../../i18n';
import { setCachedData, getCachedData } from '../../services/offlineService';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { LocationDisplayPanel } from '../common/LocationDisplayPanel';

type LanguageCode = keyof typeof languages;

interface GovtSchemesProps {
    userLocation: string | null;
    onLocationChange: (location: string) => void;
    onDetectLocation: () => Promise<void>;
    lang: LanguageCode;
}

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

export const GovtSchemes: React.FC<GovtSchemesProps> = ({ userLocation, onLocationChange, onDetectLocation, lang }) => {
    const [schemes, setSchemes] = useState<GovtScheme[]>([]);
    const [sources, setSources] = useState<GroundingSource[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDetecting, setIsDetecting] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const isOnline = useOfflineStatus();
    const { t } = useLanguage();

    const location = userLocation || '';

    useEffect(() => {
        const cached = getCachedData<{schemes: GovtScheme[], sources: GroundingSource[]}>('govtSchemes');
        if (cached) {
            setSchemes(cached.data.schemes);
            setSources(cached.data.sources);
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
        setSchemes([]);
        setSources([]);

        try {
            const result = await getGovtSchemes(location, lang);
            setSchemes(result.schemes);
            setSources(result.sources);
            setCachedData('govtSchemes', result);
            setLastUpdated(new Date().toISOString());
        } catch (err) {
            setError(t('govtSchemes.fetchError'));
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [location, lang, t, isOnline]);

    return (
        <div className="max-w-7xl mx-auto">
            <LocationDisplayPanel location={userLocation} />
            <div className="bg-white p-6 rounded-lg shadow-md mb-8 dark:bg-gray-800">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-2">
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('govtSchemes.locationLabel', 'Enter Location for Schemes')}</label>
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
                    <button type="submit" disabled={loading || !location || !isOnline} className="w-full bg-brand-green hover:bg-brand-light-green text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-400">
                        {loading ? t('govtSchemes.searching') : t('govtSchemes.findSchemes')}
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
            
            <div className="space-y-6">
                {schemes.map((scheme, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden transition-shadow hover:shadow-xl dark:bg-gray-800">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-brand-green mb-2 dark:text-brand-light-green">{scheme.schemeName}</h3>
                            <p className="text-gray-600 mb-4 dark:text-gray-400">{scheme.description}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="bg-green-50 p-4 rounded-md dark:bg-green-900/50">
                                    <h4 className="font-semibold text-brand-green mb-1 dark:text-brand-light-green">{t('govtSchemes.eligibility')}</h4>
                                    <p className="text-gray-700 dark:text-gray-300">{scheme.eligibility}</p>
                                </div>
                                <div className="bg-yellow-50 p-4 rounded-md dark:bg-yellow-900/50">
                                    <h4 className="font-semibold text-brand-brown mb-1 dark:text-yellow-300">{t('govtSchemes.benefits')}</h4>
                                    <p className="text-gray-700 dark:text-gray-300">{scheme.benefits}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <SourceList sources={sources} />

            {!loading && schemes.length === 0 && !error && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <h2 className="text-2xl font-semibold mb-2">{t('govtSchemes.discoverTitle')}</h2>
                    <p>{t('govtSchemes.discoverDescription')}</p>
                </div>
            )}
        </div>
    );
};
