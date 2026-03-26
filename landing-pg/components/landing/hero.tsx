"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const GOOGLE_FORM_URL = "https://forms.gle/xC4qzpmwWwDD7Z5VA";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

const screenshots = [
  { src: `${BASE_PATH}/app-screen-1.svg`, alt: "Welcome to Niyah" },
  { src: `${BASE_PATH}/app-screen-2.svg`, alt: "How it works" },
  { src: `${BASE_PATH}/app-screen-3.svg`, alt: "Active session" },
  { src: `${BASE_PATH}/app-screen-4.svg`, alt: "Session complete" },
];

export function Hero() {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % screenshots.length);
  }, []);

  useEffect(() => {
    if (screenshots.length <= 1) return;
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] items-center overflow-visible px-6 py-12 md:py-16">
      <div className="absolute inset-0 -z-10 opacity-30">
        <div className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="mx-auto w-full max-w-7xl">
        <div className="grid items-center justify-items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Left content */}
          <div className="max-w-xl lg:justify-self-end lg:pr-8">
            <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl text-balance">
              Put your money where your mind is.
            </h1>

            <p className="mb-8 text-lg leading-relaxed text-muted-foreground md:text-xl">
              Focus sessions with real financial stakes. Stake money with
              friends, lock your distracting apps, and the people who actually
              stay focused earn more back.
            </p>

            <a href={GOOGLE_FORM_URL} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="gap-2">
                Join the Waitlist
                <ArrowRight className="h-5 w-5" />
              </Button>
            </a>
          </div>

          {/* Right - 3D tilted phone with carousel */}
          <div className="flex justify-center lg:justify-center">
            <div className="p-4" style={{ perspective: "1400px" }}>
              <div
                className="relative w-[260px] rounded-[2.5rem] border-[12px] border-foreground/80 bg-foreground/80 shadow-2xl sm:w-[290px] md:w-[340px] md:rounded-[3rem] md:border-[14px] lg:w-[370px]"
                style={{
                  transform: "rotateY(-6deg) rotateX(3deg)",
                  transformStyle: "preserve-3d",
                }}
              >
                {/* Screenshot carousel */}
                <div className="relative overflow-hidden rounded-[1.6rem] md:rounded-[2rem]">
                  <div
                    className="flex transition-transform duration-700 ease-in-out"
                    style={{
                      transform: `translateX(-${current * 100}%)`,
                    }}
                  >
                    {screenshots.map((screen, i) => (
                      <img
                        key={i}
                        src={screen.src}
                        alt={screen.alt}
                        className="block w-full shrink-0"
                      />
                    ))}
                  </div>
                </div>

                {/* Dot indicators */}
                {screenshots.length > 1 && (
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                    {screenshots.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrent(i)}
                        className={`h-2 rounded-full transition-all ${
                          i === current ? "w-6 bg-white" : "w-2 bg-white/40"
                        }`}
                        aria-label={`Go to screenshot ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
