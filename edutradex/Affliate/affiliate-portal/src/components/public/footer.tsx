import Link from "next/link";
import { Logo } from "@/components/shared/logo";

const quickLinks = [
  { href: "/how-it-works", label: "How it Works" },
  { href: "/levels", label: "Partner Levels" },
  { href: "/withdrawals", label: "Withdrawals" },
  { href: "/register", label: "Become a Partner" },
];

const legalLinks = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/affiliate-agreement", label: "Affiliate Agreement" },
  { href: "/risk-disclosure", label: "Risk Disclosure" },
];

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40 bg-background/50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Logo size="sm" />
            <p className="text-sm text-muted-foreground">
              A performance-based affiliate partnership built on real trading
              activity.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/login"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Partner Login
                </Link>
              </li>
              <li>
                <a
                  href="mailto:partners@optigobroker.com"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  partners@optigobroker.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border/40 pt-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-xs text-muted-foreground">
              &copy; {currentYear} OptigoBroker Partners. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              Commissions are calculated automatically and settled daily.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
