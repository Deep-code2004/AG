import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { getUserProfile, saveUserProfile } from '../../services/userProfileService';
import type { UserProfile } from '../../types';
import { fileToBase64 } from '../../utils/fileToBase64';

interface ProfileProps {
  onProfileUpdate: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ onProfileUpdate }) => {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    defaultLocation: '',
    preferredUnit: 'quintal',
    profileImage: '',
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadedProfile = getUserProfile();
    if (loadedProfile) {
      setProfile({
        name: loadedProfile.name || '',
        defaultLocation: loadedProfile.defaultLocation || '',
        preferredUnit: loadedProfile.preferredUnit || 'quintal',
        profileImage: loadedProfile.profileImage || '',
      });
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };
  
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        try {
            const base64Image = await fileToBase64(file);
            setProfile(prev => ({...prev, profileImage: base64Image }));
        } catch (error) {
            console.error("Error converting file to base64:", error);
            alert("Failed to upload image. Please try another file.");
        }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveUserProfile(profile);
    onProfileUpdate(); // Notify App.tsx to refresh its profile state
    setSuccessMessage(t('profile.success', 'Profile updated successfully!'));
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-lg shadow-md dark:bg-gray-800">
        <h2 className="text-3xl font-bold text-brand-green mb-6 dark:text-brand-light-green">{t('profile.title', 'Your Profile')}</h2>
        
        {successMessage && (
          <div className="mb-6 text-center text-green-700 bg-green-100 p-3 rounded-lg dark:bg-green-900/50 dark:text-green-300">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
           {/* Profile Picture Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('profile.profilePicture', 'Profile Picture')}
            </label>
            <div className="mt-2 flex flex-col items-start space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-6">
              <span className="inline-block h-20 w-20 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-600 flex-shrink-0">
                {profile.profileImage ? (
                  <img className="h-full w-full object-cover" src={profile.profileImage} alt="Profile" />
                ) : (
                  <svg className="h-full w-full text-gray-300 dark:text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
              </span>
              <label
                htmlFor="profileImageUpload"
                className="cursor-pointer rounded-md border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 py-2 px-3 text-sm font-medium leading-4 text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-light-green focus:ring-offset-2"
              >
                <span>{profile.profileImage ? t('profile.changeImage', 'Change Image') : t('profile.uploadImage', 'Upload Image')}</span>
                <input
                  id="profileImageUpload"
                  name="profileImage"
                  type="file"
                  className="sr-only"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageChange}
                />
              </label>
            </div>
          </div>
        
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('profile.nameLabel', 'Your Name')}
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={profile.name}
              onChange={handleChange}
              className="mt-1 block w-full px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-light-green focus:border-brand-light-green text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={t('profile.namePlaceholder', 'e.g., Ramesh Kumar')}
            />
          </div>

          <div>
            <label htmlFor="defaultLocation" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('profile.locationLabel', 'Default Location')}
            </label>
            <input
              type="text"
              name="defaultLocation"
              id="defaultLocation"
              value={profile.defaultLocation}
              onChange={handleChange}
              className="mt-1 block w-full px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-light-green focus:border-brand-light-green text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={t('profile.locationPlaceholder', 'e.g., Pune, Maharashtra, India')}
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t('profile.locationDescription', 'This location will be used if automatic detection is unavailable.')}
            </p>
          </div>

          <div>
            <label htmlFor="preferredUnit" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('profile.unitLabel', 'Preferred Measurement Unit')}
            </label>
            <select
              name="preferredUnit"
              id="preferredUnit"
              value={profile.preferredUnit}
              onChange={handleChange}
              className="mt-1 block w-full px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-light-green focus:border-brand-light-green text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="quintal">{t('units.quintal', 'Quintal (100 kg)')}</option>
              <option value="kg">{t('units.kg', 'Kilogram (kg)')}</option>
              <option value="tonne">{t('units.tonne', 'Tonne (1000 kg)')}</option>
            </select>
             <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t('profile.unitDescription', 'This will be your default unit for logging harvest sales.')}
            </p>
          </div>

          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-green hover:bg-brand-light-green focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-light-green transition-colors"
            >
              {t('profile.saveButton', 'Save Preferences')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};