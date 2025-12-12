'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Zap,
  Users,
  BarChart3,
  Globe,
  Clock,
  CheckCircle2,
  ArrowRight,
  Menu,
  X,
  Wallet,
  Play,
  Lock,
  LineChart,
  PieChart,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

// Live Price Ticker
function LiveTicker() {
  const tickers = [
    { symbol: 'EUR/USD', price: '1.0847', change: '+0.12%', up: true },
    { symbol: 'GBP/USD', price: '1.2634', change: '+0.08%', up: true },
    { symbol: 'BTC/USD', price: '43,521', change: '-0.45%', up: false },
    { symbol: 'ETH/USD', price: '2,284', change: '+1.23%', up: true },
    { symbol: 'USD/JPY', price: '148.92', change: '-0.18%', up: false },
    { symbol: 'XAU/USD', price: '2,024', change: '+0.34%', up: true },
  ];

  return (
    <div className="bg-[#0d0d0d] border-b border-white/5 overflow-hidden">
      <div className="animate-ticker flex whitespace-nowrap py-1.5">
        {[...tickers, ...tickers].map((ticker, i) => (
          <div key={i} className="inline-flex items-center gap-4 px-4">
            <span className="text-white/50 text-xs">{ticker.symbol}</span>
            <span className="text-white text-xs font-medium">{ticker.price}</span>
            <span className={cn('text-[10px]', ticker.up ? 'text-[#0535ed]' : 'text-red-400')}>
              {ticker.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Animated Counter
function AnimatedCounter({ end, suffix = '', prefix = '' }: { end: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          let start = 0;
          const duration = 1500;
          const increment = end / (duration / 16);
          const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, hasAnimated]);

  return (
    <div ref={ref} className="text-2xl md:text-3xl font-bold text-white">
      {prefix}{count.toLocaleString()}{suffix}
    </div>
  );
}

// Compact Platform Preview
function PlatformPreview() {
  return (
    <div className="relative max-w-md mx-auto lg:mx-0">
      <div className="absolute -inset-3 bg-gradient-to-r from-[#0630ba]/30 via-[#0535ed]/20 to-purple-500/20 rounded-2xl blur-xl opacity-50" />

      <div className="relative bg-[#141414] border border-white/10 rounded-xl overflow-hidden">
        {/* Browser Bar */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-[#0d0d0d] border-b border-white/5">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500/70" />
            <div className="w-2 h-2 rounded-full bg-yellow-500/70" />
            <div className="w-2 h-2 rounded-full bg-[#0535ed]/70" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-3 py-0.5 bg-white/5 rounded text-[10px] text-white/30">
              trade.optigobroker.com
            </div>
          </div>
        </div>

        {/* Chart Content */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#0630ba] to-[#0535ed] rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-white font-medium text-sm">EUR/USD</div>
                <div className="text-[#0535ed] text-xs">+0.12%</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-white">1.0847</div>
              <div className="text-white/30 text-[10px]">Live</div>
            </div>
          </div>

          {/* Chart */}
          <div className="h-32 mb-3">
            <svg viewBox="0 0 400 130" className="w-full h-full">
              <defs>
                <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#0535ed" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#0535ed" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 32, 65, 97, 130].map((y) => (
                <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#ffffff" strokeOpacity="0.03" />
              ))}
              <path d="M0,100 C50,90 100,80 150,65 C200,50 250,60 300,40 C350,20 380,25 400,20 L400,130 L0,130 Z" fill="url(#chartGrad)" />
              <path d="M0,100 C50,90 100,80 150,65 C200,50 250,60 300,40 C350,20 380,25 400,20" fill="none" stroke="#0535ed" strokeWidth="2" />
              <circle cx="400" cy="20" r="4" fill="#0535ed" />
            </svg>
          </div>

          {/* Trade Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 text-white text-sm font-semibold rounded-lg">
              <TrendingUp className="w-4 h-4" /> UP <span className="text-emerald-200 text-xs">+98%</span>
            </button>
            <button className="flex items-center justify-center gap-1.5 py-2.5 bg-red-500 text-white text-sm font-semibold rounded-lg">
              <TrendingDown className="w-4 h-4" /> DOWN <span className="text-red-200 text-xs">+98%</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Cards */}
      <div className="absolute -top-3 -right-3 bg-[#141414] border border-white/10 rounded-lg px-2.5 py-1.5 shadow-lg animate-float">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3 text-emerald-400" />
          <span className="text-emerald-400 text-xs font-bold">+$847</span>
        </div>
      </div>
      <div className="absolute -bottom-2 -left-2 bg-[#141414] border border-white/10 rounded-lg px-2.5 py-1.5 shadow-lg animate-float-delayed">
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-4 h-4 rounded-full bg-gradient-to-br from-[#0630ba] to-[#0535ed] border border-[#141414]" />
            ))}
          </div>
          <span className="text-white/50 text-[10px]">2.4k online</span>
        </div>
      </div>
    </div>
  );
}

const features = [
  { icon: Zap, title: 'Instant Execution', desc: '<10ms trades', gradient: 'from-yellow-500 to-orange-500' },
  { icon: Shield, title: 'Secure Platform', desc: '256-bit encryption', gradient: 'from-[#0630ba] to-[#0535ed]' },
  { icon: LineChart, title: 'Pro Charts', desc: '100+ indicators', gradient: 'from-[#0535ed] to-indigo-500' },
  { icon: Users, title: 'Copy Trading', desc: 'Follow experts', gradient: 'from-purple-500 to-pink-500' },
  { icon: Globe, title: '100+ Markets', desc: 'Forex, Crypto, Stocks', gradient: 'from-cyan-500 to-[#0535ed]' },
  { icon: Wallet, title: 'Fast Payouts', desc: 'Instant withdrawals', gradient: 'from-rose-500 to-red-500' },
];

const stats = [
  { value: 50000, suffix: '+', label: 'Traders', icon: Users },
  { value: 10, prefix: '$', suffix: 'M+', label: 'Volume', icon: BarChart3 },
  { value: 98, suffix: '%', label: 'Payout', icon: PieChart },
  { value: 24, suffix: '/7', label: 'Support', icon: Clock },
];

const markets = [
  { name: 'Forex', pairs: '50+', icon: '💱', color: 'from-[#0630ba] to-[#0535ed]' },
  { name: 'Crypto', pairs: '30+', icon: '₿', color: 'from-orange-500 to-orange-600' },
  { name: 'Stocks', pairs: '100+', icon: '📈', color: 'from-emerald-500 to-emerald-600' },
  { name: 'Commodities', pairs: '20+', icon: '🥇', color: 'from-yellow-500 to-yellow-600' },
];

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isHydrated, router]);

  if (isHydrated && isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <LiveTicker />

      {/* Navigation */}
      <nav className={cn(
        'fixed top-[28px] left-0 right-0 z-50 transition-all duration-200',
        scrolled ? 'bg-[#0a0a0a]/95 backdrop-blur-lg border-b border-white/5' : ''
      )}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="OptigoBroker" width={32} height={32} className="h-7 w-7" />
              <span className="text-lg font-bold text-white">OptigoBroker</span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-white/50 hover:text-white text-sm">Features</a>
              <a href="#markets" className="text-white/50 hover:text-white text-sm">Markets</a>
              <a href="#how-it-works" className="text-white/50 hover:text-white text-sm">How it Works</a>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <Link href="/login" className="px-4 py-2 text-white/70 hover:text-white text-sm">
                Log In
              </Link>
              <Link href="/register" className="px-4 py-2 bg-[#0630ba] hover:bg-[#0535ed] text-white text-sm font-medium rounded-lg transition-colors">
                Get Started
              </Link>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-1.5 text-white/60">
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0a0a0a] border-t border-white/5 px-4 py-3 space-y-2">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-white/50 py-1.5 text-sm">Features</a>
            <a href="#markets" onClick={() => setMobileMenuOpen(false)} className="block text-white/50 py-1.5 text-sm">Markets</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block text-white/50 py-1.5 text-sm">How it Works</a>
            <div className="pt-2 flex gap-2">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center py-2 text-white border border-white/10 rounded-lg text-sm">Log In</Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center py-2 bg-[#0630ba] text-white rounded-lg text-sm font-medium">Get Started</Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative pt-24 md:pt-28 pb-12 md:pb-16 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-[#0630ba]/15 via-transparent to-transparent blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-8 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs mb-5">
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0535ed] opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#0630ba]" />
                </span>
                <span className="text-white/50">Trusted by 50,000+ traders</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                Trade Smarter.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0535ed] via-[#0630ba] to-purple-400">
                  Profit Faster.
                </span>
              </h1>

              <p className="text-base text-white/40 max-w-md mb-6 mx-auto lg:mx-0">
                Access global markets with up to 98% returns. Advanced tools, instant execution, bank-grade security.
              </p>

              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 mb-6">
                <Link href="/register" className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#0630ba] hover:bg-[#0535ed] text-white font-medium rounded-lg transition-all">
                  Start Trading <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="#how-it-works" className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10">
                  <Play className="h-4 w-4" /> How It Works
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-white/30 text-xs">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-[#0535ed]" />
                  <span>SSL Secured</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-[#0535ed]" />
                  <span>2FA Protected</span>
                </div>
              </div>
            </div>

            <div className="lg:pl-4">
              <PlatformPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 px-4 border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <AnimatedCounter end={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                <div className="text-white/30 text-xs mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-12 md:py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Why Choose Us</h2>
            <p className="text-white/40 text-sm">Professional tools for serious traders</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {features.map((f, i) => (
              <div key={i} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:border-white/10 transition-all">
                <div className={cn('w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center mb-3', f.gradient)}>
                  <f.icon className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-white font-medium text-sm mb-0.5">{f.title}</h3>
                <p className="text-white/40 text-xs">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Markets */}
      <section id="markets" className="py-12 md:py-16 px-4 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Trade Global Markets</h2>
            <p className="text-white/40 text-sm">One account, all markets</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {markets.map((m, i) => (
              <div key={i} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:border-white/10 transition-all text-center">
                <div className="text-2xl mb-2">{m.icon}</div>
                <h3 className="text-white font-medium text-sm">{m.name}</h3>
                <div className={cn('inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-medium bg-gradient-to-r text-white', m.color)}>
                  {m.pairs} pairs
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-12 md:py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Start in 3 Steps</h2>
            <p className="text-white/40 text-sm">Begin trading in minutes</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { num: '01', title: 'Create Account', desc: 'Sign up in 30 seconds with email' },
              { num: '02', title: 'Fund Account', desc: 'Deposit via crypto or card from $10' },
              { num: '03', title: 'Start Trading', desc: 'Access all markets and earn' },
            ].map((step, i) => (
              <div key={i} className="relative text-center p-5 bg-white/[0.02] border border-white/5 rounded-xl">
                <div className="inline-flex items-center justify-center w-10 h-10 bg-[#0630ba] rounded-lg mb-3">
                  <span className="text-sm font-bold text-white">{step.num}</span>
                </div>
                <h3 className="text-white font-medium text-sm mb-1">{step.title}</h3>
                <p className="text-white/40 text-xs">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-6">
            <Link href="/register" className="inline-flex items-center gap-2 px-6 py-3 bg-[#0630ba] hover:bg-[#0535ed] text-white font-medium rounded-lg transition-all">
              Create Free Account <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-12 md:py-16 px-4 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Everything You Need</h2>
              <div className="space-y-2.5">
                {[
                  'Up to 98% payout on trades',
                  'Advanced TradingView charts',
                  'Copy trading from experts',
                  'Instant withdrawals',
                  '24/7 customer support',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#0535ed] flex-shrink-0" />
                    <span className="text-white/60 text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <Link href="/register" className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-[#0630ba] hover:bg-[#0535ed] text-white text-sm font-medium rounded-lg">
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Zap, title: 'Fast', desc: '<10ms', gradient: 'from-yellow-500 to-orange-500' },
                { icon: Shield, title: 'Secure', desc: 'Cold storage', gradient: 'from-[#0630ba] to-[#0535ed]' },
                { icon: Wallet, title: 'Easy', desc: 'Crypto & Card', gradient: 'from-[#0535ed] to-indigo-500' },
                { icon: Users, title: 'Copy', desc: 'Top traders', gradient: 'from-purple-500 to-pink-500' },
              ].map((item, i) => (
                <div key={i} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                  <div className={cn('w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center mb-2', item.gradient)}>
                    <item.icon className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-white font-medium text-sm">{item.title}</h3>
                  <p className="text-white/40 text-xs">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 md:py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative p-6 md:p-10 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0630ba] via-[#0535ed] to-indigo-800" />
            <div className="absolute top-0 left-1/4 w-48 h-48 bg-white/10 rounded-full blur-3xl" />

            <div className="relative text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Ready to Start?</h2>
              <p className="text-blue-100/70 text-sm mb-5 max-w-md mx-auto">
                Join thousands of traders. Create your free account and start earning.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/register" className="w-full sm:w-auto px-6 py-2.5 bg-white hover:bg-white/90 text-[#0630ba] font-medium rounded-lg">
                  Create Account
                </Link>
                <Link href="/login" className="w-full sm:w-auto px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg border border-white/20">
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="OptigoBroker" width={28} height={28} />
              <span className="text-white font-semibold">OptigoBroker</span>
            </Link>

            <div className="flex items-center gap-4 text-xs text-white/30">
              <a href="#features" className="hover:text-white/60">Features</a>
              <a href="#markets" className="hover:text-white/60">Markets</a>
              <Link href="/login" className="hover:text-white/60">Login</Link>
              <Link href="/register" className="hover:text-white/60">Register</Link>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded text-[10px] text-white/40">
                <Shield className="h-3 w-3 text-[#0535ed]" /> SSL
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded text-[10px] text-white/40">
                <Lock className="h-3 w-3 text-[#0535ed]" /> 2FA
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-white/20">
            <span>&copy; 2025 OptigoBroker. All rights reserved.</span>
            <span>Trade responsibly. Your capital is at risk.</span>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-ticker { animation: ticker 25s linear infinite; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 3s ease-in-out infinite 1s; }
      `}</style>
    </div>
  );
}
