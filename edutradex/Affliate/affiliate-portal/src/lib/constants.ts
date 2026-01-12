import { PartnerLevel } from "@prisma/client";

// ============================================
// PARTNER LEVELS CONFIGURATION
// ============================================

export const PARTNER_LEVELS = {
  STARTER: {
    name: "Starter",
    level: 1,
    rate: 0.60,
    ftdRequired: 20,
    withdrawalFrequency: "weekly",
    withdrawalDays: [1], // Monday (0=Sun, 1=Mon, etc.)
    socialRequired: false,
    description: "Entry level for new partners.",
  },
  BUILDER: {
    name: "Builder",
    level: 2,
    rate: 0.65,
    ftdRequired: 40,
    withdrawalFrequency: "weekly",
    withdrawalDays: [1], // Monday
    socialRequired: false,
    description: "For growing partners; improved rate.",
  },
  GROWTH: {
    name: "Growth",
    level: 3,
    rate: 0.70,
    ftdRequired: 100,
    withdrawalFrequency: "twice_per_week",
    withdrawalDays: [1, 4], // Monday & Thursday
    socialRequired: true,
    socialRequirement: "At least 1 social channel",
    description: "For active partners with consistent traffic.",
  },
  ADVANCED: {
    name: "Advanced",
    level: 4,
    rate: 0.75,
    ftdRequired: 150,
    withdrawalFrequency: "twice_per_week",
    withdrawalDays: [1, 4], // Monday & Thursday
    socialRequired: true,
    socialRequirement: "Active social media",
    description: "Higher performance tier.",
  },
  PRO: {
    name: "Pro",
    level: 5,
    rate: 0.80,
    ftdRequired: 400,
    withdrawalFrequency: "twice_per_week",
    withdrawalDays: [1, 4], // Monday & Thursday
    socialRequired: true,
    socialRequirement: "Strong & consistent social",
    description: "High performers and experienced marketers.",
  },
  AMBASSADOR: {
    name: "Ambassador",
    level: 6,
    rate: 0.85,
    ftdRequired: 400,
    withdrawalFrequency: "daily",
    withdrawalDays: [0, 1, 2, 3, 4, 5, 6], // Every day
    socialRequired: true,
    socialRequirement: "Verified social / influencer",
    description: "Top partners and long-term representatives.",
  },
} as const;

export type PartnerLevelKey = keyof typeof PARTNER_LEVELS;
export type PartnerLevelConfig = (typeof PARTNER_LEVELS)[PartnerLevelKey];

// Helper function to get level config
export function getLevelConfig(level: PartnerLevel): PartnerLevelConfig {
  return PARTNER_LEVELS[level as PartnerLevelKey];
}

// Helper function to get level rate
export function getLevelRate(level: PartnerLevel): number {
  return PARTNER_LEVELS[level as PartnerLevelKey].rate;
}

// Helper function to get level name
export function getLevelName(level: PartnerLevel): string {
  return PARTNER_LEVELS[level as PartnerLevelKey].name;
}

// Helper function to check if withdrawals are allowed today
export function canWithdrawToday(level: PartnerLevel): boolean {
  const today = new Date().getDay(); // 0=Sun, 1=Mon, etc.
  const config = PARTNER_LEVELS[level as PartnerLevelKey];
  return (config.withdrawalDays as readonly number[]).includes(today);
}

// Helper function to get next withdrawal day
export function getNextWithdrawalDay(level: PartnerLevel): string {
  const config = PARTNER_LEVELS[level as PartnerLevelKey];
  const today = new Date().getDay();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const withdrawalDays = config.withdrawalDays as readonly number[];

  if (withdrawalDays.includes(today)) {
    return "Today";
  }

  // Find next allowed day
  for (let i = 1; i <= 7; i++) {
    const nextDay = (today + i) % 7;
    if (withdrawalDays.includes(nextDay)) {
      return days[nextDay];
    }
  }

  return days[withdrawalDays[0]];
}

// Helper function to determine eligible level based on FTD count
export function getEligibleLevel(
  ftdCount: number,
  hasSocialVerified: boolean = false,
  socialChannelCount: number = 0
): PartnerLevel {
  if (ftdCount >= 400 && hasSocialVerified) {
    return "AMBASSADOR";
  }
  if (ftdCount >= 400) {
    return "PRO";
  }
  if (ftdCount >= 150 && socialChannelCount > 0) {
    return "ADVANCED";
  }
  if (ftdCount >= 100 && socialChannelCount > 0) {
    return "GROWTH";
  }
  if (ftdCount >= 40) {
    return "BUILDER";
  }
  if (ftdCount >= 20) {
    return "STARTER";
  }

  // Below 20 FTD - keep at STARTER (pending verification)
  return "STARTER";
}

// ============================================
// WITHDRAWAL CONFIGURATION
// ============================================

export const WITHDRAWAL_CONFIG = {
  MIN_AMOUNT: 20,
  MAX_PROCESSING_HOURS: 24,
  SUPPORTED_COINS: [
    { symbol: "USDT", name: "Tether", networks: ["TRC20", "ERC20", "BEP20"] },
    { symbol: "BTC", name: "Bitcoin", networks: ["BTC"] },
    { symbol: "ETH", name: "Ethereum", networks: ["ERC20"] },
    { symbol: "LTC", name: "Litecoin", networks: ["LTC"] },
  ],
} as const;

// ============================================
// COOKIE & ATTRIBUTION
// ============================================

export const ATTRIBUTION_CONFIG = {
  COOKIE_WINDOW_DAYS: 30,
  COOKIE_NAME: "optigo_ref",
  ATTRIBUTION_MODEL: "first_click", // first_click wins
} as const;

// ============================================
// SETTLEMENT
// ============================================

export const SETTLEMENT_CONFIG = {
  SETTLEMENT_HOUR: 0, // 00:00 system time
  TIMEZONE: "UTC",
} as const;

// ============================================
// UI CONSTANTS
// ============================================

export const NAV_LINKS = {
  public: [
    { href: "/", label: "Home" },
    { href: "/how-it-works", label: "How it Works" },
    { href: "/levels", label: "Levels" },
    { href: "/withdrawals", label: "Withdrawals" },
  ],
  dashboard: [
    { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/statistics", label: "Statistics", icon: "BarChart3" },
    { href: "/links", label: "Links", icon: "Link" },
    { href: "/top-10", label: "Top 10", icon: "Trophy" },
    { href: "/affiliate-level", label: "Affiliate Level", icon: "TrendingUp" },
    { href: "/news", label: "News", icon: "Newspaper" },
    { href: "/support", label: "Support", icon: "HelpCircle" },
    { href: "/payments", label: "Payments", icon: "Wallet" },
  ],
} as const;

// ============================================
// TICKET CATEGORIES
// ============================================

export const TICKET_CATEGORIES = [
  { value: "PAYMENTS_WITHDRAWALS", label: "Payments / Withdrawals" },
  { value: "AFFILIATE_LEVEL", label: "Affiliate Level / Verification" },
  { value: "LINKS_TRACKING", label: "Links & Tracking" },
  { value: "ACCOUNT_LOGIN", label: "Account / Login" },
  { value: "FRAUD_REPORT", label: "Report fraud / abuse" },
  { value: "OTHER", label: "Other" },
] as const;

// ============================================
// SOCIAL PLATFORMS
// ============================================

export const SOCIAL_PLATFORMS = [
  { value: "YOUTUBE", label: "YouTube" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "TWITTER", label: "Twitter/X" },
  { value: "TELEGRAM", label: "Telegram" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "TWITCH", label: "Twitch" },
  { value: "DISCORD", label: "Discord" },
  { value: "WEBSITE", label: "Website" },
  { value: "OTHER", label: "Other" },
] as const;

// ============================================
// MARKETING METHODS
// ============================================

export const MARKETING_METHODS = [
  { value: "ORGANIC_SOCIAL", label: "Organic social posts" },
  { value: "COMMUNITY_SHARING", label: "Community sharing" },
  { value: "PAID_ADS", label: "Paid ads" },
  { value: "WEBSITE_SEO", label: "Website/SEO" },
  { value: "INFLUENCER_PARTNERSHIPS", label: "Influencer partnerships" },
  { value: "EMAIL_MARKETING", label: "Email marketing" },
  { value: "OTHER", label: "Other" },
] as const;

// ============================================
// DATE RANGE PRESETS
// ============================================

export const DATE_RANGE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "this_month", label: "This month" },
  { value: "all_time", label: "All time" },
] as const;

// ============================================
// LINK TYPES
// ============================================

export const LINK_TYPES = [
  { value: "REGISTER", label: "Register link" },
  { value: "MAIN_PAGE", label: "Main page" },
  { value: "ANDROID", label: "Android link" },
  { value: "PLATFORM", label: "Quick entry into the platform" },
] as const;
