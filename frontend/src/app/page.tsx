import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import StatsStrip from '@/components/landing/StatsStrip';
import HowItWorks from '@/components/landing/HowItWorks';
import Features from '@/components/landing/Features';
import Pricing from '@/components/landing/Pricing';
import Footer from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900 selection:bg-blue-500/30">
      <Navbar />
      <Hero />
      <StatsStrip />
      <HowItWorks />
      <Features />
      <Pricing />
      <Footer />
    </main>
  );
}
