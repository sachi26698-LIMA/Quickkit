import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "mint";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-control font-bold transition duration-200 disabled:pointer-events-none disabled:opacity-55 active:translate-y-px";

const variants: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 text-white shadow-button hover:-translate-y-0.5 hover:shadow-[0_20px_34px_-16px_rgb(108_92_232_/_0.95)]",
  secondary:
    "border border-line bg-white text-ink shadow-[0_1px_2px_rgb(20_23_42_/_0.05)] hover:-translate-y-0.5 hover:border-brand-200 hover:bg-lavender-50",
  ghost:
    "border border-transparent bg-lavender-100 text-brand-700 hover:bg-lavender-200",
  mint: "border border-mint-200 bg-mint-soft text-mint-ink hover:bg-mint-100",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-10 px-4 py-2 text-[0.8125rem]",
  md: "min-h-12 px-5 py-3 text-[0.9375rem]",
  lg: "min-h-13 px-6 py-3.5 text-base",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, className })}
      {...props}
    />
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <Link className={buttonStyles({ variant, size, className })} {...props} />
  );
}
