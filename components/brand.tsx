import Link from "next/link";
export default function Brand() {
  return (
    <Link href="/" className="brand" aria-label="QUICKKIT home">
      <span className="brand-mark" aria-hidden="true">
        Q
      </span>
      <span>
        QUICK<span className="brand-purple">KIT</span>
      </span>
    </Link>
  );
}
