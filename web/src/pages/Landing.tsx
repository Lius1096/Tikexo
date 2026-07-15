import React from 'react';
import LandingNav from './landing/LandingNav';
import LandingHero from './landing/LandingHero';
import LandingSocialProof from './landing/LandingSocialProof';
import LandingHowItWorks from './landing/LandingHowItWorks';
import LandingActors from './landing/LandingActors';
import LandingTestimonials from './landing/LandingTestimonials';
import LandingWallet from './landing/LandingWallet';
import LandingPricing from './landing/LandingPricing';
import LandingBenin from './landing/LandingBenin';
import LandingCTA from './landing/LandingCTA';
import LandingFooter from './landing/LandingFooter';

export default function Landing() {
  return (
    <div className="lp">
      <LandingNav />
      <LandingHero />
      <LandingSocialProof />
      <LandingHowItWorks />
      <LandingActors />
      <LandingTestimonials />
      <LandingWallet />
      <LandingPricing />
      <LandingBenin />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
}
