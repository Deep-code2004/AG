import { languages } from '../i18n';

type LanguageCode = keyof typeof languages;

/**
 * Converts geographic coordinates to a human-readable location name using a dedicated reverse geocoding service.
 * This avoids using the rate-limited Gemini API for a simple task.
 * @param lat - Latitude
 * @param lon - Longitude
 * @param lang - Language code for the response
 * @returns A promise that resolves to a formatted location string (e.g., "City, State, Country").
 */
const coordsToLocationName = async (lat: number, lon: number, lang: LanguageCode): Promise<string> => {
    try {
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${lang}`);
        if (!response.ok) {
            throw new Error(`Reverse geocoding request failed with status ${response.status}`);
        }
        const data = await response.json();
        
        const parts = [data.city, data.principalSubdivision, data.countryName].filter(Boolean);
        if (parts.length > 0) {
            return parts.join(', ');
        } else {
            throw new Error("Could not determine location name from coordinates via API.");
        }
    } catch (error) {
        console.error("Error converting coordinates to location name:", error);
        // Provide a fallback to raw coordinates if the naming service fails
        return `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`;
    }
};


export const getCurrentPosition = async (): Promise<{ latitude: number; longitude: number }> => {
  if (!navigator.geolocation) {
    throw new Error("Geolocation is not supported by your browser.");
  }

  // Check permission status if Permissions API is supported
  if (navigator.permissions) {
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
      if (permissionStatus.state === 'denied') {
        throw new Error("Location access has been blocked. Please enable it in your browser settings.");
      }
    } catch (e) {
      console.warn("Could not query geolocation permission status.", e);
    }
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 10000, // 10-second timeout to allow for high-accuracy lock
    maximumAge: 0,   // Do not use a cached position
  };

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        let errorMessage = "An unknown error occurred.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "You denied the location request. You can enter your location manually or try again.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "The request to get user location timed out.";
            break;
        }
        reject(new Error(errorMessage));
      },
      options
    );
  });
};

export const getLocationByIp = async (): Promise<string> => {
  try {
    const response = await fetch('https://ipinfo.io/json');
    if (!response.ok) {
      throw new Error('IP geolocation request failed.');
    }
    const data = await response.json();
    if (data.city && data.region && data.country) {
      return `${data.city}, ${data.region}, ${data.country}`;
    } else if (data.loc) {
        const [lat, lon] = data.loc.split(',');
        return `Lat: ${parseFloat(lat).toFixed(2)}, Lon: ${parseFloat(lon).toFixed(2)}`;
    } else {
      throw new Error('Could not determine location from IP address.');
    }
  } catch (error) {
    console.error("Error fetching location by IP:", error);
    throw new Error("Failed to get location from network address.");
  }
};


export const getAccurateLocation = async (lang: LanguageCode): Promise<string> => {
    let geoError: Error | null = null;
    let highAccuracyLocation: string | null = null;

    // 1. Prioritize high-accuracy geolocation
    try {
        const { latitude, longitude } = await getCurrentPosition();
        highAccuracyLocation = await coordsToLocationName(latitude, longitude, lang);
    } catch (error) {
        geoError = error as Error;
        console.warn("High-accuracy geolocation failed:", geoError.message);
    }

    // 2. Check if the result is valid or a known simulated location
    if (highAccuracyLocation) {
        const simulatedLocations = ["kolkata", "bengaluru", "bangalore"];
        const isSimulated = simulatedLocations.some(simLocation => 
            highAccuracyLocation!.toLowerCase().includes(simLocation)
        );

        if (!isSimulated) {
            return highAccuracyLocation; // Success! Return the accurate location.
        } else {
            console.log(`Simulated location detected ("${highAccuracyLocation}"). Proceeding to IP fallback.`);
        }
    }

    // 3. If we're here, high-accuracy failed or was simulated. Fallback to IP.
    console.log("Attempting IP-based location fallback...");
    try {
        const ipLocationName = await getLocationByIp();
        return ipLocationName;
    } catch (ipError) {
        console.error("IP geolocation fallback also failed.", ipError);
        if (geoError && (geoError.message.includes("denied") || geoError.message.includes("blocked"))) {
             throw geoError; // Propagate the specific "permission denied" error
        }
        throw new Error("Could not determine your location automatically. Please enter it manually.");
    }
};