'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  Shield,
  Zap,
  Users,
  BarChart3,
  Globe,
  Clock,
  CheckCircle,
  ArrowRight,
  ChevronRight,
  Menu,
  X,
  Wallet,
  Award,
  HeadphonesIcon,
  Play,
  Star,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

// Trading Chart SVG Component
function TradingChartIllustration() {
  return (
    <div className="relative w-full max-w-lg mx-auto">
      <div className="relative bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-4 shadow-2xl">
        {/* Chart Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">EUR/USD</div>
              <div className="text-emerald-500 text-xs">+2.34%</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-white font-bold">1.0847</div>
            <div className="text-slate-400 text-xs">Live Price</div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="relative h-40 mb-4">
          <svg viewBox="0 0 400 160" className="w-full h-full">
            {/* Grid Lines */}
            <defs>
              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Horizontal grid lines */}
            {[0, 40, 80, 120, 160].map((y) => (
              <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#334155" strokeWidth="1" />
            ))}

            {/* Chart Area Fill */}
            <path
              d="M0,120 Q50,100 100,90 T200,70 T300,50 T400,30 L400,160 L0,160 Z"
              fill="url(#chartGradient)"
            />

            {/* Chart Line */}
            <path
              d="M0,120 Q50,100 100,90 T200,70 T300,50 T400,30"
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Candlesticks */}
            {[
              { x: 40, high: 85, low: 110, open: 95, close: 88, up: true },
              { x: 80, high: 80, low: 100, open: 85, close: 95, up: false },
              { x: 120, high: 70, low: 95, open: 90, close: 75, up: true },
              { x: 160, high: 65, low: 85, open: 75, close: 68, up: true },
              { x: 200, high: 60, low: 80, open: 70, close: 78, up: false },
              { x: 240, high: 50, low: 75, open: 72, close: 55, up: true },
              { x: 280, high: 45, low: 65, open: 55, close: 48, up: true },
              { x: 320, high: 35, low: 55, open: 50, close: 40, up: true },
              { x: 360, high: 25, low: 50, open: 45, close: 30, up: true },
            ].map((candle, i) => (
              <g key={i}>
                <line
                  x1={candle.x}
                  y1={candle.high}
                  x2={candle.x}
                  y2={candle.low}
                  stroke={candle.up ? '#10b981' : '#ef4444'}
                  strokeWidth="1"
                />
                <rect
                  x={candle.x - 6}
                  y={Math.min(candle.open, candle.close)}
                  width="12"
                  height={Math.abs(candle.close - candle.open)}
                  fill={candle.up ? '#10b981' : '#ef4444'}
                  rx="1"
                />
              </g>
            ))}

            {/* Current Price Line */}
            <line x1="0" y1="30" x2="400" y2="30" stroke="#10b981" strokeWidth="1" strokeDasharray="5,5" />
            <rect x="350" y="20" width="50" height="20" fill="#10b981" rx="4" />
            <text x="375" y="34" fill="white" fontSize="10" textAnchor="middle" fontWeight="bold">1.0847</text>
          </svg>
        </div>

        {/* Trade Buttons */}
        <div className="flex gap-3">
          <button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
            <TrendingUp className="w-4 h-4" />
            UP
          </button>
          <button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
            <TrendingUp className="w-4 h-4 rotate-180" />
            DOWN
          </button>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute -top-4 -right-4 bg-emerald-500 text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg animate-pulse">
        +$127.50
      </div>
      <div className="absolute -bottom-3 -left-3 bg-slate-700 border border-slate-600 px-3 py-1.5 rounded-full text-xs text-slate-300 shadow-lg">
        Live Trading
      </div>
    </div>
  );
}

// Floating Stats Card Component
function FloatingStatsCard({ className, icon: Icon, label, value, color }: {
  className?: string;
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className={cn(
      "absolute bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-xl p-3 shadow-xl",
      className
    )}>
      <div className="flex items-center gap-2">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color)}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-slate-400 text-xs">{label}</div>
          <div className="text-white font-bold text-sm">{value}</div>
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast Execution',
    description: 'Execute trades in milliseconds with our advanced trading engine.',
    bgColor: 'bg-yellow-500/10',
    iconColor: 'text-yellow-500',
  },
  {
    icon: Shield,
    title: 'Secure & Reliable',
    description: 'Your funds and data are protected with enterprise-grade security.',
    bgColor: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Track your performance with detailed statistics and insights.',
    bgColor: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
  },
  {
    icon: Users,
    title: 'Copy Trading',
    description: 'Follow successful traders and automatically copy their strategies.',
    bgColor: 'bg-purple-500/10',
    iconColor: 'text-purple-500',
  },
  {
    icon: Globe,
    title: 'Multiple Markets',
    description: 'Trade Forex, Crypto, and OTC markets all in one platform.',
    bgColor: 'bg-cyan-500/10',
    iconColor: 'text-cyan-500',
  },
  {
    icon: Clock,
    title: '24/7 Trading',
    description: 'Markets never sleep. Trade anytime, anywhere in the world.',
    bgColor: 'bg-orange-500/10',
    iconColor: 'text-orange-500',
  },
];

const steps = [
  {
    step: '01',
    title: 'Create Account',
    description: 'Sign up in minutes with just your email. No complicated verification needed to start.',
    icon: Users,
    color: 'bg-blue-500',
  },
  {
    step: '02',
    title: 'Make a Deposit',
    description: 'Fund your account using crypto or mobile money. Multiple payment options available.',
    icon: Wallet,
    color: 'bg-purple-500',
  },
  {
    step: '03',
    title: 'Start Trading',
    description: 'Choose your market, analyze the charts, and place your trades with confidence.',
    icon: TrendingUp,
    color: 'bg-emerald-500',
  },
];

const stats = [
  { value: '50K+', label: 'Active Traders' },
  { value: '$10M+', label: 'Trading Volume' },
  { value: '99.9%', label: 'Uptime' },
  { value: '24/7', label: 'Support' },
];

const markets = [
  { name: 'Forex', pairs: 'EUR/USD, GBP/USD, USD/JPY', color: 'bg-blue-500' },
  { name: 'Crypto', pairs: 'BTC/USD, ETH/USD, SOL/USD', color: 'bg-orange-500' },
  { name: 'OTC', pairs: 'Volatility Index, Crash/Boom', color: 'bg-purple-500' },
];

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isHydrated, router]);

  // If authenticated, show nothing while redirecting
  if (isHydrated && isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 md:h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="OptigoBroker" width={32} height={32} className="h-6 w-6 md:h-8 md:w-8" />
          <span className="text-lg md:text-xl font-bold text-white">OptigoBroker</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-slate-300 hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="text-slate-300 hover:text-white transition-colors">How it Works</a>
          <a href="#markets" className="text-slate-300 hover:text-white transition-colors">Markets</a>
        </div>

        {/* Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-slate-400 hover:text-white"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-14 left-0 right-0 z-50 md:hidden bg-slate-800 border-b border-slate-700 shadow-xl">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-slate-300 hover:text-white py-2">Features</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block text-slate-300 hover:text-white py-2">How it Works</a>
              <a href="#markets" onClick={() => setMobileMenuOpen(false)} className="block text-slate-300 hover:text-white py-2">Markets</a>
              <div className="pt-4 space-y-3 border-t border-slate-700">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block w-full text-center px-4 py-2.5 text-slate-300 hover:text-white border border-slate-600 rounded-lg">
                  Sign In
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="block w-full text-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg">
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Hero Section */}
      <section className="relative pt-20 md:pt-24 lg:pt-28 pb-16 md:pb-20 px-4 md:px-6 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-sm mb-6">
                <Zap className="h-4 w-4" />
                <span>Trade smarter, not harder</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Trade the World&apos;s Markets
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">
                  {' '}With Confidence
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-400 max-w-xl mb-8">
                Join thousands of traders on OptigoBroker. Access Forex, Crypto, and OTC markets
                with lightning-fast execution and powerful tools.
              </p>

              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 mb-8">
                <Link
                  href="/register"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all hover:scale-105"
                >
                  Start Trading Now
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-700 transition-colors"
                >
                  Sign In to Account
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-slate-500 text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-500" />
                  <span>Secure Platform</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-emerald-500" />
                  <span>24/7 Trading</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-emerald-500" />
                  <span>Fast Withdrawals</span>
                </div>
              </div>

              {/* User Avatars */}
              <div className="flex items-center justify-center lg:justify-start gap-3 mt-8">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full border-2 border-slate-900 bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold"
                    >
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
                  <p className="text-slate-400 text-sm">
                    <span className="text-white font-semibold">4.9/5</span> from 2,000+ traders
                  </p>
                </div>
              </div>
            </div>

            {/* Right Content - Trading Chart */}
            <div className="relative lg:pl-8">
              <TradingChartIllustration />

              {/* Floating Stats Cards */}
              <FloatingStatsCard
                className="hidden lg:flex -left-8 top-1/4 animate-float"
                icon={Users}
                label="Active Traders"
                value="50,000+"
                color="bg-blue-500"
              />
              <FloatingStatsCard
                className="hidden lg:flex -right-4 bottom-1/4 animate-float-delayed"
                icon={TrendingUp}
                label="Win Rate"
                value="78.5%"
                color="bg-emerald-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 border-y border-slate-800 bg-slate-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Why Choose OptigoBroker?
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              We provide everything you need to trade successfully in today&apos;s fast-moving markets.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group p-6 bg-slate-800/50 border border-slate-700 rounded-2xl hover:border-slate-600 transition-all hover:-translate-y-1"
                >
                  <div className={cn(
                    'w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110',
                    feature.bgColor
                  )}>
                    <Icon className={cn('h-7 w-7', feature.iconColor)} />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-400">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 bg-slate-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Get Started in 3 Easy Steps
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Start trading in minutes. No complicated processes, just simple steps to success.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative group">
                  {/* Connection Line */}
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-12 left-[calc(50%+60px)] w-[calc(100%-60px)] h-0.5 bg-gradient-to-r from-slate-700 to-slate-700/0" />
                  )}

                  <div className="relative bg-slate-800/50 border border-slate-700 rounded-2xl p-6 hover:border-slate-600 transition-all hover:-translate-y-1">
                    {/* Step Number Badge */}
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center">
                      <span className="text-emerald-500 font-bold text-sm">{step.step}</span>
                    </div>

                    {/* Icon */}
                    <div className={cn(
                      'w-16 h-16 rounded-2xl flex items-center justify-center mb-4',
                      step.color
                    )}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>

                    <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-slate-400">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Markets Section */}
      <section id="markets" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Trade Multiple Markets
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Access a wide range of markets from a single platform. Diversify your trading portfolio.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {markets.map((market, index) => (
              <div
                key={index}
                className="group relative p-6 bg-slate-800/50 border border-slate-700 rounded-2xl hover:border-slate-600 transition-all hover:-translate-y-1 overflow-hidden"
              >
                {/* Background gradient on hover */}
                <div className={cn(
                  'absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity',
                  market.color
                )} />

                <div className="relative">
                  <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center mb-4', market.color)}>
                    <TrendingUp className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{market.name}</h3>
                  <p className="text-slate-400 text-sm mb-4">{market.pairs}</p>

                  {/* Mini chart visualization */}
                  <div className="h-16 flex items-end gap-1">
                    {[40, 65, 45, 80, 55, 70, 60, 85, 75, 90].map((height, i) => (
                      <div
                        key={i}
                        className={cn(
                          'flex-1 rounded-t transition-all',
                          market.color,
                          'opacity-60 group-hover:opacity-100'
                        )}
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-slate-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Everything You Need to Succeed
              </h2>
              <div className="space-y-4">
                {[
                  'Real-time market data and charts',
                  'Multiple deposit and withdrawal options',
                  'Copy trading from successful traders',
                  'Detailed analytics and performance tracking',
                  'KYC verification for secure trading',
                  '24/7 customer support',
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
              >
                Create Free Account
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-slate-800 border border-slate-700 rounded-2xl">
                <Wallet className="h-8 w-8 text-emerald-500 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-1">Easy Deposits</h3>
                <p className="text-slate-400 text-sm">Fund with crypto or mobile money</p>
              </div>
              <div className="p-6 bg-slate-800 border border-slate-700 rounded-2xl">
                <Zap className="h-8 w-8 text-yellow-500 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-1">Fast Execution</h3>
                <p className="text-slate-400 text-sm">Trades execute in milliseconds</p>
              </div>
              <div className="p-6 bg-slate-800 border border-slate-700 rounded-2xl">
                <Award className="h-8 w-8 text-blue-500 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-1">Referral Program</h3>
                <p className="text-slate-400 text-sm">Earn by inviting friends</p>
              </div>
              <div className="p-6 bg-slate-800 border border-slate-700 rounded-2xl">
                <HeadphonesIcon className="h-8 w-8 text-purple-500 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-1">24/7 Support</h3>
                <p className="text-slate-400 text-sm">We&apos;re here to help anytime</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-8 sm:p-12 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-3xl relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
            </div>

            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to Start Trading?
              </h2>
              <p className="text-emerald-100 max-w-xl mx-auto mb-8">
                Join thousands of traders who are already making money on OptigoBroker.
                Sign up today and start your trading journey.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-100 text-emerald-700 font-semibold rounded-xl transition-colors"
                >
                  Create Free Account
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-8 py-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl border border-emerald-500 transition-colors"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <Image src="/logo.png" alt="OptigoBroker" width={32} height={32} />
                <span className="text-xl font-bold text-white">OptigoBroker</span>
              </Link>
              <p className="text-slate-400 max-w-md">
                Your trusted partner for online trading. Trade Forex, Crypto, and OTC markets
                with confidence on our secure platform.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <div className="space-y-2">
                <a href="#features" className="block text-slate-400 hover:text-white transition-colors">Features</a>
                <a href="#how-it-works" className="block text-slate-400 hover:text-white transition-colors">How it Works</a>
                <a href="#markets" className="block text-slate-400 hover:text-white transition-colors">Markets</a>
              </div>
            </div>

            {/* Get Started */}
            <div>
              <h4 className="text-white font-semibold mb-4">Get Started</h4>
              <div className="space-y-2">
                <Link href="/register" className="block text-slate-400 hover:text-white transition-colors">Create Account</Link>
                <Link href="/login" className="block text-slate-400 hover:text-white transition-colors">Sign In</Link>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm">
              &copy; 2025 OptigoBroker. All rights reserved.
            </p>
            <p className="text-slate-500 text-sm">
              Trade responsibly. Your capital is at risk.
            </p>
          </div>
        </div>
      </footer>

      {/* Custom Animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes float-delayed {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 3s ease-in-out infinite;
          animation-delay: 1.5s;
        }
      `}</style>
    </div>
  );
}
