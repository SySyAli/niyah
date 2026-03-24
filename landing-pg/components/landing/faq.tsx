"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  {
    question: "Is this gambling?",
    answer:
      "No. NIYAH is a commitment contract — the same model used by stickK and Beeminder for over 10 years. Whether you keep your money is entirely determined by your own effort and discipline, not luck or chance. The outcome is skill-based: you choose to stay focused or you choose to surrender. The app is categorized as Productivity, not Games.",
  },
  {
    question: "How does the app actually block my apps?",
    answer:
      "NIYAH uses Apple's Screen Time API (FamilyControls) to block apps at the system level. This isn't a \"are you sure?\" nudge — it's a real block. You either pick which apps to block or let NIYAH auto-select your most-used distracting apps. Once a session starts, those apps show a branded block screen. Even deleting the app won't bypass the block because FamilyControls persists independently.",
  },
  {
    question: "What happens if I quit a session early?",
    answer:
      "If you surrender during a session, you forfeit part or all of your stake. That money gets redistributed to the people who stayed focused. The only way out of the app block is to surrender — there's no other bypass. This is what makes the commitment real.",
  },
  {
    question: "Is the competition fair for heavy vs. light phone users?",
    answer:
      "Yes. Payouts use normalized screen time reduction, not raw numbers. Someone who normally uses their phone 8 hours a day and cuts to 4 is rewarded equally to someone who goes from 2 hours to 1. The metric is percentage improvement relative to your own habits.",
  },
  {
    question: "How do payments work?",
    answer:
      "For the initial launch, settlement happens via Venmo between friends — simple and straightforward. All in-app payment infrastructure is built on Stripe, so your financial data is never handled directly by the app.",
  },
  {
    question: "Can I use NIYAH solo?",
    answer:
      "Solo mode exists, but group sessions are where NIYAH really shines. Financial stakes plus social accountability together create a fundamentally different incentive structure. Start by inviting a few friends — that's the strongest path to actually changing your habits.",
  },
  {
    question: "How much should I stake?",
    answer:
      "That's entirely up to you. Small daily stakes ($1–5) work great for building habits. Larger weekly or monthly stakes ($10–50) are better for serious commitments. The key is that the amount needs to be meaningful enough to you that you'll actually follow through.",
  },
]

export function FAQ() {
  return (
    <section id="faq" className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-wider text-primary">
            FAQ
          </p>
          <h2 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl text-balance">
            Questions you might have.
          </h2>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-base font-semibold text-foreground hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
