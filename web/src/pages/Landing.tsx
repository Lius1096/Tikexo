import React from 'react';
import { LANDING_CSS } from './landing/styles';
import LandingNav from './landing/LandingNav';
import LandingHero from './landing/LandingHero';
import LandingHowItWorks from './landing/LandingHowItWorks';
import LandingActors from './landing/LandingActors';
import LandingWallet from './landing/LandingWallet';
import LandingPricing from './landing/LandingPricing';
import LandingBenin from './landing/LandingBenin';
import LandingCTA from './landing/LandingCTA';
import LandingFooter from './landing/LandingFooter';

export default function Landing() {
  return (
    <>
      <style>{LANDING_CSS}</style>
      <div className="lp">
        <LandingNav />
        <LandingHero />
        <LandingHowItWorks />
        <LandingActors />
        <LandingWallet />
        <LandingPricing />
        <LandingBenin />
        <LandingCTA />
        <LandingFooter />
      </div>
    </>
  );
}
