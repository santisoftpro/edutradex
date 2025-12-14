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
  Star,
  UserPlus,
  TrendingUpIcon,
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
    <div className="bg-[#1a1a1a] border-b border-white/10 overflow-hidden shadow-lg shadow-black/20">
      <div className="animate-ticker flex whitespace-nowrap py-2">
        {[...tickers, ...tickers].map((ticker, i) => (
          <div key={i} className="inline-flex items-center gap-4 px-4">
            <span className="text-white/70 text-xs font-medium">{ticker.symbol}</span>
            <span className="text-white text-xs font-semibold">{ticker.price}</span>
            <span className={cn('text-[10px] font-medium', ticker.up ? 'text-emerald-400' : 'text-red-400')}>
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
      <div className="absolute -inset-4 bg-gradient-to-r from-[#0630ba]/40 via-[#0535ed]/30 to-purple-500/30 rounded-2xl blur-2xl opacity-60 animate-pulse" />
      <div className="absolute -inset-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl" />

      <div className="relative bg-[#1e1e1e] border border-white/15 rounded-xl overflow-hidden shadow-2xl shadow-blue-500/10">
        {/* Browser Bar */}
        <div className="flex items-center gap-1.5 px-3 py-2.5 bg-[#1a1a1a] border-b border-white/10">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-sm shadow-yellow-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-3 py-1 bg-white/[0.08] rounded text-[10px] text-white/60 border border-white/10">
              trade.optigobroker.com
            </div>
          </div>
        </div>

        {/* Chart Content */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-[#0630ba] to-[#0535ed] rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-white font-semibold text-sm">EUR/USD</div>
                <div className="text-emerald-400 text-xs font-medium">+0.12%</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-white">1.0847</div>
              <div className="text-white/60 text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Live
              </div>
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
          <div className="grid grid-cols-2 gap-3">
            <button className="group flex items-center justify-center gap-1.5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/50">
              <TrendingUp className="w-4 h-4 group-hover:rotate-12 transition-transform" /> UP <span className="text-emerald-100 text-xs">+98%</span>
            </button>
            <button className="group flex items-center justify-center gap-1.5 py-3 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/50">
              <TrendingDown className="w-4 h-4 group-hover:-rotate-12 transition-transform" /> DOWN <span className="text-red-100 text-xs">+98%</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Cards */}
      <div className="absolute -top-3 -right-3 bg-[#1e1e1e] border border-white/15 rounded-lg px-3 py-2 shadow-xl shadow-emerald-500/20 animate-float backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
          </div>
          <span className="text-emerald-400 text-xs font-bold">+$847</span>
        </div>
      </div>
      <div className="absolute -bottom-2 -left-2 bg-[#1e1e1e] border border-white/15 rounded-lg px-3 py-2 shadow-xl shadow-blue-500/20 animate-float-delayed backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-5 h-5 rounded-full bg-gradient-to-br from-[#0630ba] to-[#0535ed] border-2 border-[#1e1e1e] shadow-md" />
            ))}
          </div>
          <span className="text-white/70 text-[10px] font-medium">2.4k online</span>
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

const testimonials = [
  { initials: 'JD', name: 'John D.', country: 'USA', quote: 'Made $2,450 in my first month', stats: '142% ROI', time: '3 months', rating: 5 },
  { initials: 'MK', name: 'Maria K.', country: 'Germany', quote: 'Best trading platform I\'ve used', stats: '87% Win Rate', time: '8 months', rating: 5 },
  { initials: 'ST', name: 'Sarah T.', country: 'UK', quote: 'Copy trading changed everything for me', stats: '98% Payout', time: '5 months', rating: 5 },
  { initials: 'RJ', name: 'Robert J.', country: 'Canada', quote: 'Lightning-fast execution, zero issues', stats: '156% ROI', time: '6 months', rating: 5 },
];

const topTraders = [
  { initials: 'DM', name: 'David M.', winRate: '94%', followers: '2.4k', roi: '+245%', gradient: 'from-blue-500 to-cyan-500' },
  { initials: 'LW', name: 'Lisa W.', winRate: '91%', followers: '3.1k', roi: '+198%', gradient: 'from-purple-500 to-pink-500' },
  { initials: 'JC', name: 'James C.', winRate: '89%', followers: '1.8k', roi: '+176%', gradient: 'from-orange-500 to-red-500' },
  { initials: 'AK', name: 'Anna K.', winRate: '87%', followers: '2.2k', roi: '+165%', gradient: 'from-emerald-500 to-teal-500' },
];

// Dynamic data generators
const firstNames = ['Alex', 'Sarah', 'Mike', 'Emma', 'John', 'Lisa', 'David', 'Anna', 'Chris', 'Maria', 'James', 'Sophie', 'Robert', 'Julia', 'Tom', 'Nina', 'Mark', 'Elena', 'Paul', 'Kate'];
const lastInitials = ['K', 'M', 'R', 'T', 'S', 'W', 'L', 'D', 'C', 'J', 'B', 'H', 'P', 'G', 'F', 'N', 'A', 'V', 'Z', 'Y'];
const countries = ['USA', 'UK', 'Germany', 'France', 'Spain', 'Italy', 'Canada', 'Australia', 'Japan', 'Brazil', 'India', 'Mexico', 'Netherlands', 'Sweden', 'Norway', 'Switzerland', 'Austria', 'Belgium', 'Poland', 'Portugal'];
const tradingPairs = ['EUR/USD', 'GBP/USD', 'BTC/USD', 'ETH/USD', 'USD/JPY', 'XAU/USD', 'AUD/USD', 'USD/CHF', 'NZD/USD', 'EUR/GBP'];
const actionTypes = ['earned', 'deposited', 'withdrew', 'started following'];

function generateRandomActivity() {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastInitial = lastInitials[Math.floor(Math.random() * lastInitials.length)];
  const country = countries[Math.floor(Math.random() * countries.length)];
  const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)];

  let action = '';
  if (actionType === 'earned') {
    const amount = Math.floor(Math.random() * 1500) + 100;
    const pair = tradingPairs[Math.floor(Math.random() * tradingPairs.length)];
    action = `earned $${amount} on ${pair}`;
  } else if (actionType === 'deposited') {
    const amount = Math.floor(Math.random() * 5000) + 100;
    action = `deposited $${amount.toLocaleString()}`;
  } else if (actionType === 'withdrew') {
    const amount = Math.floor(Math.random() * 10000) + 500;
    action = `withdrew $${amount.toLocaleString()}`;
  } else {
    const traderNum = Math.floor(Math.random() * 99) + 1;
    action = `started following TopTrader_${traderNum}`;
  }

  return {
    initials: `${firstName.charAt(0)}${lastInitial}`,
    name: `${firstName} ${lastInitial}.`,
    country,
    action,
    time: 'just now',
    id: Date.now() + Math.random()
  };
}

function generateRandomTrader() {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastInitial = lastInitials[Math.floor(Math.random() * lastInitials.length)];
  const winRate = Math.floor(Math.random() * 15) + 80; // 80-95%
  const followers = (Math.floor(Math.random() * 40) + 10) * 100; // 1k-5k
  const roi = Math.floor(Math.random() * 200) + 100; // 100-300%
  const gradients = [
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-orange-500 to-red-500',
    'from-emerald-500 to-teal-500',
    'from-indigo-500 to-purple-500',
    'from-rose-500 to-pink-500',
    'from-amber-500 to-orange-500',
    'from-teal-500 to-cyan-500',
  ];

  return {
    initials: `${firstName.charAt(0)}${lastInitial}`,
    name: `${firstName} ${lastInitial}.`,
    winRate: `${winRate}%`,
    followers: `${(followers / 1000).toFixed(1)}k`,
    roi: `+${roi}%`,
    gradient: gradients[Math.floor(Math.random() * gradients.length)],
    id: Date.now() + Math.random()
  };
}

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Dynamic live activities
  const [liveActivities, setLiveActivities] = useState<any[]>([]);

  // Dynamic top traders
  const [dynamicTopTraders, setDynamicTopTraders] = useState<any[]>([]);

  // Dynamic online counter
  const [onlineCount, setOnlineCount] = useState(2487);

  useEffect(() => {
    setIsMounted(true);
    setLiveActivities(Array.from({ length: 5 }, () => generateRandomActivity()));
    setDynamicTopTraders(Array.from({ length: 4 }, () => generateRandomTrader()));
  }, []);

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

  // Combined interval for all dynamic updates (optimized for performance)
  useEffect(() => {
    // Only run intervals if user is not authenticated and component is mounted
    if (!isMounted || (isHydrated && isAuthenticated)) {
      return;
    }

    let activityCounter = 0;
    let traderCounter = 0;
    let onlineCounter = 0;
    let timestampCounter = 0;

    // Main interval runs every second for precise timing
    const mainInterval = setInterval(() => {
      activityCounter++;
      traderCounter++;
      onlineCounter++;
      timestampCounter++;

      // Update live activities every 5-8 seconds (randomized)
      const activityDelay = 5 + Math.floor(Math.random() * 4); // 5-8 seconds
      if (activityCounter >= activityDelay) {
        activityCounter = 0;
        const newActivity = generateRandomActivity();
        setLiveActivities((prev) => [newActivity, ...prev.slice(0, 4)]);
      }

      // Update one trader every 12-18 seconds (randomized)
      const traderDelay = 12 + Math.floor(Math.random() * 7); // 12-18 seconds
      if (traderCounter >= traderDelay) {
        traderCounter = 0;
        setDynamicTopTraders((prev) => {
          const newTraders = [...prev];
          const randomIndex = Math.floor(Math.random() * newTraders.length);
          newTraders[randomIndex] = generateRandomTrader();
          return newTraders;
        });
      }

      // Update online count every 8 seconds
      if (onlineCounter >= 8) {
        onlineCounter = 0;
        setOnlineCount((prev) => {
          const change = Math.floor(Math.random() * 20) - 10; // -10 to +10
          const newCount = prev + change;
          return Math.max(2000, Math.min(3000, newCount)); // Keep between 2000-3000
        });
      }

      // Update timestamps every 60 seconds
      if (timestampCounter >= 60) {
        timestampCounter = 0;
        setLiveActivities((prev) =>
          prev.map((activity, index) => {
            if (index === 0) return activity; // Keep "just now" for newest
            const minutesAgo = (index + 1) * 2;
            return {
              ...activity,
              time: minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.floor(minutesAgo / 60)}h ago`,
            };
          })
        );
      }
    }, 1000); // Run every second

    return () => {
      clearInterval(mainInterval);
    };
  }, [isMounted, isHydrated, isAuthenticated]);

  if (isHydrated && isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#111111]">
      <LiveTicker />

      {/* Navigation */}
      <nav className={cn(
        'fixed top-[28px] left-0 right-0 z-50 transition-all duration-300',
        scrolled ? 'bg-[#111111]/95 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/20' : ''
      )}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 group">
              <Image src="/logo.png" alt="OptigoBroker" width={32} height={32} className="h-8 w-8 group-hover:scale-110 transition-transform" />
              <span className="text-lg font-bold text-white">OptigoBroker</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-white/60 hover:text-white text-sm transition-colors">Features</a>
              <a href="#markets" className="text-white/60 hover:text-white text-sm transition-colors">Markets</a>
              <Link href="/about" className="text-white/60 hover:text-white text-sm transition-colors">About</Link>
              <Link href="/contact" className="text-white/60 hover:text-white text-sm transition-colors">Contact</Link>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Link href="/login" className="px-4 py-2 text-white/70 hover:text-white text-sm font-medium transition-colors">
                Log In
              </Link>
              <Link href="/register" className="px-5 py-2.5 bg-gradient-to-r from-[#0630ba] to-[#0535ed] hover:from-[#0535ed] hover:to-[#0630ba] text-white text-sm font-semibold rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50">
                Get Started
              </Link>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-1.5 text-white/60">
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-[#111111]/95 backdrop-blur-xl border-t border-white/10 px-4 py-4 space-y-3 shadow-lg">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-white/60 hover:text-white py-2 text-sm transition-colors">Features</a>
            <a href="#markets" onClick={() => setMobileMenuOpen(false)} className="block text-white/60 hover:text-white py-2 text-sm transition-colors">Markets</a>
            <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="block text-white/60 hover:text-white py-2 text-sm transition-colors">About</Link>
            <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="block text-white/60 hover:text-white py-2 text-sm transition-colors">Contact</Link>
            <div className="pt-2 flex gap-3">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center py-2.5 text-white border border-white/15 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors">Log In</Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center py-2.5 bg-gradient-to-r from-[#0630ba] to-[#0535ed] text-white rounded-lg text-sm font-semibold shadow-lg shadow-blue-500/30">Get Started</Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative pt-28 md:pt-32 pb-16 md:pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-[#0630ba]/20 via-[#0535ed]/10 to-transparent blur-3xl" />
          <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-gradient-to-l from-purple-500/10 to-transparent blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/[0.08] border border-white/15 rounded-full text-xs mb-6 backdrop-blur-sm shadow-lg shadow-blue-500/10">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-white/70 font-medium">Trusted by 50,000+ traders</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                Trade Smarter.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0535ed] via-[#0630ba] to-purple-400">
                  Profit Faster.
                </span>
              </h1>

              <p className="text-base text-white/60 max-w-md mb-8 mx-auto lg:mx-0 leading-relaxed">
                Access global markets with up to 98% returns. Advanced tools, instant execution, bank-grade security.
              </p>

              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 mb-8">
                <Link href="/register" className="group w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-r from-[#0630ba] to-[#0535ed] hover:from-[#0535ed] hover:to-[#0630ba] text-white font-semibold rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/50">
                  Start Trading <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="#how-it-works" className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 bg-white/[0.08] hover:bg-white/[0.12] text-white font-medium rounded-lg border border-white/15 backdrop-blur-sm transition-all duration-300 hover:scale-105">
                  <Play className="h-4 w-4" /> How It Works
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-5 text-white/60 text-xs">
                <div className="flex items-center gap-2 bg-white/[0.05] px-3 py-1.5 rounded-full border border-white/10">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  <span className="font-medium">SSL Secured</span>
                </div>
                <div className="flex items-center gap-2 bg-white/[0.05] px-3 py-1.5 rounded-full border border-white/10">
                  <Lock className="h-4 w-4 text-emerald-400" />
                  <span className="font-medium">2FA Protected</span>
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
      <section className="py-12 px-4 border-y border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center group hover:scale-105 transition-transform duration-300">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#0630ba]/20 to-[#0535ed]/10 mb-3 group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-all">
                  <stat.icon className="w-5 h-5 text-[#0535ed]" />
                </div>
                <AnimatedCounter end={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                <div className="text-white/60 text-xs mt-2 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 md:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Why Choose Us</h2>
            <p className="text-white/60 text-sm">Professional tools for serious traders</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {features.map((f, i) => (
              <div key={i} className="group relative p-5 bg-white/[0.04] border border-white/10 rounded-xl hover:border-white/20 hover:bg-white/[0.06] transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/10">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className={cn('w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-lg transition-transform group-hover:scale-110', f.gradient)}>
                    <f.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-1">{f.title}</h3>
                  <p className="text-white/60 text-xs">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-20 px-4 bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Trusted by Traders Worldwide</h2>
            <p className="text-white/60 text-sm">Real results from real traders</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="group relative p-6 bg-white/[0.04] border border-white/10 rounded-xl hover:border-white/20 hover:bg-white/[0.06] transition-all duration-300 hover:scale-105">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  {/* Avatar */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0630ba] to-[#0535ed] flex items-center justify-center font-bold text-white shadow-lg">
                      {testimonial.initials}
                    </div>
                    <div>
                      <div className="text-white font-semibold text-sm">{testimonial.name}</div>
                      <div className="text-white/50 text-xs">{testimonial.country}</div>
                    </div>
                  </div>

                  {/* Stars */}
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="text-white/70 text-sm mb-4 leading-relaxed">"{testimonial.quote}"</p>

                  {/* Stats */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <div className="text-emerald-400 font-bold text-xs">{testimonial.stats}</div>
                    <div className="text-white/50 text-xs">{testimonial.time}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Markets */}
      <section id="markets" className="py-16 md:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Trade Global Markets</h2>
            <p className="text-white/60 text-sm">One account, all markets</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {markets.map((m, i) => (
              <div key={i} className="group relative p-6 bg-white/[0.04] border border-white/10 rounded-xl hover:border-white/20 hover:bg-white/[0.06] transition-all duration-300 hover:scale-105 hover:shadow-xl text-center">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{m.icon}</div>
                  <h3 className="text-white font-semibold text-sm mb-3">{m.name}</h3>
                  <div className={cn('inline-block px-3 py-1 rounded-full text-[10px] font-semibold bg-gradient-to-r text-white shadow-lg', m.color)}>
                    {m.pairs} pairs
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Traders */}
      <section className="py-16 md:py-20 px-4 bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Top Performing Traders</h2>
            <p className="text-white/60 text-sm">Copy their strategies and start earning</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {isMounted && dynamicTopTraders.map((trader, i) => (
              <div key={trader.id} className="group relative p-6 bg-white/[0.04] border border-white/10 rounded-xl hover:border-white/20 hover:bg-white/[0.06] transition-all duration-300 hover:scale-105 text-center animate-fade-in">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  {/* Avatar */}
                  <div className={cn('w-16 h-16 mx-auto rounded-full bg-gradient-to-br flex items-center justify-center font-bold text-white text-xl shadow-xl mb-4 group-hover:scale-110 transition-transform', trader.gradient)}>
                    {trader.initials}
                  </div>

                  {/* Name */}
                  <div className="text-white font-semibold text-sm mb-4">{trader.name}</div>

                  {/* Stats Grid */}
                  <div className="space-y-3 mb-5">
                    <div className="flex items-center justify-between px-3 py-2 bg-white/[0.05] rounded-lg">
                      <span className="text-white/60 text-xs">Win Rate</span>
                      <span className="text-emerald-400 font-bold text-sm">{trader.winRate}</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 bg-white/[0.05] rounded-lg">
                      <span className="text-white/60 text-xs">Followers</span>
                      <span className="text-white font-bold text-sm">{trader.followers}</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 bg-white/[0.05] rounded-lg">
                      <span className="text-white/60 text-xs">ROI</span>
                      <span className="text-[#0535ed] font-bold text-sm">{trader.roi}</span>
                    </div>
                  </div>

                  {/* Follow Button */}
                  <Link href="/login" className="w-full py-2.5 bg-gradient-to-r from-[#0630ba] to-[#0535ed] hover:from-[#0535ed] hover:to-[#0630ba] text-white text-xs font-semibold rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/50 flex items-center justify-center gap-2">
                    <UserPlus className="w-3.5 h-3.5" />
                    Follow Trader
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 md:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Start in 3 Steps</h2>
            <p className="text-white/60 text-sm">Begin trading in minutes</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { num: '01', title: 'Create Account', desc: 'Sign up in 30 seconds with email' },
              { num: '02', title: 'Fund Account', desc: 'Deposit via crypto or card from $10' },
              { num: '03', title: 'Start Trading', desc: 'Access all markets and earn' },
            ].map((step, i) => (
              <div key={i} className="group relative text-center p-6 bg-white/[0.04] border border-white/10 rounded-xl hover:border-white/20 hover:bg-white/[0.06] transition-all duration-300 hover:scale-105">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-[#0630ba] to-[#0535ed] rounded-xl mb-4 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                    <span className="text-base font-bold text-white">{step.num}</span>
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-2">{step.title}</h3>
                  <p className="text-white/60 text-xs leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/register" className="group inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-[#0630ba] to-[#0535ed] hover:from-[#0535ed] hover:to-[#0630ba] text-white font-semibold rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/50">
              Create Free Account <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-20 px-4 bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Everything You Need</h2>
              <div className="space-y-3.5">
                {[
                  'Up to 98% payout on trades',
                  'Advanced TradingView charts',
                  'Copy trading from experts',
                  'Instant withdrawals',
                  '24/7 customer support',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    </div>
                    <span className="text-white/70 text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
              <Link href="/register" className="group inline-flex items-center gap-2 mt-8 px-7 py-3.5 bg-gradient-to-r from-[#0630ba] to-[#0535ed] hover:from-[#0535ed] hover:to-[#0630ba] text-white text-sm font-semibold rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/50">
                Get Started <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Zap, title: 'Fast', desc: '<10ms', gradient: 'from-yellow-500 to-orange-500' },
                { icon: Shield, title: 'Secure', desc: 'Cold storage', gradient: 'from-[#0630ba] to-[#0535ed]' },
                { icon: Wallet, title: 'Easy', desc: 'Crypto & Card', gradient: 'from-[#0535ed] to-indigo-500' },
                { icon: Users, title: 'Copy', desc: 'Top traders', gradient: 'from-purple-500 to-pink-500' },
              ].map((item, i) => (
                <div key={i} className="group p-5 bg-white/[0.04] border border-white/10 rounded-xl hover:border-white/20 hover:bg-white/[0.06] transition-all duration-300 hover:scale-105">
                  <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform', item.gradient)}>
                    <item.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-1">{item.title}</h3>
                  <p className="text-white/60 text-xs">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Live Activity Feed */}
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-emerald-400 text-xs font-semibold">LIVE ACTIVITY</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Trading Happening Now</h2>
            <p className="text-white/60 text-sm">
              Join <span className="text-emerald-400 font-bold transition-all duration-500">{onlineCount.toLocaleString()}</span> active traders online
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="bg-white/[0.04] border border-white/10 rounded-xl p-6 backdrop-blur-sm">
              <div className="space-y-3">
                {isMounted && liveActivities.map((activity, index) => (
                  <div key={activity.id} className="flex items-center gap-4 p-4 bg-white/[0.04] border border-white/5 rounded-lg hover:bg-white/[0.06] hover:border-white/10 transition-all group animate-slide-up-fade">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-white text-sm shadow-lg group-hover:scale-110 transition-transform">
                      {activity.initials}
                    </div>

                    {/* Activity */}
                    <div className="flex-1">
                      <div className="text-white/70 text-sm flex items-center gap-2">
                        <span>
                          <span className="text-white font-semibold">{activity.name}</span> from{' '}
                          <span className="text-white/60">{activity.country}</span>
                          <span className="text-white/90 ml-1">{activity.action}</span>
                        </span>
                        {index === 0 && activity.time === 'just now' && (
                          <span className="inline-flex px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-[9px] font-bold uppercase">
                            New
                          </span>
                        )}
                      </div>
                      <div className="text-white/40 text-xs mt-0.5">{activity.time}</div>
                    </div>

                    {/* Indicator */}
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                ))}
              </div>

              {/* View More */}
              <div className="text-center mt-6 pt-6 border-t border-white/10">
                <Link href="/register" className="inline-flex items-center gap-2 text-[#0535ed] hover:text-white text-sm font-semibold transition-colors">
                  Join the action
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <Image src="/logo.png" alt="OptigoBroker" width={32} height={32} className="group-hover:scale-110 transition-transform" />
              <span className="text-white font-bold text-lg">OptigoBroker</span>
            </Link>

            <div className="flex items-center gap-6 text-xs text-white/60">
              <a href="#features" className="hover:text-white transition-colors font-medium">Features</a>
              <a href="#markets" className="hover:text-white transition-colors font-medium">Markets</a>
              <Link href="/about" className="hover:text-white transition-colors font-medium">About</Link>
              <Link href="/contact" className="hover:text-white transition-colors font-medium">Contact</Link>
              <Link href="/login" className="hover:text-white transition-colors font-medium">Login</Link>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] rounded-lg text-[10px] text-white/60 border border-white/10 font-medium">
                <Shield className="h-3.5 w-3.5 text-emerald-400" /> SSL
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] rounded-lg text-[10px] text-white/60 border border-white/10 font-medium">
                <Lock className="h-3.5 w-3.5 text-emerald-400" /> 2FA
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-white/50">
            <span className="font-medium">&copy; 2025 OptigoBroker. All rights reserved.</span>
            <span className="font-medium">Trade responsibly. Your capital is at risk.</span>
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
