import { Shield, Users, Sliders, BarChart3, Bell, Lock } from "lucide-react";

const features = [
  {
    icon: Lock,
    title: "Real blocking, not a suggestion",
    description:
      "Uses Apple's FamilyControls to block apps at the system level. Even deleting the app won't bypass the block.",
    highlight: true,
  },
  {
    icon: BarChart3,
    title: "Fair competition",
    description:
      "Payouts use normalized screen time reduction. Heavy and casual phone users compete on a level playing field.",
    highlight: false,
  },
  {
    icon: Users,
    title: "Social accountability",
    description:
      "See who's in your session, who surrendered, and who stayed focused. Your track record follows you.",
    highlight: false,
  },
  {
    icon: Sliders,
    title: "Flexible stakes",
    description:
      "Small daily stakes for building habits. Larger weekly stakes for serious commitments. You set the terms.",
    highlight: false,
  },
  {
    icon: Bell,
    title: "Smart app selection",
    description:
      "Pick which apps to block, or let Niyah auto-select based on your screen time history.",
    highlight: false,
  },
  {
    icon: Shield,
    title: "Trusted infrastructure",
    description:
      "Payments handled by Stripe. Built on the same legal model as stickK and Beeminder with 10+ years of precedent.",
    highlight: false,
  },
];

export function Features() {
  return (
    <section id="features" className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-wider text-primary">
            Features
          </p>
          <h2 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl text-balance">
            Everything you need to actually focus.
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Money changes behavior in a way that willpower and tracking apps
            never could. When your stake is on the line, the incentive structure
            is fundamentally different.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className={`group rounded-2xl border p-6 transition-all hover:shadow-lg ${
                feature.highlight
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-card hover:border-primary/20"
              }`}
            >
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${
                  feature.highlight
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground"
                }`}
              >
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
