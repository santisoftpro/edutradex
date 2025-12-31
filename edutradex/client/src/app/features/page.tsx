'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import {
  Menu,
  X,
  ChevronRight,
  MessageCircle,
  Star,
  TrendingUp,
  BarChart3,
  Users,
  Layers,
  Monitor,
  Globe,
  Zap,
  Clock,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

// Feature highlights for hero section
const heroFeatures = [
  {
    icon: BarChart3,
    title: 'Technical analysis tools',
    description: '4 chart types, 8 indicators, trend lines',
  },
  {
    icon: Users,
    title: 'Social trading',
    description: 'Watch deals across the globe or trade with your friends',
  },
  {
    icon: Layers,
    title: 'Over 100 assets',
    description: 'Including popular stocks like Apple, Facebook and Tesla',
  },
];

// Mobile app features
const mobileFeatures = [
  {
    title: 'Top Finance App in 47 countries',
    description: 'According to the App Store and Google Play ranking',
  },
  {
    title: 'Fully featured app',
    description: 'Providing all trading platform functionality',
  },
  {
    title: 'Over 100,000,000 installs',
    description: 'Fastest growing mobile trading app',
  },
];

// Desktop app features
const desktopFeatures = [
  {
    icon: BarChart3,
    title: 'Best for market analysis',
    description: 'Various customizable analytical tools',
  },
  {
    icon: Zap,
    title: 'Highest performance',
    description: 'Optimal performance on any device',
  },
  {
    icon: Clock,
    title: 'Immediate access to trading',
    description: 'Convenient and native user experience',
  },
];

export default function FeaturesPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

              <div className="hidden md:flex items-center gap-2 text-white/70 text-sm">
                <div className="w-6 h-4 bg-gradient-to-b from-blue-600 via-white to-red-600 rounded-sm" />
                <span>EN</span>
              </div>

              <Link href="/contact" className="hidden md:flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors">
                <MessageCircle className="w-4 h-4" />
                <span>Online chat</span>
              </Link>
            </div>

            {/* Center - Logo */}
            <Link href="/" className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
              <Image src="/logo.png" alt="Optigo" width={32} height={32} className="h-8 w-8" />
              <span className="text-white font-bold text-lg hidden sm:block">Optigo</span>
            </Link>

            {/* Right Side - Auth Buttons */}
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-white/70 hover:text-white text-sm font-medium transition-colors">
                Log in
              </Link>
              <Link href="/register" className="px-5 py-2 bg-[#2f96f0] hover:bg-[#3ba3f7] text-white text-sm font-semibold rounded-lg transition-colors">
                Register
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Fullscreen Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] overflow-hidden" style={{ background: 'radial-gradient(ellipse 150% 100% at 80% 0%, #1a2340 0%, #0d1220 40%, #0a0e18 100%)' }}>
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <svg className="absolute w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
              <ellipse cx="200" cy="500" rx="600" ry="800" fill="none" stroke="rgba(47,150,240,0.06)" strokeWidth="1" />
              <ellipse cx="150" cy="450" rx="500" ry="700" fill="none" stroke="rgba(47,150,240,0.04)" strokeWidth="1" />
            </svg>
          </div>

          <div className="relative flex items-center justify-between px-4 py-4">
            <button
              onClick={() => { setMobileMenuOpen(false); setExpandedMenu(null); }}
              className="p-2 text-white/80 hover:text-white transition-colors"
            >
              <X className="h-7 w-7" />
            </button>
            <Link
              href="/"
              onClick={() => { setMobileMenuOpen(false); setExpandedMenu(null); }}
              className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2"
            >
              <Image src="/logo.png" alt="Optigo" width={32} height={32} className="h-8 w-8" />
              <span className="text-white font-bold text-lg">Optigo</span>
            </Link>
            <div className="w-11" />
          </div>

          <nav className="relative px-6 pt-8 flex">
            <div className="flex-shrink-0">
              {menuData.map((item) => (
                <div key={item.label}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={() => { setMobileMenuOpen(false); setExpandedMenu(null); }}
                      className="block text-white/50 hover:text-white text-[32px] font-light py-3 transition-colors"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <button
                      onClick={() => setExpandedMenu(expandedMenu === item.label ? null : item.label)}
                      className={cn(
                        'block text-[32px] py-3 transition-colors text-left',
                        expandedMenu === item.label ? 'text-white font-medium' : 'text-white/50 font-light hover:text-white'
                      )}
                    >
                      {item.label}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="ml-12 md:ml-24 lg:ml-32 pt-1">
              {menuData.map((item) => (
                item.submenu && expandedMenu === item.label && (
                  <div key={item.label} className="space-y-1">
                    {item.submenu.map((subItem) => (
                      <Link
                        key={subItem.label}
                        href={subItem.href}
                        onClick={() => { setMobileMenuOpen(false); setExpandedMenu(null); }}
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

          <div className="absolute bottom-0 left-0 right-0 pb-8">
            <div className="flex items-center justify-center gap-4 px-6 mb-6">
              <span className="text-white/50 text-[10px]">Verified by <span className="text-white/70 font-medium">VISA</span></span>
              <span className="text-white/70 text-[10px] font-medium">MasterCard</span>
              <span className="text-white/50 text-[10px]">3D <span className="text-white/70">SECURE</span></span>
              <span className="text-white/70 text-[10px] font-medium">PCI DSS</span>
            </div>
            <div className="px-6">
              <Link
                href="/register?demo=true"
                onClick={() => { setMobileMenuOpen(false); setExpandedMenu(null); }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#2f96f0] hover:bg-[#3ba3f7] text-white text-[15px] font-medium rounded-lg transition-colors"
              >
                Try free demo
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="pt-24 md:pt-32 pb-16 md:pb-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            {/* Left Content */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Star className="w-7 h-7 text-[#2f96f0]" />
                <h1 className="text-[32px] md:text-[44px] font-light text-white">Features</h1>
              </div>

              <p className="text-white/60 text-[15px] md:text-[16px] leading-relaxed mb-8 max-w-md">
                We provide the fastest trading using modern technologies, with no delays in
                order executions and the most accurate quotes. Our trading platform is
                available around the clock, including weekends. Exceptional customer
                service is available 24/7.
              </p>

              {/* Feature Highlights */}
              <div className="space-y-5">
                {heroFeatures.map((feature, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-lg bg-[#2f96f0]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <feature.icon className="w-4 h-4 text-[#2f96f0]" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-[15px] mb-0.5">{feature.title}</h3>
                      <p className="text-white/50 text-[13px]">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Content - Trading Chart */}
            <div className="relative">
              <div className="bg-[#151b2e] rounded-xl p-4 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">EUR</div>
                    <span className="text-white font-medium text-sm">EUR/USD</span>
                  </div>
                  <span className="text-[#32a88a] text-xs">+0.12%</span>
                </div>

                <div className="h-[160px] relative mb-3">
                  <svg viewBox="0 0 400 120" className="w-full h-full">
                    <defs>
                      <linearGradient id="featChartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#2f96f0" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#2f96f0" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[0, 30, 60, 90, 120].map((y) => (
                      <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="rgba(255,255,255,0.04)" />
                    ))}
                    <path d="M0,90 C50,85 100,70 150,60 C200,50 250,65 300,40 C350,25 380,30 400,20 L400,120 L0,120 Z" fill="url(#featChartGrad)" />
                    <path d="M0,90 C50,85 100,70 150,60 C200,50 250,65 300,40 C350,25 380,30 400,20" fill="none" stroke="#2f96f0" strokeWidth="2" />
                    <circle cx="400" cy="20" r="4" fill="#2f96f0" />
                  </svg>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-[#0d1220] rounded-lg mb-3">
                  <span className="text-white/50 text-xs">Trade Amount</span>
                  <span className="text-white font-semibold text-sm">$100</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button className="py-2.5 bg-[#32a88a] text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5">
                    <TrendingUp className="w-4 h-4" />
                    UP
                  </button>
                  <button className="py-2.5 bg-[#d7276b] text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5">
                    <TrendingUp className="w-4 h-4 rotate-180" />
                    DOWN
                  </button>
                </div>
              </div>

              {/* Floating Brand Icons */}
              <div className="hidden md:block absolute -top-3 -right-3 w-10 h-10 bg-[#1877f2] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">f</div>
              <div className="hidden md:block absolute top-16 -right-6 w-10 h-10 bg-[#e31937] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">T</div>
              <div className="hidden md:block absolute bottom-16 -right-3 w-10 h-10 bg-[#4285f4] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">G</div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Apps Section */}
      <section className="py-16 md:py-24 px-4 md:px-8 bg-[#0a0e18]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Phone Mockup */}
            <div className="flex justify-center lg:justify-start order-2 lg:order-1">
              <div className="relative">
                <div className="w-[240px] bg-[#1a1f35] rounded-[36px] p-1.5 shadow-2xl">
                  <div className="bg-[#0d1220] rounded-[30px] overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-1.5 bg-[#151b2e]">
                      <span className="text-white/50 text-[10px]">9:41</span>
                      <div className="w-3 h-1.5 border border-white/50 rounded-sm">
                        <div className="w-2/3 h-full bg-white/50 rounded-sm" />
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 bg-[#2f96f0] rounded-md flex items-center justify-center">
                            <TrendingUp className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-white font-semibold text-xs">Optigo</span>
                        </div>
                        <span className="text-[#32a88a] text-[10px]">$10,000</span>
                      </div>
                      <div className="h-[90px] bg-[#151b2e] rounded-md mb-3">
                        <svg viewBox="0 0 180 70" className="w-full h-full p-1.5">
                          <path d="M0,50 C25,45 50,35 75,30 C100,25 125,38 150,18 L150,70 L0,70 Z" fill="rgba(47,150,240,0.15)" />
                          <path d="M0,50 C25,45 50,35 75,30 C100,25 125,38 150,18" fill="none" stroke="#2f96f0" strokeWidth="1.5" />
                        </svg>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button className="py-2 bg-[#32a88a] text-white text-[10px] font-bold rounded-md">UP</button>
                        <button className="py-2 bg-[#d7276b] text-white text-[10px] font-bold rounded-md">DOWN</button>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-4 bg-black rounded-full" />
                </div>

                {/* OS Icons */}
                <div className="absolute -right-12 top-1/2 -translate-y-1/2 flex flex-col gap-3">
                  <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  </div>
                  <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                    <svg className="w-5 h-5 text-[#3DDC84]" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z"/></svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="order-1 lg:order-2">
              <h2 className="text-[28px] md:text-[36px] font-light text-white mb-8">Mobile Apps</h2>

              <div className="space-y-6">
                {mobileFeatures.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#2f96f0] mt-2 flex-shrink-0" />
                    <div>
                      <h3 className="text-white font-medium text-[15px] mb-0.5">{feature.title}</h3>
                      <p className="text-white/50 text-[13px]">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 mt-8">
                <Link href="#" className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-black rounded-lg border border-white/10 hover:border-white/20 transition-colors">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  <div>
                    <div className="text-white/50 text-[9px]">Download on the</div>
                    <div className="text-white font-medium text-[12px]">App Store</div>
                  </div>
                </Link>
                <Link href="#" className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-black rounded-lg border border-white/10 hover:border-white/20 transition-colors">
                  <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="#EA4335" d="M5.26 4.19L13.05 12l-7.79 7.81c-.43-.42-.69-1.02-.69-1.69V5.88c0-.67.26-1.27.69-1.69z"/><path fill="#FBBC05" d="M17.62 9.86L5.26 4.19l7.79 7.81 4.57-2.14z"/><path fill="#34A853" d="M17.62 14.14L5.26 19.81l7.79-7.81 4.57 2.14z"/><path fill="#4285F4" d="M19.43 10.74l-1.81-.88-4.57 2.14 4.57 2.14 1.81-.88c.58-.28.99-.87.99-1.26s-.41-.98-.99-1.26z"/></svg>
                  <div>
                    <div className="text-white/50 text-[9px]">GET IT ON</div>
                    <div className="text-white font-medium text-[12px]">Google Play</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Desktop Apps Section */}
      <section className="py-16 md:py-24 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Content */}
            <div>
              <h2 className="text-[28px] md:text-[36px] font-light text-white mb-8">Desktop Apps</h2>

              <div className="space-y-6">
                {desktopFeatures.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#2f96f0]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <feature.icon className="w-4 h-4 text-[#2f96f0]" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-[15px] mb-0.5">{feature.title}</h3>
                      <p className="text-white/50 text-[13px]">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 mt-8">
                <Link href="#" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2f96f0] hover:bg-[#3ba3f7] rounded-lg transition-colors">
                  <Monitor className="w-4 h-4 text-white" />
                  <span className="text-white font-medium text-sm">Windows</span>
                </Link>
                <Link href="#" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2f96f0] hover:bg-[#3ba3f7] rounded-lg transition-colors">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  <span className="text-white font-medium text-sm">macOS</span>
                </Link>
              </div>
            </div>

            {/* Laptop Mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative">
                <div className="w-[340px] bg-[#1a2340] rounded-t-lg p-2 border border-white/5 border-b-0">
                  <div className="bg-[#0d1220] rounded overflow-hidden">
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#151b2e]">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-[#d7276b]" />
                        <div className="w-2 h-2 rounded-full bg-[#fab81e]" />
                        <div className="w-2 h-2 rounded-full bg-[#32a88a]" />
                      </div>
                      <div className="flex-1 mx-3 px-2 py-0.5 bg-[#0d1220] rounded text-white/30 text-[10px]">optigo.com</div>
                    </div>
                    <div className="p-3 h-[180px]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Image src="/logo.png" alt="Optigo" width={18} height={18} />
                          <span className="text-white font-semibold text-xs">Optigo</span>
                        </div>
                        <span className="text-[#32a88a] text-[10px]">Demo: $10,000</span>
                      </div>
                      <div className="h-[120px]">
                        <svg viewBox="0 0 300 90" className="w-full h-full">
                          <defs>
                            <linearGradient id="deskChartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#2f96f0" stopOpacity="0.15" />
                              <stop offset="100%" stopColor="#2f96f0" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          {[0, 22.5, 45, 67.5, 90].map((y) => (
                            <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="rgba(255,255,255,0.03)" />
                          ))}
                          <path d="M0,60 C35,55 70,42 105,47 C140,52 175,35 210,30 C245,25 275,38 300,18 L300,90 L0,90 Z" fill="url(#deskChartGrad)" />
                          <path d="M0,60 C35,55 70,42 105,47 C140,52 175,35 210,30 C245,25 275,38 300,18" fill="none" stroke="#2f96f0" strokeWidth="1.5" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-[380px] h-3 bg-gradient-to-b from-[#2a3654] to-[#1a2340] rounded-b-lg" style={{ marginLeft: '-20px' }} />
                <div className="w-[100px] h-1 bg-[#1a2340] rounded-b mx-auto" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Web Platform CTA */}
      <section className="py-10 md:py-14 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#151b2e] rounded-xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-5 border border-white/5">
            <div className="flex items-center gap-3">
              <Globe className="w-8 h-8 text-[#2f96f0]" />
              <div>
                <h3 className="text-white text-[20px] md:text-[24px] font-light">Web Platform</h3>
                <p className="text-white/50 text-[13px]">Get $10,000 to practice with just one click</p>
              </div>
            </div>
            <Link
              href="/register?demo=true"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#2f96f0] hover:bg-[#3ba3f7] text-white font-medium text-sm rounded-lg transition-colors"
            >
              Try free demo
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="Optigo" width={24} height={24} />
              <span className="text-white font-semibold text-sm">Optigo</span>
            </Link>
            <div className="flex flex-wrap items-center justify-center gap-5 text-xs">
              <Link href="/" className="text-white/50 hover:text-white transition-colors">Home</Link>
              <Link href="/features" className="text-white/50 hover:text-white transition-colors">Features</Link>
              <Link href="/about" className="text-white/50 hover:text-white transition-colors">About</Link>
              <Link href="/contact" className="text-white/50 hover:text-white transition-colors">Contact</Link>
            </div>
          </div>

          <div className="border-t border-white/5 pt-6 mb-6">
            <p className="text-white/40 text-[10px] mb-3 text-center">Payment methods</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {['VISA', 'Mastercard', 'Skrill', 'NETELLER', 'Bitcoin', 'USDT'].map((method) => (
                <span key={method} className="px-2.5 py-1 bg-white/5 border border-white/5 rounded text-white/50 text-[10px]">
                  {method}
                </span>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5 pt-6 text-center">
            <p className="text-white/30 text-[10px] leading-relaxed mb-3 max-w-3xl mx-auto">
              Trading and investing involves significant level of risk and is not suitable for all clients. Please carefully consider your investment objectives and risk appetite before trading.
            </p>
            <span className="text-white/30 text-[10px]">&copy; 2025 Optigo. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
