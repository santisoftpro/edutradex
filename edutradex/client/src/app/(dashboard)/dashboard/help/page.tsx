'use client';

import {
  BookOpen,
  HelpCircle,
  MessageCircle,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  TrendingUp,
  Clock,
  DollarSign,
  Shield,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const faqs = [
  {
    question: 'What is OptigoBroker?',
    answer:
      'OptigoBroker is a trading practice platform designed to teach users how forex, binary options, and OTC (synthetic) markets work. You practice with real deposit amounts to simulate actual trading conditions.',
  },
  {
    question: 'How do I start trading?',
    answer:
      'After signing up, you need to make a deposit through Mobile Money or Cryptocurrency. Once your deposit is approved by an admin, the funds are added to your balance and you can start trading.',
  },
  {
    question: 'What is a binary option trade?',
    answer:
      'Binary options are simple up/down predictions. You predict whether an asset price will be higher (UP) or lower (DOWN) after a chosen duration. If correct, you win the payout percentage. If wrong, you lose your investment.',
  },
  {
    question: 'What is the difference between Forex and OTC?',
    answer:
      'Forex markets are real currency exchange markets that operate during specific hours. OTC (Over-The-Counter) or synthetic markets are simulated markets that run 24/7, useful for practice when real markets are closed.',
  },
  {
    question: 'How is the payout calculated?',
    answer:
      'The payout is a percentage of your trade amount. For example, with an 85% payout and a $10 trade, winning returns $18.50 ($10 investment + $8.50 profit). Losing means you lose the $10 investment.',
  },
  {
    question: 'Can I reset my account balance?',
    answer:
      'Yes, you can reset your balance to $0 from the Settings page. However, to continue trading, you will need to make a new deposit.',
  },
  {
    question: 'How do I read the TradingView chart?',
    answer:
      'The TradingView chart shows price movements over time. Green candles indicate price went up, red candles indicate price went down. You can add indicators, change timeframes, and use drawing tools for analysis.',
  },
  {
    question: 'What trading durations are available?',
    answer:
      'You can choose trade durations of 5 seconds, 15 seconds, 30 seconds, 1 minute, 3 minutes, or 5 minutes. Shorter durations are more volatile but offer quick results.',
  },
];

const guides = [
  {
    title: 'Getting Started',
    icon: PlayCircle,
    description: 'Learn the basics of the platform',
    steps: [
      'Sign up or log in to your account',
      'Navigate to the Trade page',
      'Select an asset from the dropdown',
      'Choose your trade amount and duration',
      'Click UP or DOWN to place your trade',
    ],
  },
  {
    title: 'Understanding Markets',
    icon: TrendingUp,
    description: 'Learn about different market types',
    steps: [
      'Forex: Real currency pairs like EUR/USD',
      'OTC: Synthetic markets running 24/7',
      'Volatility: Simulated indices for practice',
      'Each market has different characteristics',
      'Practice with all types to learn behavior',
    ],
  },
  {
    title: 'Risk Management',
    icon: Shield,
    description: 'Learn to trade responsibly',
    steps: [
      'Never risk more than you can afford to lose',
      'Start with small trade amounts',
      'Set a daily loss limit for yourself',
      'Track your win rate in Analytics',
      "Remember: this is for education, not gambling",
    ],
  },
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Help Center</h1>
        <p className="text-slate-400 mt-1">
          Learn how to use OptigoBroker and get answers to common questions
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href="/dashboard/trade"
          className="bg-gradient-to-br from-[#1079ff] to-[#092ab2] rounded-xl p-6 hover:from-[#3a93ff] hover:to-[#1079ff] transition-all"
        >
          <TrendingUp className="h-8 w-8 text-white mb-3" />
          <h3 className="text-white font-semibold">Start Trading</h3>
          <p className="text-blue-100 text-sm mt-1">Jump into the trading platform</p>
        </a>
        <a
          href="/dashboard/analytics"
          className="bg-gradient-to-br from-[#1079ff] to-[#092ab2] rounded-xl p-6 hover:from-[#3a93ff] hover:to-[#1079ff] transition-all"
        >
          <Clock className="h-8 w-8 text-white mb-3" />
          <h3 className="text-white font-semibold">View Analytics</h3>
          <p className="text-blue-100 text-sm mt-1">Track your performance</p>
        </a>
        <a
          href="/dashboard/deposits"
          className="bg-gradient-to-br from-[#1079ff] to-[#092ab2] rounded-xl p-6 hover:from-[#3a93ff] hover:to-[#1079ff] transition-all"
        >
          <DollarSign className="h-8 w-8 text-white mb-3" />
          <h3 className="text-white font-semibold">Make a Deposit</h3>
          <p className="text-blue-100 text-sm mt-1">Add funds to your account</p>
        </a>
      </div>

      {/* Getting Started Guides */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="h-5 w-5 text-[#1079ff]" />
          <h2 className="text-lg font-semibold text-white">Getting Started Guides</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {guides.map((guide, index) => (
            <div key={index} className="bg-slate-700/50 rounded-lg p-5">
              <guide.icon className="h-8 w-8 text-[#1079ff] mb-3" />
              <h3 className="text-white font-semibold">{guide.title}</h3>
              <p className="text-slate-400 text-sm mt-1 mb-4">{guide.description}</p>
              <ol className="space-y-2">
                {guide.steps.map((step, i) => (
                  <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                    <span className="text-[#1079ff] font-medium">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <HelpCircle className="h-5 w-5 text-[#1079ff]" />
          <h2 className="text-lg font-semibold text-white">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-slate-700 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-700/50 transition-colors"
              >
                <span className="text-white font-medium">{faq.question}</span>
                {openFaq === index ? (
                  <ChevronUp className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                )}
              </button>
              <div
                className={cn(
                  'overflow-hidden transition-all duration-200',
                  openFaq === index ? 'max-h-48' : 'max-h-0'
                )}
              >
                <p className="px-4 pb-4 text-slate-400">{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Section */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6 border border-slate-600">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#1079ff]/20 rounded-lg">
            <MessageCircle className="h-6 w-6 text-[#1079ff]" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">Need More Help?</h3>
            <p className="text-slate-400 mt-1">
              For technical support or questions about the platform, please refer to our
              documentation or contact our support team for assistance.
            </p>
            <div className="mt-4 flex gap-3">
              <a
                href="https://www.investopedia.com/terms/f/forex.asp"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Learn Forex
              </a>
              <a
                href="https://www.tradingview.com/chart/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                TradingView Docs
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-xl p-6">
        <h3 className="text-yellow-500 font-semibold mb-2">Risk Disclaimer</h3>
        <p className="text-yellow-200/70 text-sm">
          OptigoBroker is a trading platform. All trading activities involve substantial risk and may result
          in the loss of some or all of your capital. You are fully responsible for your trading
          decisions and any profits or losses incurred. Optigo does not guarantee profits and does not
          provide financial, investment, or trading advice. By using this platform, you acknowledge
          that you understand and accept these risks.
        </p>
      </div>
    </div>
  );
}
