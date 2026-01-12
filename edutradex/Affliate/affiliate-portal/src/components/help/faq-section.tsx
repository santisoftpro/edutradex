"use client";

import { useState } from "react";
import {
  Link2,
  DollarSign,
  Award,
  BarChart3,
  Users,
  Shield,
  MessageCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQ {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  label: string;
  icon: typeof Link2;
  faqs: FAQ[];
}

const faqCategories: FAQCategory[] = [
  {
    id: "links",
    label: "Links",
    icon: Link2,
    faqs: [
      {
        question: "How do I create a tracking link?",
        answer:
          "Go to the Links page from the sidebar, click 'Create Link', choose a link type (Register, Main Page, Android, or Platform), optionally add a comment for your reference, and click Create. Your new link will be ready to share immediately.",
      },
      {
        question: "What's the difference between link types?",
        answer:
          "REGISTER links direct users to the registration page (best for most campaigns). MAIN_PAGE links go to the homepage. ANDROID links direct to the Android app download. PLATFORM links go directly to the trading platform. Choose based on your audience and campaign goals.",
      },
      {
        question: "Can I edit or delete a link?",
        answer:
          "You can deactivate a link at any time, which stops it from tracking new clicks. You can also reactivate it later. Deleting a link is permanent and will remove all associated click data, but referral attributions are preserved.",
      },
      {
        question: "Why aren't my clicks being tracked?",
        answer:
          "Make sure your link is active (not deactivated). Clicks from the same IP within a short period may be deduplicated. Also verify you're using the correct tracking URL and not a modified version.",
      },
      {
        question: "How long does link attribution last?",
        answer:
          "When a user clicks your link, they're attributed to you for 30 days. If they register within this window, they become your referral permanently, even if they registered through a different link.",
      },
    ],
  },
  {
    id: "payments",
    label: "Payments",
    icon: DollarSign,
    faqs: [
      {
        question: "When can I withdraw my earnings?",
        answer:
          "Withdrawal frequency depends on your partner level. Starter and Builder levels can withdraw weekly (Mondays). Growth level can withdraw twice per week (Monday and Thursday). Advanced and higher levels can withdraw daily.",
      },
      {
        question: "What are the withdrawal methods?",
        answer:
          "We support CRYPTO withdrawals (USDT, BTC, ETH, etc.) and INTERNAL TRANSFER to a trading account. Crypto withdrawals have network fees, while internal transfers are free.",
      },
      {
        question: "What's the minimum withdrawal amount?",
        answer:
          "The minimum withdrawal amount is $50. Maximum per day is $10,000. These limits may vary based on your account status and verification level.",
      },
      {
        question: "How long do withdrawals take?",
        answer:
          "Withdrawal requests are typically processed within 24-48 hours. Crypto transactions then depend on blockchain confirmation times. Internal transfers are instant once approved.",
      },
      {
        question: "Why is my balance showing as 'pending'?",
        answer:
          "Pending balance represents commissions that are being verified. This typically includes recent earnings that are in a holding period. Once verified, they move to your available balance.",
      },
      {
        question: "What are the withdrawal fees?",
        answer:
          "USDT (TRC20): $1, USDT (ERC20): $5, BTC: 0.0001 BTC. Internal transfers are free. Fees may be updated based on network conditions.",
      },
    ],
  },
  {
    id: "levels",
    label: "Levels",
    icon: Award,
    faqs: [
      {
        question: "How do partner levels work?",
        answer:
          "There are 6 partner levels: Starter (60%), Builder (65%), Growth (70%), Advanced (75%), Pro (80%), and Ambassador (85%). Higher levels get better revenue share percentages and more frequent withdrawal options.",
      },
      {
        question: "How do I level up?",
        answer:
          "Levels are based on your total FTD (First Time Deposit) count. Starter: 0-19 FTDs, Builder: 20-39, Growth: 40-99, Advanced: 100-149, Pro: 150-399, Ambassador: 400+ with social verification.",
      },
      {
        question: "What's the social verification requirement?",
        answer:
          "For Pro and Ambassador levels, you need to verify at least one social media channel. This helps us confirm you're a legitimate partner with an established online presence.",
      },
      {
        question: "How often are levels reviewed?",
        answer:
          "Levels are automatically reviewed and updated daily. When you reach the FTD threshold for the next level, you'll be upgraded within 24 hours.",
      },
      {
        question: "Can I lose my level?",
        answer:
          "Levels are based on your total historical FTD count, which doesn't decrease. However, accounts found violating terms of service may have their level adjusted or suspended.",
      },
    ],
  },
  {
    id: "referrals",
    label: "Referrals",
    icon: Users,
    faqs: [
      {
        question: "What is an FTD?",
        answer:
          "FTD stands for First Time Deposit. It's when a referred user makes their first deposit on the platform. FTDs are the primary metric for your partner level and are required for commission eligibility.",
      },
      {
        question: "How are commissions calculated?",
        answer:
          "You earn a percentage (based on your level) of the platform's revenue from your referrals' trading activity. This is calculated daily based on your referrals' net losses (platform profit) from trading.",
      },
      {
        question: "When do I start earning from a referral?",
        answer:
          "You start earning commissions from a referral after they make their first deposit (FTD). Registrations without deposits don't generate commissions but do count towards your statistics.",
      },
      {
        question: "Can referrals be removed from my account?",
        answer:
          "Referrals are permanently attributed to you. However, if a referral is found to be fraudulent (self-referral, fake account, etc.), they may be removed and any associated commissions reversed.",
      },
      {
        question: "What's the difference between Revenue Share and Turnover Share?",
        answer:
          "Revenue Share means you earn from the platform's profit on your referrals' trades. Turnover Share (if available) means you earn a smaller percentage based on total trading volume regardless of profit/loss.",
      },
    ],
  },
  {
    id: "statistics",
    label: "Statistics",
    icon: BarChart3,
    faqs: [
      {
        question: "What metrics should I focus on?",
        answer:
          "Key metrics are: Click-to-Registration rate (aim for 5%+), Registration-to-FTD rate (aim for 20%+), and overall conversion rate. Also monitor which links and traffic sources perform best.",
      },
      {
        question: "How often are statistics updated?",
        answer:
          "Clicks and registrations are tracked in real-time. FTD and commission data is updated every few hours. Daily summaries are calculated at midnight UTC.",
      },
      {
        question: "Why don't my statistics match what I expected?",
        answer:
          "Statistics may differ due to: click deduplication, bot filtering, timezone differences, or delayed data sync. If you notice significant discrepancies lasting more than 24 hours, contact support.",
      },
      {
        question: "Can I export my statistics?",
        answer:
          "Currently, statistics can be viewed in the dashboard. Export functionality for detailed reports is coming soon. Contact support if you need data for accounting purposes.",
      },
    ],
  },
  {
    id: "security",
    label: "Security",
    icon: Shield,
    faqs: [
      {
        question: "How do I enable two-factor authentication?",
        answer:
          "Go to Settings > Security and click 'Enable' next to Two-Factor Authentication. You'll need to scan a QR code with an authenticator app (Google Authenticator, Authy, etc.) and enter a verification code.",
      },
      {
        question: "What should I do if I forget my password?",
        answer:
          "Click 'Forgot Password' on the login page. Enter your email address and we'll send you a password reset link. The link expires after 1 hour for security reasons.",
      },
      {
        question: "How do I keep my account secure?",
        answer:
          "Use a strong, unique password. Enable 2FA. Don't share your login credentials. Verify your email address. Be cautious of phishing attempts. Log out from shared devices.",
      },
      {
        question: "What happens if I detect suspicious activity?",
        answer:
          "Immediately change your password and enable 2FA if not already active. Check your recent withdrawal addresses and contact support. We can help secure your account and investigate any unauthorized access.",
      },
    ],
  },
];

export function FAQSection() {
  const [activeCategory, setActiveCategory] = useState("links");

  return (
    <Card className="glass-card" id="faq">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          Frequently Asked Questions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="flex-wrap h-auto gap-2 bg-transparent p-0 mb-6">
            {faqCategories.map((category) => {
              const Icon = category.icon;
              return (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {category.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {faqCategories.map((category) => (
            <TabsContent key={category.id} value={category.id}>
              <Accordion type="single" collapsible className="space-y-2">
                {category.faqs.map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="border border-border rounded-lg px-4 bg-white/5"
                  >
                    <AccordionTrigger className="text-left hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
