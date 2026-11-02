"use client";
import { useEffect, useRef, useState } from "react";
import {
  MonitorSmartphone,
  Rocket,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from "lucide-react";

type Highlight = {
  Icon: LucideIcon;
  title: React.ReactNode;
  text: string;
  countTo?: number;
};

function CountUp({ to }: { to: number }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setValue(to);
          return;
        }
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / 1100, 1);
          setValue(Math.round(to * (1 - Math.pow(1 - progress, 3))));
          if (progress < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);
  return <span ref={ref}>{value}+</span>;
}

const highlights: Highlight[] = [
  {
    Icon: Zap,
    title: (
      <>
        <CountUp to={100} /> Tools
      </>
    ),
    text: "All in one place",
    countTo: 100,
  },
  {
    Icon: ShieldCheck,
    title: "Privacy First",
    text: "Your data stays on your device",
  },
  {
    Icon: Rocket,
    title: "Fast & Reliable",
    text: "Instant results, no sign-up",
  },
  {
    Icon: MonitorSmartphone,
    title: "Works Everywhere",
    text: "Desktop, tablet and mobile",
  },
];

export default function BenefitsStrip() {
  return (
    <section className="trust-strip" aria-label="QUICKKIT highlights">
      {highlights.map(({ Icon, title, text }, i) => (
        <div className="trust-item" key={i}>
          <span className="trust-icon">
            <Icon size={22} aria-hidden="true" />
          </span>
          <div>
            <strong>{title}</strong>
            <p>{text}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
