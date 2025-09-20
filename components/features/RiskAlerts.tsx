import React, { useState, useCallback, useEffect } from 'react';
import { getRiskAlerts } from '../../services/geminiService';
import type { RiskAlert, GroundingSource } from '../../types';
import { Spinner } from '../common/Spinner';
import { SourceList } from '../common/SourceList';
import { useLanguage } from '../../context/LanguageContext';
import { languages } from '../../i18n';
import { setCachedData, getCachedData } from '../../services/offlineService';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { LocationDisplayPanel } from '../common/LocationDisplayPanel';

type LanguageCode = keyof typeof languages;

interface RiskAlertsProps {
    userLocation: string | null;
    onLocationChange: (location: string) => void;
    onDetectLocation: () => Promise<void>;
    lang: LanguageCode;
}

const severityStyles = {
    High: 'bg-red-100 text-red-800 border-red-500 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
    Medium: 'bg-yellow-100 text-yellow-800 border-yellow-500 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700',
    Low: 'bg-blue-100 text-blue-800 border-blue-500 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
};

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

export const RiskAlerts: React.FC<RiskAlertsProps> = ({ userLocation, onLocationChange, onDetectLocation, lang }) => {
    const [alerts, setAlerts] = useState<RiskAlert[]>([]);
    const [sources, setSources] = useState<GroundingSource[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDetecting, setIsDetecting] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const isOnline = useOfflineStatus();
    const { t } = useLanguage();

    const location = userLocation || '';

    useEffect(() => {
        const cached = getCachedData<{alerts: RiskAlert[], sources: GroundingSource[]}>('riskAlerts');
        if (cached) {
            setAlerts(cached.data.alerts);
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
        setAlerts([]);
        setSources([]);

        try {
            const result = await getRiskAlerts(location, lang);
            setAlerts(result.alerts);
            setSources(result.sources);
            setCachedData('riskAlerts', result);
            setLastUpdated(new Date().toISOString());
        } catch (err) {
            setError(t('riskAlerts.fetchError'));
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
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('riskAlerts.locationLabel', 'Enter Location to Scan')}</label>
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
                        {loading ? t('riskAlerts.scanning') : t('riskAlerts.checkRisks')}
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

            <div className="space-y-4">
                {alerts.map((alert, index) => (
                    <div key={index} className={`p-5 rounded-lg shadow-lg border-l-4 bg-white dark:bg-gray-800 ${severityStyles[alert.severity]}`}>
                        <div className="flex justify-between items-start">
                             <div>
                                <p className={`text-sm font-bold`}>{alert.risk_type}</p>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{alert.description}</h3>
                             </div>
                             <span className={`px-3 py-1 text-sm font-semibold rounded-full ${severityStyles[alert.severity]}`}>
                                {alert.severity}
                            </span>
                        </div>
                        <p className="mt-2 text-gray-600 dark:text-gray-300"><strong>{t('riskAlerts.recommendation')}:</strong> {alert.recommendation}</p>
                    </div>
                ))}
            </div>

            <SourceList sources={sources} />

            {!loading && alerts.length === 0 && !error && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <h2 className="text-2xl font-semibold mb-2">{t('riskAlerts.allClearTitle')}</h2>
                    <p>{t('riskAlerts.allClearDescription')}</p>
                </div>
            )}
        </div>
    );
};
