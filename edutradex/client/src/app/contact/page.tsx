'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  Clock,
  Send,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

const contactMethods = [
  {
    icon: Mail,
    title: 'Email Support',
    description: 'support@optigobroker.com',
    action: 'Send Email',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: MessageSquare,
    title: 'Support Tickets',
    description: 'Track your inquiries and get help',
    action: 'Submit Ticket',
    gradient: 'from-purple-500 to-pink-500',
  },
];

const faqs = [
  {
    question: 'How long does it take to verify my account?',
    answer: 'Account verification typically takes 24-48 hours. You\'ll receive an email once your account is verified and ready to trade.',
  },
  {
    question: 'What is the minimum deposit amount?',
    answer: 'The minimum deposit is $10. We believe in making trading accessible to everyone, regardless of account size.',
  },
  {
    question: 'How fast are withdrawals processed?',
    answer: 'Most withdrawals are processed instantly. Bank transfers may take 1-3 business days depending on your bank.',
  },
  {
    question: 'Is copy trading available for all users?',
    answer: 'Yes! Copy trading is available to all verified users. You can start following top traders immediately after your account is verified.',
  },
  {
    question: 'What trading instruments are available?',
    answer: 'We offer 200+ trading instruments including Forex (50+ pairs), Cryptocurrencies (30+), Stocks (100+), and Commodities (20+).',
  },
  {
    question: 'Do you offer a demo account?',
    answer: 'Yes, we offer free demo accounts with virtual funds so you can practice trading risk-free before using real money.',
  },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setIsSubmitted(true);
    setFormData({ name: '', email: '', subject: '', message: '' });

    // Reset success message after 5 seconds
    setTimeout(() => setIsSubmitted(false), 5000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

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
              <Link href="/about" className="text-white/60 hover:text-white text-sm transition-colors">About</Link>
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
            Get in{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0535ed] via-[#0630ba] to-purple-400">
              Touch
            </span>
          </h1>

          <p className="text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
            Have questions? We're here to help. Reach out to our support team via email or submit a support ticket.
          </p>
        </div>
      </section>

      {/* Support Hours */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center sm:text-left">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-blue-400 font-semibold">Email Support</span>
            <span className="text-white/60 text-sm">Response within 24 hours • Monday - Friday</span>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            {contactMethods.map((method, i) => (
              <div key={i} className="group relative p-6 bg-white/[0.04] border border-white/10 rounded-xl hover:border-white/20 hover:bg-white/[0.06] transition-all duration-300 hover:scale-105 text-center">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className={`w-16 h-16 mx-auto rounded-xl bg-gradient-to-br ${method.gradient} flex items-center justify-center mb-4 shadow-xl group-hover:scale-110 transition-transform`}>
                    <method.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">{method.title}</h3>
                  <p className="text-white/60 text-sm mb-4">{method.description}</p>
                  <button className="text-[#0535ed] hover:text-white text-sm font-semibold transition-colors">
                    {method.action} →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Send Us a Message</h2>
              <p className="text-white/60 mb-8">Fill out the form and we'll get back to you within 24 hours.</p>

              {isSubmitted && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span className="text-emerald-400 text-sm font-medium">
                    Message sent successfully! We'll respond within 24 hours.
                  </span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-white/70 text-sm font-medium mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#0535ed] focus:bg-white/[0.08] transition-all"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-white/70 text-sm font-medium mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#0535ed] focus:bg-white/[0.08] transition-all"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-white/70 text-sm font-medium mb-2">
                    Subject
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#0535ed] focus:bg-white/[0.08] transition-all"
                  >
                    <option value="" className="bg-[#1a1a1a]">Select a subject</option>
                    <option value="account" className="bg-[#1a1a1a]">Account Issues</option>
                    <option value="trading" className="bg-[#1a1a1a]">Trading Questions</option>
                    <option value="deposit" className="bg-[#1a1a1a]">Deposits & Withdrawals</option>
                    <option value="technical" className="bg-[#1a1a1a]">Technical Support</option>
                    <option value="partnership" className="bg-[#1a1a1a]">Partnership Inquiry</option>
                    <option value="other" className="bg-[#1a1a1a]">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-white/70 text-sm font-medium mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#0535ed] focus:bg-white/[0.08] transition-all resize-none"
                    placeholder="Tell us how we can help..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-[#0630ba] to-[#0535ed] hover:from-[#0535ed] hover:to-[#0630ba] text-white font-semibold rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Contact Info */}
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Contact Information</h2>
              <p className="text-white/60 mb-8">Prefer to reach out directly? Here are our contact details.</p>

              <div className="space-y-6 mb-8">
                <div className="flex items-start gap-4 p-5 bg-white/[0.04] border border-white/10 rounded-xl">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Email</h3>
                    <p className="text-white/60 text-sm">support@optigobroker.com</p>
                    <p className="text-white/60 text-sm">partnerships@optigobroker.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-5 bg-white/[0.04] border border-white/10 rounded-xl">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Response Time</h3>
                    <p className="text-white/60 text-sm">Monday - Friday: Within 24 hours</p>
                    <p className="text-emerald-400 text-sm font-medium mt-1">Priority support for verified accounts</p>
                  </div>
                </div>
              </div>

              {/* Social proof */}
              <div className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <span className="text-white font-semibold">Dedicated Support Team</span>
                </div>
                <p className="text-white/70 text-sm leading-relaxed">
                  Our experienced support team responds to all email inquiries within 24 hours during business days.
                  For urgent matters, verified accounts receive priority support.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-20 px-4 bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-4">
              <HelpCircle className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400 text-xs font-semibold">FAQ</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Frequently Asked Questions</h2>
            <p className="text-white/60">Quick answers to common questions</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white/[0.04] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left group"
                >
                  <span className="text-white font-semibold pr-4">{faq.question}</span>
                  <div className={`w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 transition-transform ${expandedFaq === i ? 'rotate-45' : ''}`}>
                    <span className="text-white text-xl leading-none">+</span>
                  </div>
                </button>
                {expandedFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-white/70 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-white/60 text-sm">
              Still have questions?{' '}
              <button className="text-[#0535ed] hover:text-white font-semibold transition-colors">
                Contact our support team
              </button>
            </p>
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
