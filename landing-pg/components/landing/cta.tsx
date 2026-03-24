import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

const GOOGLE_FORM_URL = "https://forms.gle/xC4qzpmwWwDD7Z5VA"

export function CTA() {
  return (
    <section className="relative overflow-hidden bg-primary px-6 py-20 md:py-28">
      {/* Decorative elements */}
      <div className="absolute inset-0 -z-0">
        <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <h2 className="mb-6 text-3xl font-bold leading-tight tracking-tight text-primary-foreground md:text-4xl lg:text-5xl text-balance">
          Ready to put your money where your mind is?
        </h2>
        <p className="mx-auto mb-10 max-w-xl text-lg text-primary-foreground/80">
          Join the waitlist to be among the first to try NIYAH. We&apos;re
          launching with a small group of committed users.
        </p>
        <a href={GOOGLE_FORM_URL} target="_blank" rel="noopener noreferrer">
          <Button
            size="lg"
            variant="secondary"
            className="gap-2 text-base font-semibold"
          >
            Join the Waitlist
            <ArrowRight className="h-5 w-5" />
          </Button>
        </a>
        <p className="mt-6 text-sm text-primary-foreground/60">
          No commitment required. We&apos;ll notify you when we launch.
        </p>
      </div>
    </section>
  )
}
