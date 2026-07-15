import React from 'react';
import { LandingConfigProvider } from '../context/LandingConfigContext';
import LandingNav from './landing/LandingNav';
import LandingHero from './landing/LandingHero';
import LandingSocialProof from './landing/LandingSocialProof';
import LandingHowItWorks from './landing/LandingHowItWorks';
import LandingActors from './landing/LandingActors';
import LandingPricing from './landing/LandingPricing';
import LandingCTA from './landing/LandingCTA';
import LandingFooter from './landing/LandingFooter';

export default function Landing() {
  return (
    <LandingConfigProvider>
      <div className="font-sans bg-white text-slate-900 overflow-x-hidden antialiased">
        <LandingNav />
        <LandingHero />
        <LandingSocialProof />
        <LandingHowItWorks />
        <LandingActors />
        <LandingPricing />
        <LandingCTA />
        <LandingFooter />
      </div>
    </LandingConfigProvider>
  );
}
