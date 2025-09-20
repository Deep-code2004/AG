import { GoogleGenAI, Type } from "@google/genai";
import type { CropRecommendation, MarketPrice, RiskAlert, GovtScheme, GroundingSource, UserProfile } from '../types';
import { languages } from '../i18n';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

type LanguageCode = keyof typeof languages;

const getLanguageName = (langCode: LanguageCode): string => {
    return languages[langCode]?.name || "English";
}

// Helper function to convert File to base64 for multimodal input
const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error("Failed to read file as data URL."));
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });

    const data = await base64EncodedDataPromise;

    return {
        inlineData: {
            data,
            mimeType: file.type,
        },
    };
};


export async function* sendChatMessage(prompt: string, file: File | null, lang: LanguageCode): AsyncGenerator<string> {
    try {
        const languageName = getLanguageName(lang);
        const parts: any[] = [{ text: `${prompt}\n\n(Please provide the response in ${languageName})` }];

        if (file) {
            // Check for valid file types that the model can handle.
            if (!file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
                 throw new Error("Unsupported file type. Please upload an image, video, or audio file.");
            }
            const filePart = await fileToGenerativePart(file);
            parts.unshift(filePart); // Put the file first as models often perform better this way
        }

        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: { parts: parts },
        });

        let hasYieldedText = false;
        for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
                hasYieldedText = true;
                yield text;
            }
        }

        const response = await (responseStream as any).response;
        
        if (!response) {
            if (!hasYieldedText) {
                throw new Error("The AI response was empty. This may be due to a content filter or a network issue.");
            }
            return;
        }
        
        const finishReason = response.candidates?.[0]?.finishReason;
        
        if (finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS' && !hasYieldedText) {
             if (finishReason === 'SAFETY') {
                const safetyRatings = response.candidates?.[0]?.safetyRatings;
                const blockReason = response.promptFeedback?.blockReason;
                let reasonText = `Response was blocked for safety reasons.`;
                if(blockReason) {
                    reasonText += ` Reason: ${blockReason}.`;
                }
                if (safetyRatings && safetyRatings.length > 0) {
                     reasonText += ` Details: ${safetyRatings.map(r => `${r.category.replace('HARM_CATEGORY_', '')} (${r.probability})`).join(', ')}`;
                }
                throw new Error(reasonText);
            } else {
                 throw new Error(`The AI response ended unexpectedly. Reason: ${finishReason || 'Unknown'}`);
            }
        }

    } catch (error) {
        console.error("Error in AI Chat stream service:", error);
        if (error instanceof Error) {
            throw new Error(error.message || `Failed to get a streaming response from the AI assistant.`);
        }
        throw new Error("An unknown error occurred while communicating with the AI assistant.");
    }
}

export async function getCropRecommendations(
  location: string,
  soilType: string,
  rainfall: string,
  lang: LanguageCode
): Promise<CropRecommendation[]> {
  try {
    const languageName = getLanguageName(lang);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Based on the following conditions for a farmer in ${location}: soil type is ${soilType}, and annual rainfall is ${rainfall} mm, suggest three suitable crops. Provide the entire JSON response, including keys and values, in the ${languageName} language.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              cropName: { type: Type.STRING, description: 'Name of the crop' },
              sowingSeason: { type: Type.STRING, description: 'Best season to sow the crop' },
              yieldPotential: { type: Type.STRING, description: 'Estimated yield per acre' },
              waterRequirements: { type: Type.STRING, description: 'Water needs for the crop' },
              reason: { type: Type.STRING, description: 'Brief reason for recommending this crop' },
            },
            required: ['cropName', 'sowingSeason', 'yieldPotential', 'waterRequirements', 'reason']
          }
        }
      }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as CropRecommendation[];
  } catch (error) {
    console.error("Error fetching crop recommendations:", error);
    throw new Error("Failed to get crop recommendations from AI.");
  }
}


export async function getMarketPrices(
    location: string, 
    crops: string[],
    lang: LanguageCode
): Promise<MarketPrice[]> {
    try {
        const languageName = getLanguageName(lang);
        const cropList = crops.join(', ');
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `What are the latest wholesale market prices for ${cropList} in the ${location} region? Provide the price per quintal. Provide the entire JSON response, including keys and values, in the ${languageName} language.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            crop: { type: Type.STRING },
                            price: { type: Type.NUMBER },
                            market: { type: Type.STRING },
                            date: { type: Type.STRING, description: "Today's date" }
                        },
                        required: ['crop', 'price', 'market', 'date']
                    }
                }
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as MarketPrice[];
    } catch (error) {
        console.error("Error fetching market prices:", error);
        throw new Error("Failed to get market prices from AI.");
    }
}

export async function getMarketPriceForSale(
    crop: string, 
    location: string, 
    unit: UserProfile['preferredUnit'],
    lang: LanguageCode
): Promise<number> {
    try {
        const languageName = getLanguageName(lang);
        const unitText = unit || 'quintal';
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `What is the current average wholesale market price PER ${unitText} for ${crop} in the ${location} region? Provide ONLY a single JSON object with a "price" key. For example: {"price": 3500}. The response should be in ${languageName} but the JSON keys must remain in English.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        price: { type: Type.NUMBER, description: `The price per ${unitText}` },
                    },
                    required: ['price']
                }
            }
        });
        const jsonText = response.text.trim();
        const data = JSON.parse(jsonText);
        if (typeof data.price !== 'number') {
            throw new Error("AI returned an invalid price format.");
        }
        return data.price;
    } catch (error) {
        console.error("Error fetching single market price:", error);
        throw new Error(`Failed to get market price for ${crop} from AI.`);
    }
}


export async function getRiskAlerts(location: string, lang: LanguageCode): Promise<{alerts: RiskAlert[], sources: GroundingSource[]}> {
  try {
    const languageName = getLanguageName(lang);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `List potential agricultural risks like pest outbreaks or extreme weather warnings for ${location} in the next 2 weeks. Provide your response in ${languageName}.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const sources = (response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingSource[]) || [];
    
    const structuredResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Based on this information, create a JSON array of risk alerts. Information: ${response.text}. Provide the entire JSON response, including keys and values, in the ${languageName} language.`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        risk_type: { type: Type.STRING, description: "e.g., Weather, Pest, Disease" },
                        description: { type: Type.STRING },
                        severity: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
                        recommendation: { type: Type.STRING }
                    },
                    required: ['risk_type', 'description', 'severity', 'recommendation']
                }
            }
        }
    });

    const jsonText = structuredResponse.text.trim();
    const alerts = JSON.parse(jsonText) as RiskAlert[];

    return { alerts, sources };
  } catch (error) {
    console.error("Error fetching risk alerts:", error);
    throw new Error("Failed to get risk alerts from AI.");
  }
}


export async function getGovtSchemes(location: string, lang: LanguageCode): Promise<{schemes: GovtScheme[], sources: GroundingSource[]}> {
  try {
    const languageName = getLanguageName(lang);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Find government schemes available for small-scale farmers in ${location}, related to crop insurance, subsidies, and loans. Provide your response in ${languageName}.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const sources = (response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingSource[]) || [];
    
    const structuredResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `From the text provided, extract key government schemes for farmers and format them as a JSON array. Text: ${response.text}. Provide the entire JSON response, including keys and values, in the ${languageName} language.`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        schemeName: { type: Type.STRING },
                        description: { type: Type.STRING },
                        eligibility: { type: Type.STRING },
                        benefits: { type: Type.STRING }
                    },
                    required: ['schemeName', 'description', 'eligibility', 'benefits']
                }
            }
        }
    });

    const jsonText = structuredResponse.text.trim();
    const schemes = JSON.parse(jsonText) as GovtScheme[];

    return { schemes, sources };
  } catch (error) {
    console.error("Error fetching government schemes:", error);
    throw new Error("Failed to get government schemes from AI.");
  }
}