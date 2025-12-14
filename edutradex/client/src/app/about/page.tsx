'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Target,
  Shield,
  Zap,
  Users,
  TrendingUp,
  Award,
  Globe,
  Heart,
  CheckCircle2,
} from 'lucide-react';

const values = [
  {
    icon: Shield,
    title: 'Security First',
    description: 'Bank-grade encryption and cold storage to protect your assets',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Sub-10ms execution speed for optimal trading performance',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: Users,
    title: 'Community Driven',
    description: 'Built by traders, for traders with real market experience',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    icon: Heart,
    title: 'Customer Success',
    description: '24/7 dedicated support to help you achieve your goals',
    gradient: 'from-emerald-500 to-teal-500',
  },
];

const stats = [
  { label: 'Active Traders', value: '50,000+' },
  { label: 'Trading Volume', value: '$10M+' },
  { label: 'Countries Served', value: '150+' },
  { label: 'Avg Payout Rate', value: '98%' },
];


const milestones = [
  { year: '1', event: 'OptigoBroker founded' },
  { year: '2', event: 'Reached 10,000 traders' },
  { year: '3', event: 'Launched copy trading' },
  { year: '4', event: '$10M+ trading volume' },
  { year: '5', event: 'Expanded to 150+ countries' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#111111]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#111111]/95 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 group">
              <Image src="/logo.png" alt="OptigoBroker" width={32} height={32} className="h-8 w-8 group-hover:scale-110 transition-transform" />
              <span className="text-lg font-bold text-white">OptigoBroker</span>
            </Link>

            <div className="flex items-center gap-6">
              <Link href="/" className="text-white/60 hover:text-white text-sm transition-colors">Home</Link>
              <Link href="/contact" className="text-white/60 hover:text-white text-sm transition-colors">Contact</Link>
              <Link href="/login" className="px-5 py-2.5 bg-gradient-to-r from-[#0630ba] to-[#0535ed] hover:from-[#0535ed] hover:to-[#0630ba] text-white text-sm font-semibold rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-[#0630ba]/20 via-[#0535ed]/10 to-transparent blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            About{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0535ed] via-[#0630ba] to-purple-400">
              OptigoBroker
            </span>
          </h1>

          <p className="text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
            We're on a mission to democratize trading by providing professional-grade tools,
            transparent pricing, and world-class support to traders worldwide.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div key={i} className="text-center p-6 bg-white/[0.04] border border-white/10 rounded-xl hover:bg-white/[0.06] transition-all">
                <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-white/60 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-6">
                <Target className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400 text-xs font-semibold">OUR MISSION</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Making Trading Accessible to Everyone
              </h2>
              <p className="text-white/70 leading-relaxed mb-6">
                Founded in 2020, OptigoBroker was built by experienced traders who saw the need for a
                more transparent, user-friendly trading platform. We believe everyone deserves access to
                professional trading tools, regardless of their experience level or account size.
              </p>
              <p className="text-white/70 leading-relaxed">
                Our platform combines cutting-edge technology with intuitive design, offering features
                like copy trading, advanced charting, and instant execution - all backed by bank-grade
                security and 24/7 support.
              </p>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-[#0630ba]/30 via-[#0535ed]/20 to-purple-500/20 rounded-2xl blur-2xl opacity-60" />
              <div className="relative bg-white/[0.04] border border-white/10 rounded-2xl p-8">
                <div className="space-y-4">
                  {[
                    'Zero hidden fees or commissions',
                    'Industry-leading execution speed',
                    'Regulated and fully licensed',
                    'Advanced risk management tools',
                    'Educational resources included',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-white/70">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 md:py-20 px-4 bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Our Core Values</h2>
            <p className="text-white/60">The principles that guide everything we do</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, i) => (
              <div key={i} className="group relative p-6 bg-white/[0.04] border border-white/10 rounded-xl hover:border-white/20 hover:bg-white/[0.06] transition-all duration-300 hover:scale-105">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${value.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                    <value.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">{value.title}</h3>
                  <p className="text-white/60 text-sm">{value.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Timeline Section */}
      <section className="py-16 md:py-20 px-4 bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Our Journey</h2>
            <p className="text-white/60">Key milestones that shaped OptigoBroker</p>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[#0535ed] via-purple-500 to-transparent" />

            <div className="space-y-12">
              {milestones.map((milestone, i) => (
                <div key={i} className={`relative flex items-center gap-8 ${i % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                  {/* Content */}
                  <div className={`flex-1 ${i % 2 === 0 ? 'text-right' : 'text-left'}`}>
                    <div className="inline-block p-4 bg-white/[0.04] border border-white/10 rounded-xl hover:bg-white/[0.06] transition-all">
                      <div className="text-[#0535ed] font-bold text-sm mb-1">{milestone.year}</div>
                      <div className="text-white font-medium">{milestone.event}</div>
                    </div>
                  </div>

                  {/* Center dot */}
                  <div className="relative z-10 w-4 h-4 rounded-full bg-gradient-to-r from-[#0630ba] to-[#0535ed] shadow-lg shadow-blue-500/50" />

                  {/* Spacer */}
                  <div className="flex-1" />
                </div>
              ))}
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
              <Link href="/" className="hover:text-white transition-colors font-medium">Home</Link>
              <Link href="/about" className="hover:text-white transition-colors font-medium">About</Link>
              <Link href="/contact" className="hover:text-white transition-colors font-medium">Contact</Link>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 text-center text-[10px] text-white/50">
            <span className="font-medium">&copy; 2025 OptigoBroker. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
