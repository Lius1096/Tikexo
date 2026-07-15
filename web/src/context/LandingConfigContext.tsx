import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface HeroSlide {
  bg: string;
  panelBg: string;
  textColor: string;
  accent: string;
  badge: string;
  title: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  img?: string;
}

export interface StatItem {
  val: string;
  label: string;
}

export interface HowItWorksStep {
  num: string;
  title: string;
  desc: string;
  highlight: boolean;
}

export interface ActorCard {
  name: string;
  role: string;
  tag: string;
  img: string;
  imgAlt: string;
  accentFrom: string;
  accentTo: string;
  loginHref: string;
  loginLabel: string;
  features: string[];
}

export interface PricingPlan {
  name: string;
  price: string;
  period: string;
  features: string[];
  featured?: boolean;
  badge?: string;
  ctaLabel?: string;
}

export interface LandingConfig {
  hero: { slides: HeroSlide[] };
  stats: { items: StatItem[] };
  how_it_works: { title: string; subtitle: string; steps: HowItWorksStep[] };
  actors: { title: string; subtitle: string; cards: ActorCard[] };
  pricing: { title: string; subtitle: string; plans: PricingPlan[] };
  cta: { title: string; subtitle: string; ctaPrimary: string; ctaSecondary: string };
}

const LandingConfigContext = createContext<LandingConfig | null>(null);

export function LandingConfigProvider({ children }: { children: React.ReactNode }) {
  const { data } = useQuery<LandingConfig>({
    queryKey: ['landing-config'],
    queryFn: async () => {
      const res = await api.get('/landing/config');
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <LandingConfigContext.Provider value={data ?? null}>
      {children}
    </LandingConfigContext.Provider>
  );
}

export function useLandingConfig(): LandingConfig | null {
  return useContext(LandingConfigContext);
}
