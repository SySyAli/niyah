const stats = [
  { value: "2.5hrs", label: "Average daily screen time reduced" },
  { value: "89%", label: "Of users complete their sessions" },
  { value: "$12.40", label: "Average earned back per session" },
  { value: "10+", label: "Years of legal precedent" },
];

export function SocialProof() {
  return (
    <section className="bg-primary px-6 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="mb-2 text-4xl font-bold text-primary-foreground md:text-5xl">
                {stat.value}
              </p>
              <p className="text-sm text-primary-foreground/70">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
