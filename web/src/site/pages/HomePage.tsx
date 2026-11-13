// Public homepage at `/`. Sections appear in this order; their content lives
// in site/config and i18n/strings.ts (`site.*`).

import { useState } from 'react';
import { useI18n } from '../../i18n';
import type { Plan } from '../config/pricing';
import { Footer } from '../components/Footer';
import { Nav, scrollToSection } from '../components/Nav';
import { SiteShell } from '../components/SiteShell';
import { About, Services } from './home/About';
import { ForCoaches, ForTrainees } from './home/Audience';
import { Contact } from './home/Contact';
import { CtaBand } from './home/CtaBand';
import { Features } from './home/Features';
import { Hero } from './home/Hero';
import { HowItWorks } from './home/HowItWorks';
import { Pricing } from './home/Pricing';
import '../home.css';

export function HomePage() {
  const { t } = useI18n();
  const [prefill, setPrefill] = useState<{ message: string; nonce: number }>();

  // While pricing isn't set, a plan's button starts a waitlist message.
  const joinWaitlist = (plan: Plan) => {
    setPrefill({ message: t('site.pricing.waitlistMessage', { plan: t(plan.name) }), nonce: Date.now() });
    scrollToSection('contact');
  };

  return (
    <SiteShell className="home">
      <Nav />
      <main id="main" tabIndex={-1}>
        <Hero />
        <About />
        <Services />
        <Features />
        <HowItWorks />
        <ForCoaches />
        <ForTrainees />
        <Pricing onWaitlist={joinWaitlist} />
        <Contact prefill={prefill} />
        <CtaBand />
      </main>
      <Footer />
    </SiteShell>
  );
}
