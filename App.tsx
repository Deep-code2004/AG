import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { CropSelection } from './components/features/CropSelection';
import { MarketPrices } from './components/features/MarketPrices';
import { RiskAlerts } from './components/features/RiskAlerts';
import { GovtSchemes } from './components/features/GovtSchemes';
import { Rewards } from './components/features/Rewards';
import { AIChat } from './components/features/AIChat';
import { Profile } from './components/features/Profile';
import { Help } from './components/features/Help';
import { LocationModal } from './components/LocationModal';
import { Feature, UserProfile } from './types';
import { FEATURES } from './constants';
import { getAccurateLocation } from './services/locationService';
import { sendChatMessage } from './services/geminiService';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { useOfflineStatus } from './hooks/useOfflineStatus';
import { getMessageQueue, saveChatHistory, getChatHistory, clearMessageQueue } from './services/offlineService';
import { languages } from './i18n';
import { getUserProfile } from './services/userProfileService';

type LanguageCode = keyof typeof languages;

const base64ToFile = (base64: string, filename: string, mimeType: string): File => {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new File([byteArray], filename, { type: mimeType });
};

const OfflineBanner: React.FC = () => {
    const { t } = useLanguage();
    return (
        <div className="bg-gray-700 text-white text-center p-2 font-semibold text-sm w-full z-50">
            {t('common.offline', 'You are currently offline.')}
        </div>
    );
};

const AppContent: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<Feature>(FEATURES[0]);
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const hasShownLocationModal = useRef(false);
  const isOnline = useOfflineStatus();
  const isSyncing = useRef(false);

  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedPrefs = window.localStorage.getItem('theme');
      if (storedPrefs) {
        return storedPrefs;
      }
      const userMedia = window.matchMedia('(prefers-color-scheme: dark)');
      if (userMedia.matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  const { lang, t } = useLanguage();

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };
  
  const refreshProfile = useCallback(() => {
    setUserProfile(getUserProfile());
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    document.documentElement.lang = lang;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
        window.localStorage.setItem('theme', theme);
    } catch (e) {
        console.error("Failed to save theme to localStorage", e);
    }
  }, [theme, lang]);

  const fetchAndSetLocation = useCallback(async () => {
    try {
      const locationName = await getAccurateLocation(lang);
      setUserLocation(locationName);
      setShowLocationModal(false);
    } catch (error) {
      console.error("Failed to get accurate location in App.tsx:", error);
      throw error;
    }
  }, [lang]);

    const syncOfflineMessages = useCallback(async () => {
        if (isSyncing.current || !isOnline) return;
        isSyncing.current = true;
        
        const queue = getMessageQueue();
        if (queue.length === 0) {
            isSyncing.current = false;
            return;
        }

        console.log(`Syncing ${queue.length} offline messages...`);
        let currentChatHistory = getChatHistory();

        for (const queuedMessage of queue) {
             const userMessageIndex = currentChatHistory.findIndex(m => m.id === queuedMessage.id);
            try {
                const file = queuedMessage.fileData 
                    ? base64ToFile(queuedMessage.fileData, queuedMessage.fileName || 'offline-file', queuedMessage.fileMimeType || 'application/octet-stream') 
                    : null;
                
                const stream = sendChatMessage(queuedMessage.prompt, file, queuedMessage.lang);
                
                let fullResponse = "";
                let firstChunk = true;
                
                for await (const chunk of stream) {
                    fullResponse += chunk;
                    if (firstChunk) {
                        firstChunk = false;
                        currentChatHistory.push({ id: `${queuedMessage.id}-model`, role: 'model', text: '' });
                    }
                    const lastMessage = currentChatHistory[currentChatHistory.length - 1];
                    if (lastMessage && lastMessage.role === 'model') {
                        lastMessage.text = fullResponse;
                        saveChatHistory([...currentChatHistory]);
                    }
                }
                
                if (userMessageIndex > -1) {
                    currentChatHistory[userMessageIndex].status = 'sent';
                }

            } catch (error) {
                console.error(`Failed to send queued message ${queuedMessage.id}:`, error);
                if (userMessageIndex > -1) {
                    currentChatHistory[userMessageIndex].status = 'failed';
                }
            }
        }
        
        saveChatHistory([...currentChatHistory]);
        clearMessageQueue();
        console.log("Offline message sync complete.");
        isSyncing.current = false;
    }, [isOnline]);

    useEffect(() => {
        if (isOnline) {
            syncOfflineMessages();
        }
    }, [isOnline, syncOfflineMessages]);

    useEffect(() => {
        if (!userLocation && !hasShownLocationModal.current) {
            hasShownLocationModal.current = true;
            if (userProfile?.defaultLocation) {
                setUserLocation(userProfile.defaultLocation);
            } else {
                setShowLocationModal(true);
            }
        }
    }, [userLocation, userProfile]);
    
    const handleManualLocation = () => {
        setShowLocationModal(false);
        setTimeout(() => {
            const locationInput = document.getElementById('location');
            locationInput?.focus();
        }, 100);
    };
    
    const renderActiveFeature = () => {
        switch (activeFeature.id) {
            case 'crop-selection':
                return <CropSelection userLocation={userLocation} onLocationChange={setUserLocation} onDetectLocation={fetchAndSetLocation} lang={lang} />;
            case 'market-prices':
                return <MarketPrices userLocation={userLocation} onLocationChange={setUserLocation} onDetectLocation={fetchAndSetLocation} theme={theme} lang={lang} />;
            case 'risk-alerts':
                return <RiskAlerts userLocation={userLocation} onLocationChange={setUserLocation} onDetectLocation={fetchAndSetLocation} lang={lang} />;
            case 'govt-schemes':
                return <GovtSchemes userLocation={userLocation} onLocationChange={setUserLocation} onDetectLocation={fetchAndSetLocation} lang={lang} />;
            case 'rewards':
                return <Rewards userLocation={userLocation} lang={lang} />;
            case 'ai-chat':
                return <AIChat theme={theme} lang={lang} />;
            case 'profile':
                return <Profile onProfileUpdate={refreshProfile} />;
            case 'help':
                return <Help />;
            default:
                return null;
        }
    };
    
    return (
        <div className="relative min-h-screen bg-brand-beige dark:bg-gray-900 md:flex">
            {!isOnline && (
                <div className="fixed top-0 left-0 right-0 z-50">
                    <OfflineBanner />
                </div>
            )}
            
            <Sidebar 
                activeFeature={activeFeature} 
                setActiveFeature={setActiveFeature} 
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />

            {isSidebarOpen && (
                <div 
                    onClick={() => setIsSidebarOpen(false)} 
                    className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
                    aria-hidden="true"
                ></div>
            )}

            <div className={`flex-1 flex flex-col overflow-hidden ${!isOnline ? 'mt-8 md:mt-0' : ''}`}>
                <Header 
                    title={t(activeFeature.name)}
                    description={t(activeFeature.description)}
                    theme={theme}
                    toggleTheme={toggleTheme}
                    userName={userProfile?.name || null}
                    profileImage={userProfile?.profileImage || null}
                    onMenuClick={() => setIsSidebarOpen(true)}
                />
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    {renderActiveFeature()}
                </main>
            </div>

            {showLocationModal && <LocationModal onAllow={fetchAndSetLocation} onManual={handleManualLocation} />}
        </div>
    );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;