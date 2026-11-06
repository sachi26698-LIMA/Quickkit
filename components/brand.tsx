import Link from "next/link";
import { Zap } from "lucide-react";
export default function Brand() {
  return (
    <Link
      href="/"
      prefetch={false}
      className="brand"
      aria-label="QUICKKIT home"
    >
      <span className="brand-mark" aria-hidden="true">
        <Zap size={21} strokeWidth={2.4} fill="currentColor" />
      </span>
      <span>
        QUICK<span className="brand-purple">KIT</span>
      </span>
    </Link>
  );
}
