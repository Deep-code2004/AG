import React from 'react';

export interface Feature {
  id: 'crop-selection' | 'market-prices' | 'risk-alerts' | 'govt-schemes' | 'rewards' | 'ai-chat' | 'profile' | 'help';
  name: string;
  description: string;
  icon: React.ReactNode;
}

export interface UserProfile {
    name?: string;
    defaultLocation?: string;
    language?: keyof typeof import('./i18n').languages;
    preferredUnit?: 'quintal' | 'kg' | 'tonne';
    profileImage?: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    filePreview?: string;
    fileName?: string;
    fileMimeType?: string;
    status?: 'sent' | 'pending' | 'failed';
}

export interface CropRecommendation {
  cropName: string;
  sowingSeason: string;
  yieldPotential: string;
  waterRequirements: string;
  reason: string;
}

export interface MarketPrice {
  crop: string;
  price: number;
  market: string;
  date: string;
}

export interface RiskAlert {
    risk_type: string;
    description: string;
    severity: 'Low' | 'Medium' | 'High';
    recommendation: string;
}

export interface GovtScheme {
    schemeName: string;
    description: string;
    eligibility: string;
    benefits: string;
    link?: string;
}

export interface GroundingSource {
  web: {
    uri: string;
    title: string;
  }
}

export interface HarvestSaleLog {
  id: string;
  date: string; // ISO string
  cropName: string;
  quantity: number;
  unit: string;
  location: string;
  calculatedRevenue: number;
  pointsEarned: number;
}