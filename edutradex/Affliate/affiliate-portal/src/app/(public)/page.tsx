import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Share2, TrendingUp } from "lucide-react";

const levelPreview = [
  {
    name: "Starter",
    rate: "60%",
    description: "Best for new partners.",
    icon: "🚀",
  },
  {
    name: "Growth",
    rate: "70%",
    description: "For active partners with growing traffic.",
    icon: "📈",
  },
  {
    name: "Ambassador",
    rate: "85%",
    description: "Top partners and brand representatives.",
    icon: "👑",
  },
];

const steps = [
  {
    title: "Create a Partner Account",
    description: "Register to access your referral tools and partner dashboard.",
    icon: UserPlus,
  },
  {
    title: "Refer Traders",
    description: "Share your tracking link across your channels and communities.",
    icon: Share2,
  },
  {
    title: "Traders Trade",
    description:
      "Track activity, registrations, deposits, and commissions automatically.",
    icon: TrendingUp,
  },
];

export default function HomePage() {
  return (
    <div className="relative">
      {/* Background */}
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/homepage.webp')",
          filter: "brightness(0.3)",
        }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/50 via-background/80 to-background" />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center md:py-32">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
          Build Revenue With
          <br />
          <span className="text-primary">OptigoBroker Partners</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
          A performance-based affiliate partnership built on real trading
          activity.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/register">
            <Button size="lg" className="neon-glow min-w-[200px]">
              Become a Partner
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="min-w-[200px]">
              Login
            </Button>
          </Link>
        </div>
      </section>

      {/* Partner Levels Preview */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="mb-10 text-center text-2xl font-bold md:text-3xl">
          Partner Levels Preview
        </h2>
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
          {levelPreview.map((level) => (
            <Card
              key={level.name}
              className="glass-card border-primary/20 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
            >
              <CardContent className="flex flex-col items-center p-6 text-center">
                <span className="text-3xl">{level.icon}</span>
                <h3 className="mt-4 text-lg font-semibold">{level.name}</h3>
                <p className="mt-2 text-4xl font-bold text-primary">
                  {level.rate}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {level.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/levels">
            <Button variant="outline" size="lg">
              View All Partner Levels
            </Button>
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="mb-10 text-center text-2xl font-bold md:text-3xl">
          How OptigoBroker Partners Works
        </h2>
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="flex flex-col items-center text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary ring-2 ring-primary/20">
                <step.icon className="h-8 w-8" />
              </div>
              <div className="mt-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {index + 1}
              </div>
              <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Commissions are calculated automatically and settled daily.
        </p>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="glass-card mx-auto max-w-3xl rounded-2xl p-8 text-center md:p-12">
          <h2 className="text-2xl font-bold md:text-3xl">
            Ready to start earning?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Join thousands of partners earning commissions with OptigoBroker.
            Get started in minutes.
          </p>
          <div className="mt-8">
            <Link href="/register">
              <Button size="lg" className="neon-glow">
                Become a Partner Today
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
