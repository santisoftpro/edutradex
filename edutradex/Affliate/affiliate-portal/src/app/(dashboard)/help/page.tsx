import type { Metadata } from "next";
import { HelpHeader } from "@/components/help/help-header";
import { QuickHelpCards } from "@/components/help/quick-help-cards";
import { FAQSection } from "@/components/help/faq-section";
import { ContactSection } from "@/components/help/contact-section";
import { GettingStartedGuide } from "@/components/help/getting-started-guide";

export const metadata: Metadata = {
  title: "Help Center",
  description: "Get help and find answers to frequently asked questions",
};

export default function HelpPage() {
  return (
    <div className="space-y-8">
      <HelpHeader />
      <QuickHelpCards />
      <GettingStartedGuide />
      <FAQSection />
      <ContactSection />
    </div>
  );
}
