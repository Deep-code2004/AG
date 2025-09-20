import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { languages } from '../../i18n';
import type { HarvestSaleLog, UserProfile } from '../../types';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { getRewardsPoints, saveRewardsPoints, getHarvestLog, addSaleToHarvestLog } from '../../services/offlineService';
import { getUserProfile } from '../../services/userProfileService';
import { getMarketPriceForSale } from '../../services/geminiService';
import { Spinner } from '../common/Spinner';

type LanguageCode = keyof typeof languages;

interface RewardsProps {
    userLocation: string | null;
    lang: LanguageCode;
}

const TrophyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-brand-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20l4-4m0 0l-4-4m4 4H3" />
    </svg>
);


export const Rewards: React.FC<RewardsProps> = ({ userLocation, lang }) => {
    const { t } = useLanguage();
    const isOnline = useOfflineStatus();

    const [points, setPoints] = useState(0);
    const [harvestLog, setHarvestLog] = useState<HarvestSaleLog[]>([]);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    
    // Form state
    const [cropName, setCropName] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [saleLocation, setSaleLocation] = useState('');
    const [unit, setUnit] = useState<UserProfile['preferredUnit']>('quintal');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        setPoints(getRewardsPoints());
        setHarvestLog(getHarvestLog());
        const userProfile = getUserProfile();
        setProfile(userProfile);
        if (userProfile?.preferredUnit) {
            setUnit(userProfile.preferredUnit);
        }
        if (userLocation) {
            setSaleLocation(userLocation);
        }
    }, [userLocation]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isOnline) {
            setError(t('common.offline'));
            return;
        }
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const marketPrice = await getMarketPriceForSale(cropName, saleLocation, unit, lang);
            const numQuantity = parseFloat(quantity);
            if (isNaN(numQuantity) || numQuantity <= 0) {
                throw new Error(t('rewards.invalidQuantityError', 'Please enter a valid quantity.'));
            }

            const revenue = marketPrice * numQuantity;
            const pointsEarned = Math.round(revenue / 100);

            const newSale: HarvestSaleLog = {
                id: `${Date.now()}`,
                date: new Date().toISOString(),
                cropName,
                quantity: numQuantity,
                unit: unit || 'quintal',
                location: saleLocation,
                calculatedRevenue: revenue,
                pointsEarned,
            };

            // Update state and storage
            addSaleToHarvestLog(newSale);
            const currentPoints = getRewardsPoints();
            const newTotalPoints = currentPoints + pointsEarned;
            saveRewardsPoints(newTotalPoints);

            setPoints(newTotalPoints);
            setHarvestLog(prevLog => [newSale, ...prevLog]);

            setSuccessMessage(`${t('rewards.logSuccessMessageStart')} ${pointsEarned} ${t('rewards.logSuccessMessageEnd')}`);
            // Reset form
            setCropName('');
            setQuantity('1');
            setTimeout(() => setSuccessMessage(null), 5000);

        } catch (err) {
            const message = err instanceof Error ? err.message : t('rewards.logError', 'An unexpected error occurred.');
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
             <div className="bg-gradient-to-r from-brand-green to-brand-light-green text-white p-8 rounded-xl shadow-2xl flex items-center justify-between">
                <div>
                    <p className="text-lg opacity-80">{t('rewards.yourProgress')}</p>
                    <h2 className="text-4xl font-bold">{points.toLocaleString()} {t('rewards.points')}</h2>
                </div>
                <TrophyIcon />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md dark:bg-gray-800">
                <h3 className="text-2xl font-bold text-brand-green mb-4 dark:text-brand-light-green">{t('rewards.logSaleTitle', 'Log a Harvest Sale')}</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label htmlFor="cropName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('rewards.cropNameLabel', 'Crop Name')}</label>
                        <input type="text" id="cropName" value={cropName} onChange={e => setCropName(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-light-green focus:border-brand-light-green text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                     <div>
                        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('rewards.quantityLabel', 'Quantity')}</label>
                        <div className="relative">
                            <input type="number" id="quantity" value={quantity} onChange={e => setQuantity(e.target.value)} required min="0.01" step="0.01" className="mt-1 block w-full px-3 py-2 pr-20 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-light-green focus:border-brand-light-green text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 dark:text-gray-400 text-sm">{t(`units.${unit}`, unit)}</span>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="saleLocation" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('rewards.locationLabel', 'Location of Sale')}</label>
                        <input type="text" id="saleLocation" value={saleLocation} onChange={e => setSaleLocation(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-light-green focus:border-brand-light-green text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                     <button type="submit" disabled={loading || !isOnline} className="w-full bg-brand-green hover:bg-brand-light-green text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-400">
                        {loading ? t('rewards.calculatingButton', 'Calculating...') : t('rewards.logSaleButton', 'Log & Earn Points')}
                    </button>
                </form>
                {error && <div className="mt-4 text-center text-red-500 bg-red-100 p-3 rounded-lg dark:bg-red-900/50 dark:text-red-300">{error}</div>}
                {successMessage && <div className="mt-4 text-center text-green-700 bg-green-100 p-3 rounded-lg dark:bg-green-900/50 dark:text-green-300">{successMessage}</div>}
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md dark:bg-gray-800">
                <h3 className="text-2xl font-bold text-brand-green mb-4 dark:text-brand-light-green">{t('rewards.harvestLogTitle', 'Harvest Log')}</h3>
                {harvestLog.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">{t('rewards.harvestLogHeaders.date', 'Date')}</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">{t('rewards.harvestLogHeaders.crop', 'Crop')}</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">{t('rewards.harvestLogHeaders.quantity', 'Quantity')}</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">{t('rewards.harvestLogHeaders.revenue', 'Revenue')}</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">{t('rewards.harvestLogHeaders.points', 'Points Earned')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                {harvestLog.map(log => (
                                    <tr key={log.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{new Date(log.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{log.cropName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{log.quantity} {t(`units.${log.unit}`, log.unit)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">₹{log.calculatedRevenue.toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-brand-green dark:text-brand-light-green">+{log.pointsEarned.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">{t('rewards.logEmptyMessage', 'You haven\'t logged any sales yet. Log your first harvest to start earning points!')}</p>
                )}
            </div>

        </div>
    );
};