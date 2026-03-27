import { Smartphone, TrendingUp, Users, Zap } from "lucide-react";

export function BentoGrid() {
  return (
    <section className="bg-[oklch(0.14_0.04_150)] px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-[oklch(0.93_0.01_80)] md:text-4xl lg:text-5xl text-balance">
            Why Niyah works when other apps don&apos;t.
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-[oklch(0.93_0.01_80)]/60">
            Every screen time app tells you how much you used your phone. That
            doesn&apos;t work. Loss aversion is stronger than motivation.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Large card - spans 2 columns */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[oklch(0.35_0.09_150)] to-[oklch(0.28_0.09_150)] p-8 lg:col-span-2">
            <div className="relative z-10">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-3 text-2xl font-semibold text-white">
                Financial stakes change everything
              </h3>
              <p className="max-w-lg text-white/75">
                Niyah is built on behavioral economics — commitment contracts
                with real financial stakes. When your actual money is on the
                line, and your friends can see whether you followed through, the
                incentive structure is fundamentally different.
              </p>
            </div>
            <div className="absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
          </div>

          {/* System-level blocking */}
          <div className="rounded-3xl bg-[oklch(0.20_0.04_150)] p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[oklch(0.35_0.09_150)]/20">
              <Smartphone className="h-6 w-6 text-[oklch(0.60_0.12_150)]" />
            </div>
            <h3 className="mb-3 text-xl font-semibold text-[oklch(0.93_0.01_80)]">
              System-level blocking
            </h3>
            <p className="text-[oklch(0.93_0.01_80)]/55">
              Uses Apple&apos;s own Screen Time framework. This isn&apos;t a
              nudge — it&apos;s a real block that persists even if you delete
              the app.
            </p>
          </div>

          {/* Group accountability */}
          <div className="rounded-3xl bg-[oklch(0.20_0.04_150)] p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[oklch(0.35_0.09_150)]/20">
              <Users className="h-6 w-6 text-[oklch(0.60_0.12_150)]" />
            </div>
            <h3 className="mb-3 text-xl font-semibold text-[oklch(0.93_0.01_80)]">
              Group accountability
            </h3>
            <p className="text-[oklch(0.93_0.01_80)]/55">
              Everyone knows who surrendered and who stayed. The social layer
              multiplies accountability beyond just the money.
            </p>
          </div>

          {/* Normalized competition - spans 2 columns */}
          <div className="rounded-3xl bg-[oklch(0.20_0.04_150)] p-8 lg:col-span-2">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="flex-1">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[oklch(0.35_0.09_150)]/20">
                  <TrendingUp className="h-6 w-6 text-[oklch(0.60_0.12_150)]" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-[oklch(0.93_0.01_80)]">
                  Normalized competition
                </h3>
                <p className="text-[oklch(0.93_0.01_80)]/55">
                  Someone who normally uses 8 hours and cuts to 4 is rewarded
                  equally to someone who goes from 2 hours to 1. It&apos;s
                  percentage improvement, not raw numbers.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="font-mono text-3xl font-bold text-[oklch(0.60_0.12_150)]">
                    -50%
                  </p>
                  <p className="text-xs text-[oklch(0.93_0.01_80)]/45">
                    8h &rarr; 4h
                  </p>
                </div>
                <div className="text-2xl text-[oklch(0.93_0.01_80)]/35">=</div>
                <div className="text-center">
                  <p className="font-mono text-3xl font-bold text-[oklch(0.60_0.12_150)]">
                    -50%
                  </p>
                  <p className="text-xs text-[oklch(0.93_0.01_80)]/45">
                    2h &rarr; 1h
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
