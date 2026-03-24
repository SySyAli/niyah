import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-2xl font-bold tracking-tight text-foreground">
          Niyah
        </Link>

        <Button size="sm" asChild>
          <a href="https://forms.gle/xC4qzpmwWwDD7Z5VA" target="_blank" rel="noopener noreferrer">
            Join the Waitlist
          </a>
        </Button>
      </div>
    </header>
  )
}
