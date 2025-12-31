'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Menu,
  X,
  MessageCircle,
  ChevronRight,
  Wallet,
  TrendingUp,
  CreditCard,
  Globe,
  Smartphone,
  Monitor,
  DollarSign,
  Percent,
  CircleDollarSign,
  BadgePercent,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

// Trust Indicators Component - Desktop only
function TrustIndicators() {
  return (
    <div className="hidden sm:flex flex-wrap items-center gap-3 md:gap-4">
      <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
        <div className="w-2 h-2 bg-[#32a88a] rounded-full animate-pulse" />
        <span className="text-white/80 text-[13px] md:text-[14px]">50K+ Traders</span>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
        <CreditCard className="w-4 h-4 text-[#2f96f0]" />
        <span className="text-white/80 text-[13px] md:text-[14px]">Fast Withdrawals</span>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
        <Globe className="w-4 h-4 text-[#fab81e]" />
        <span className="text-white/80 text-[13px] md:text-[14px]">24/7 Support</span>
      </div>
    </div>
  );
}

// Device Card Component - With border like ExpertOption
function DeviceCard({ icon: Icon, name, version }: { icon: any; name: string; version: string }) {
  return (
    <div className="flex flex-col items-center gap-3 p-6 md:p-8 border border-white/20 rounded-xl bg-transparent hover:border-white/30 transition-colors">
      <Icon className="w-8 h-8 md:w-10 md:h-10 text-white/70" />
      <span className="text-white font-medium text-[16px] md:text-[18px]">{name}</span>
      <span className="text-white/50 text-[13px] md:text-[14px]">{version}</span>
    </div>
  );
}

// How It Works Card - Horizontal layout like ExpertOption
function HowItWorksCard({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4 p-4 md:p-6">
      <div className="w-12 h-12 rounded-xl bg-[#2a3654] flex items-center justify-center flex-shrink-0 border border-white/10">
        <Icon className="w-6 h-6 text-[#2f96f0]" />
      </div>
      <div>
        <h3 className="text-white font-medium text-[18px] md:text-[20px] mb-2">{title}</h3>
        <p className="text-white/60 text-[14px] md:text-[16px] leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// Stat Card Component - Outlined capsule style like ExpertOption (no fill, just border)
function StatCard({ value, label, icon: Icon }: { value: string; label: string; icon: any }) {
  return (
    <div className="flex items-center gap-4 px-5 md:px-6 py-4 border border-white/30 rounded-full bg-transparent hover:border-white/40 transition-colors">
      <div className="w-9 h-9 rounded-full border border-[#2f96f0]/50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-[#2f96f0]" />
      </div>
      <div>
        <div className="text-[#2f96f0] text-[18px] md:text-[20px] font-bold leading-tight">{value}</div>
        <div className="text-white/60 text-[12px] md:text-[13px]">{label}</div>
      </div>
    </div>
  );
}

// Footer Link Column
function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 className="text-white font-medium text-[14px] mb-4">{title}</h4>
      <ul className="space-y-2">
        {links.map((link, i) => (
          <li key={i}>
            <Link href={link.href} className="text-white/60 text-[13px] hover:text-white transition-colors">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Menu data structure with submenus
const menuData = [
  { label: 'Home', href: '/' },
  {
    label: 'Trading',
    submenu: [
      { label: 'Features', href: '/features' },
      { label: 'Account types', href: '/about' },
      { label: 'Social trading', href: '/about' },
      { label: 'FAQ', href: '/contact' },
    ],
  },
  {
    label: 'Education',
    submenu: [
      { label: 'How to start', href: '/about' },
      { label: 'First steps and simple', href: '/about' },
      { label: 'Strategies', href: '/about' },
      { label: 'Skill development', href: '/about' },
      { label: 'Recovery & growth', href: '/about' },
      { label: 'Trading strategies', href: '/about' },
    ],
  },
  {
    label: 'Company',
    submenu: [
      { label: 'About company', href: '/about' },
      { label: 'Terms', href: '/terms' },
      { label: 'Payment Policy', href: '/privacy' },
      { label: 'Return policy', href: '/privacy' },
      { label: 'AML & KYC', href: '/aml' },
      { label: 'Regulation', href: '/about' },
    ],
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isHydrated, router]);

  if (isHydrated && isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#0d1220]">

      {/* Navigation */}
      <header className={cn(
        'fixed top-0 left-0 right-0 z-50 h-16 transition-all duration-300',
        scrolled ? 'bg-[#0d1220]/95 backdrop-blur-xl shadow-lg' : 'bg-gradient-to-b from-black/50 to-transparent'
      )}>
        <div className="max-w-7xl mx-auto px-4 h-full">
          <div className="flex items-center justify-between h-full">
            {/* Left Side - Menu & Language */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-white/70 hover:text-white transition-colors"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>

              {/* Language Flag */}
              <div className="hidden md:flex items-center gap-2 text-white/70 text-sm">
                <div className="w-6 h-4 bg-gradient-to-b from-blue-600 via-white to-red-600 rounded-sm" />
                <span>EN</span>
              </div>

              {/* Online Chat */}
              <Link href="/contact" className="hidden md:flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors">
                <MessageCircle className="w-4 h-4" />
                <span>Online chat</span>
              </Link>
            </div>

            {/* Center - Logo */}
            <Link href="/" className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
              <Image src="/logo.png" alt="Optigo" width={32} height={32} className="h-8 w-8" />
              <span className="text-white font-bold text-lg hidden sm:block">OptigoBroker</span>
            </Link>

            {/* Right Side - Auth Buttons */}
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-white/70 hover:text-white text-sm font-medium transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="px-5 py-2 bg-[#2f96f0] hover:bg-[#3ba3f7] text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Register
              </Link>
            </div>
          </div>
        </div>

      </header>

      {/* Fullscreen Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] overflow-hidden" style={{ background: 'radial-gradient(ellipse 150% 100% at 80% 0%, #2e3e72 0%, #202e5a 40%, #182031 70%, #151b27 100%)' }}>
          {/* Decorative curved lines */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <svg className="absolute w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
              <ellipse cx="200" cy="500" rx="600" ry="800" fill="none" stroke="rgba(47,150,240,0.08)" strokeWidth="1" />
              <ellipse cx="150" cy="450" rx="500" ry="700" fill="none" stroke="rgba(47,150,240,0.05)" strokeWidth="1" />
            </svg>
          </div>

          {/* Header */}
          <div className="relative flex items-center justify-between px-4 py-4">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setExpandedMenu(null);
              }}
              className="p-2 text-white/80 hover:text-white transition-colors"
            >
              <X className="h-7 w-7" />
            </button>
            <Link
              href="/"
              onClick={() => {
                setMobileMenuOpen(false);
                setExpandedMenu(null);
              }}
              className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2"
            >
              <Image src="/logo.png" alt="Optigo" width={32} height={32} className="h-8 w-8" />
              <span className="text-white font-bold text-lg">OptigoBroker</span>
            </Link>
            <div className="w-11" /> {/* Spacer for centering */}
          </div>

          {/* Navigation Links */}
          <nav className="relative px-6 pt-8 flex">
            {/* Main Menu Items */}
            <div className="flex-shrink-0">
              {menuData.map((item) => (
                <div key={item.label}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setExpandedMenu(null);
                      }}
                      className={cn(
                        'block text-[32px] py-3 transition-colors',
                        expandedMenu === null
                          ? 'text-white font-medium'
                          : 'text-white/50 font-light hover:text-white'
                      )}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <button
                      onClick={() => setExpandedMenu(expandedMenu === item.label ? null : item.label)}
                      className={cn(
                        'block text-[32px] py-3 transition-colors text-left',
                        expandedMenu === item.label
                          ? 'text-white font-medium'
                          : 'text-white/50 font-light hover:text-white'
                      )}
                    >
                      {item.label}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Submenu Items */}
            <div className="ml-12 md:ml-24 lg:ml-32 pt-1">
              {menuData.map((item) => (
                item.submenu && expandedMenu === item.label && (
                  <div key={item.label} className="space-y-1">
                    {item.submenu.map((subItem) => (
                      <Link
                        key={subItem.label}
                        href={subItem.href}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setExpandedMenu(null);
                        }}
                        className="block text-white/60 hover:text-white text-[18px] md:text-[20px] py-2 transition-colors"
                      >
                        {subItem.label}
                      </Link>
                    ))}
                  </div>
                )
              ))}
            </div>
          </nav>

          {/* Bottom Section */}
          <div className="absolute bottom-0 left-0 right-0 pb-8">
            {/* Security Badges */}
            <div className="flex items-center justify-center gap-4 px-6 mb-6">
              <div className="flex items-center gap-1 text-white/60 text-[10px]">
                <span className="font-light">Verified by</span>
                <span className="font-semibold text-white/80">VISA</span>
              </div>
              <div className="text-white/60 text-[10px]">
                <span className="font-semibold text-white/80">MasterCard</span>
                <span className="font-light block text-[8px]">SecureCode</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-white/10 rounded text-[9px] text-white/70">
                <span>DigiCert</span>
              </div>
              <div className="flex items-center gap-1 text-white/60 text-[10px]">
                <span className="font-semibold text-white/80">3D</span>
                <span className="font-light">SECURE</span>
              </div>
              <div className="text-white/60 text-[10px] font-semibold">
                PCI<span className="text-white/80">DSS</span>
              </div>
            </div>

            {/* Try Free Demo Button */}
            <div className="px-6">
              <Link
                href="/register?demo=true"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setExpandedMenu(null);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-[#3ba3f7] text-white text-[15px] font-medium rounded-lg transition-colors shadow-lg"
              >
                Try free demo
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

        </div>
      )}

      {/* Hero Section with Video Background */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute w-full h-full object-cover"
          >
            <source src="/hero-video.webm" type="video/webm" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d1220]/95 via-[#0d1220]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1220] via-transparent to-[#0d1220]/40" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 min-h-[calc(100vh-64px)] sm:min-h-0 flex items-center">
          <div className="grid lg:grid-cols-2 gap-12 items-center w-full">
            {/* Left Content */}
            <div className="flex flex-col justify-between sm:block min-h-[70vh] sm:min-h-0 py-8 sm:py-0">
              {/* Top Section */}
              <div className="text-center sm:text-left">
                <h1 className="text-[32px] sm:text-[36px] md:text-[42px] lg:text-[48px] xl:text-[56px] font-bold text-white mb-4 sm:mb-8 md:mb-10 leading-[1.15]">
                  <div className="sm:whitespace-nowrap">Trade Smarter. <span className="bg-gradient-to-r from-[#0f17ff] to-[#7c3aed] bg-clip-text text-transparent">Profit</span></div>
                  <div className="bg-gradient-to-r from-[#0f17ff] to-[#2b0076] bg-clip-text text-transparent">Faster.</div>
                </h1>

                <p className="text-white/60 text-[14px] sm:text-[16px] md:text-[18px] lg:text-[20px] mb-0 sm:mb-8 md:mb-10 max-w-md mx-auto sm:mx-0 leading-[1.6]">
                  Trade global markets with confidence. Fast execution and enterprise-grade security.
                </p>
              </div>

              {/* Middle Section - Mobile Stats */}
              <div className="grid grid-cols-3 gap-3 sm:hidden">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl py-4 px-2 text-center">
                  <div className="text-[#32a88a] font-bold text-xl">$10</div>
                  <div className="text-white/40 text-[10px] mt-1">Min. Deposit</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl py-4 px-2 text-center">
                  <div className="text-[#2f96f0] font-bold text-xl">100+</div>
                  <div className="text-white/40 text-[10px] mt-1">Assets</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl py-4 px-2 text-center">
                  <div className="text-[#fab81e] font-bold text-xl">98%</div>
                  <div className="text-white/40 text-[10px] mt-1">Max Profit</div>
                </div>
              </div>

              {/* Desktop Trust Indicators */}
              <div className="hidden sm:block mb-8 md:mb-10">
                <TrustIndicators />
              </div>

              {/* Bottom Section - Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 px-6 py-4 sm:px-7 sm:py-3.5 md:px-8 md:py-4 bg-[#2f96f0] hover:bg-[#3ba3f7] text-white text-[15px] md:text-[16px] font-semibold rounded-xl sm:rounded-lg transition-all duration-300 shadow-lg shadow-[#2f96f0]/20"
                >
                  Start Trading
                  <ChevronRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/register?demo=true"
                  className="inline-flex items-center justify-center gap-2 px-6 py-4 sm:px-7 sm:py-3.5 md:px-8 md:py-4 border border-white/20 text-white hover:bg-white/10 text-[15px] md:text-[16px] font-medium rounded-xl sm:rounded-lg transition-all duration-300"
                >
                  Try Free Demo
                </Link>
              </div>
            </div>

            {/* Right Side - Enhanced Floating Stats */}
            <div className="hidden lg:block relative h-[450px] xl:h-[500px] w-full">
              {/* Central Glow Effect */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#2f96f0]/10 rounded-full blur-3xl" />

              {/* Stat 1 - Top Right */}
              <div className="hero-float-1 absolute top-4 xl:top-8 right-4 xl:right-12 group cursor-pointer">
                <div className="relative px-6 py-5 bg-gradient-to-br from-[#32a88a]/15 to-[#32a88a]/5 backdrop-blur-md border border-[#32a88a]/20 rounded-2xl hover:border-[#32a88a]/40 transition-all duration-300">
                  <div className="absolute inset-0 bg-[#32a88a]/5 rounded-2xl blur-2xl group-hover:bg-[#32a88a]/15 transition-all duration-300" />
                  <div className="relative flex items-center gap-4">
                    <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-xl bg-[#32a88a]/20 flex items-center justify-center border border-[#32a88a]/30">
                      <DollarSign className="w-6 h-6 xl:w-7 xl:h-7 text-[#32a88a]" />
                    </div>
                    <div>
                      <div className="text-[#32a88a] font-bold text-2xl xl:text-3xl">$10</div>
                      <div className="text-white/50 text-xs xl:text-sm">Min. Deposit</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stat 2 - Middle Left */}
              <div className="hero-float-2 absolute top-1/2 -translate-y-1/2 left-0 xl:left-8 group cursor-pointer">
                <div className="relative px-6 py-5 bg-gradient-to-br from-[#2f96f0]/15 to-[#2f96f0]/5 backdrop-blur-md border border-[#2f96f0]/20 rounded-2xl hover:border-[#2f96f0]/40 transition-all duration-300">
                  <div className="absolute inset-0 bg-[#2f96f0]/5 rounded-2xl blur-2xl group-hover:bg-[#2f96f0]/15 transition-all duration-300" />
                  <div className="relative flex items-center gap-4">
                    <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-xl bg-[#2f96f0]/20 flex items-center justify-center border border-[#2f96f0]/30">
                      <TrendingUp className="w-6 h-6 xl:w-7 xl:h-7 text-[#2f96f0]" />
                    </div>
                    <div>
                      <div className="text-[#2f96f0] font-bold text-2xl xl:text-3xl">100+</div>
                      <div className="text-white/50 text-xs xl:text-sm">Trading Assets</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stat 3 - Bottom Right */}
              <div className="hero-float-3 absolute bottom-4 xl:bottom-8 right-16 xl:right-24 group cursor-pointer">
                <div className="relative px-6 py-5 bg-gradient-to-br from-[#fab81e]/15 to-[#fab81e]/5 backdrop-blur-md border border-[#fab81e]/20 rounded-2xl hover:border-[#fab81e]/40 transition-all duration-300">
                  <div className="absolute inset-0 bg-[#fab81e]/5 rounded-2xl blur-2xl group-hover:bg-[#fab81e]/15 transition-all duration-300" />
                  <div className="relative flex items-center gap-4">
                    <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-xl bg-[#fab81e]/20 flex items-center justify-center border border-[#fab81e]/30">
                      <Percent className="w-6 h-6 xl:w-7 xl:h-7 text-[#fab81e]" />
                    </div>
                    <div>
                      <div className="text-[#fab81e] font-bold text-2xl xl:text-3xl">98%</div>
                      <div className="text-white/50 text-xs xl:text-sm">Max Profit</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stat 4 - Top Left (New) */}
              <div className="hero-float-2 absolute top-16 xl:top-20 left-12 xl:left-20 group cursor-pointer" style={{ animationDelay: '0.5s' }}>
                <div className="relative px-6 py-5 bg-gradient-to-br from-[#a855f7]/15 to-[#a855f7]/5 backdrop-blur-md border border-[#a855f7]/20 rounded-2xl hover:border-[#a855f7]/40 transition-all duration-300">
                  <div className="absolute inset-0 bg-[#a855f7]/5 rounded-2xl blur-2xl group-hover:bg-[#a855f7]/15 transition-all duration-300" />
                  <div className="relative flex items-center gap-4">
                    <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-xl bg-[#a855f7]/20 flex items-center justify-center border border-[#a855f7]/30">
                      <Globe className="w-6 h-6 xl:w-7 xl:h-7 text-[#a855f7]" />
                    </div>
                    <div>
                      <div className="text-[#a855f7] font-bold text-2xl xl:text-3xl">24/7</div>
                      <div className="text-white/50 text-xs xl:text-sm">Support</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute top-28 right-52 w-3 h-3 bg-[#2f96f0]/60 rounded-full animate-pulse" />
              <div className="absolute top-48 right-8 w-2 h-2 bg-[#32a88a]/60 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
              <div className="absolute bottom-32 right-48 w-2.5 h-2.5 bg-[#fab81e]/60 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
              <div className="absolute bottom-20 left-4 w-2 h-2 bg-[#a855f7]/60 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
              <div className="absolute top-1/3 left-32 w-1.5 h-1.5 bg-white/30 rounded-full animate-pulse" style={{ animationDelay: '0.7s' }} />
            </div>
          </div>
        </div>

        {/* Hero Floating Animations */}
        <style jsx>{`
          .hero-float-1 {
            animation: heroFloat 4s ease-in-out infinite;
          }
          .hero-float-2 {
            animation: heroFloat 4s ease-in-out infinite 1s;
          }
          .hero-float-3 {
            animation: heroFloat 4s ease-in-out infinite 2s;
          }
          @keyframes heroFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-12px); }
          }
        `}</style>
      </section>

      {/* For All Devices Section */}
      <section className="py-20 md:py-28 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-[28px] md:text-[32px] lg:text-[36px] font-normal text-white text-center mb-12 md:mb-16">
            For All Devices
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 lg:gap-12">
            <DeviceCard icon={Smartphone} name="Android" version="4.4 and higher" />
            <DeviceCard icon={Smartphone} name="iOS" version="9.0 and higher" />
            <DeviceCard icon={Monitor} name="Windows" version="XP and higher" />
            <DeviceCard icon={Monitor} name="MacOS" version="Mavericks and higher" />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 md:py-28 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-[28px] md:text-[32px] lg:text-[36px] font-normal text-white text-center mb-12 md:mb-16">
            How It Works
          </h2>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 lg:gap-12">
            <HowItWorksCard
              icon={Wallet}
              title="Deposit"
              description="Open a real account and add funds. We work with more than 20 payment systems."
            />
            <HowItWorksCard
              icon={TrendingUp}
              title="Trade"
              description="Trade any of 100 assets and stocks. Use technical analysis and trade the news."
            />
            <HowItWorksCard
              icon={CreditCard}
              title="Withdraw"
              description="Get your funds sent to your bank card or e-wallet. We take no commissions."
            />
          </div>
        </div>
      </section>

      {/* Trusted Section */}
      <section className="py-20 md:py-28 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-start">
            {/* Trusted - Left side (no card, just content) */}
            <div className="py-4">
              <div className="flex items-center gap-4 mb-6">
                {/* Shield icon - blue outline style like ExpertOption */}
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                  <path d="M24 4L6 12V22C6 33.1 13.68 43.28 24 46C34.32 43.28 42 33.1 42 22V12L24 4Z" stroke="#2f96f0" strokeWidth="2" fill="none"/>
                  <path d="M16 24L21 29L32 18" stroke="#2f96f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
                <h3 className="text-white text-[32px] md:text-[36px] font-normal">Trusted</h3>
              </div>
              <p className="text-white/60 text-[16px] md:text-[18px] leading-relaxed mb-8">
                Optigo is a leader in the online trading industry.<br/>
                We are trusted by more than <span className="text-white font-semibold">50,000 clients.</span>
              </p>
              <Link href="/about" className="inline-flex items-center justify-center px-8 py-3 bg-[#2f96f0] hover:bg-[#3ba3f7] text-white text-[15px] md:text-[16px] font-medium rounded-lg transition-colors min-w-[160px]">
                See more
              </Link>
            </div>

            {/* Award Card - Right side (in card with background) */}
            <div className="bg-[#242f4a]/60 border border-white/10 rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                {/* Trophy icon - light blue outline style */}
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                  <path d="M10 6H22V14C22 17.3137 19.3137 20 16 20C12.6863 20 10 17.3137 10 14V6Z" stroke="#7eb8e6" strokeWidth="1.5" fill="none"/>
                  <path d="M10 8H6V10C6 12.2091 7.79086 14 10 14V8Z" stroke="#7eb8e6" strokeWidth="1.5" fill="none"/>
                  <path d="M22 8H26V10C26 12.2091 24.2091 14 22 14V8Z" stroke="#7eb8e6" strokeWidth="1.5" fill="none"/>
                  <path d="M16 20V24" stroke="#7eb8e6" strokeWidth="1.5"/>
                  <path d="M11 26H21" stroke="#7eb8e6" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M13 24H19V26H13V24Z" stroke="#7eb8e6" strokeWidth="1.5" fill="none"/>
                </svg>
                <h3 className="text-white text-[20px] md:text-[22px] font-medium">Best Trading Platform</h3>
              </div>
              <p className="text-white/50 text-[14px] md:text-[15px] leading-relaxed">
                Award winner at China Trading Expo<br/>
                Shenzhen, 6-7 May 2017
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Global Trading Platform Section */}
      <section className="py-20 md:py-28 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-12 md:mb-16">
            <div className="w-10 h-10 rounded-lg bg-[#2f96f0]/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-[#2f96f0]" />
            </div>
            <h2 className="text-[28px] md:text-[32px] lg:text-[36px] font-normal text-white">
              Global Trading Platform
            </h2>
          </div>

          {/* Stats Grid - Outlined capsule style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8 mb-12 md:mb-16">
            <StatCard value="$10" label="Minimum Deposit" icon={DollarSign} />
            <StatCard value="$1" label="Minimum Trading Amount" icon={CircleDollarSign} />
            <StatCard value="0%" label="Commissions" icon={Percent} />
            <StatCard value="0%" label="Fees" icon={BadgePercent} />
          </div>

          {/* Globe Graphic - ExpertOption Map */}
          <div className="relative flex justify-center mb-8 md:mb-12 py-8">
            <div className="relative w-full max-w-3xl mx-auto">
              <Image
                src="/map.svg"
                alt="Global Trading Map"
                width={900}
                height={450}
                className="w-full h-auto opacity-80"
              />
            </div>
          </div>

          <p className="text-white/60 text-center text-[16px] md:text-[18px]">
            Users from over <span className="text-white font-semibold">48 countries</span> choose to trade with Optigo
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          {/* Logo & Columns */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
            {/* Logo */}
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <Image src="/logo.png" alt="Optigo" width={28} height={28} />
                <span className="text-white font-semibold text-[16px]">Optigo</span>
              </Link>
              <p className="text-white/50 text-[12px] leading-relaxed">
                Professional trading platform for everyone.
              </p>
            </div>

            {/* Link Columns */}
            <FooterColumn
              title="Home"
              links={[
                { label: 'Free demo', href: '/register?demo=true' },
                { label: 'Log in', href: '/login' },
                { label: 'Register', href: '/register' },
              ]}
            />
            <FooterColumn
              title="Trading"
              links={[
                { label: 'Features', href: '/about' },
                { label: 'Account types', href: '/about' },
                { label: 'FAQ', href: '/contact' },
              ]}
            />
            <FooterColumn
              title="Education"
              links={[
                { label: 'How to Start', href: '/about' },
                { label: 'Strategies', href: '/about' },
                { label: 'Trading Tips', href: '/about' },
              ]}
            />
            <FooterColumn
              title="Company"
              links={[
                { label: 'About us', href: '/about' },
                { label: 'Terms', href: '/terms' },
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'AML & KYC', href: '/aml' },
              ]}
            />
            <FooterColumn
              title="Support"
              links={[
                { label: 'Contact', href: '/contact' },
                { label: 'Help Center', href: '/contact' },
              ]}
            />
          </div>

          {/* Payment Methods */}
          <div className="border-t border-white/10 pt-8 mb-8">
            <p className="text-white/50 text-[11px] mb-4 text-center md:text-left">Payment methods</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              {['VISA', 'Mastercard', 'Skrill', 'NETELLER', 'Bitcoin', 'USDT'].map((method) => (
                <span
                  key={method}
                  className="px-3 py-1.5 bg-[#1e2744]/50 border border-white/10 rounded text-white/70 text-[11px] font-medium"
                >
                  {method}
                </span>
              ))}
            </div>
          </div>

          {/* Legal Disclaimer */}
          <div className="border-t border-white/10 pt-8">
            <p className="text-white/40 text-[11px] leading-relaxed mb-6">
              Trading and investing involves significant level of risk and is not suitable and/or appropriate for all clients. Please make sure you carefully consider your investment objectives, level of experience and risk appetite before buying or selling. Buying or selling entails financial risks and could result in a partial or complete loss of your funds, therefore, you should not invest funds you cannot afford to lose.
            </p>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <span className="text-white/40 text-[11px]">
                &copy; 2025 Optigo. All rights reserved.
              </span>
              <span className="text-white/40 text-[11px]">
                Trade responsibly. Your capital is at risk.
              </span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
