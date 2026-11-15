import Link from "next/link";
import { Zap } from "lucide-react";
export default function Brand({ name = "QUICKKIT" }: { name?: string }) {
  return (
    <Link
      href="/"
      prefetch={false}
      className="brand"
      aria-label={`${name} home`}
    >
      <span className="brand-mark" aria-hidden="true">
        <Zap size={21} strokeWidth={2.4} fill="currentColor" />
      </span>
      <span>{name}</span>
    </Link>
  );
}
