import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition duration-200 disabled:pointer-events-none disabled:opacity-55 active:translate-y-px";

const variants: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-brand-600 text-white shadow-button hover:bg-brand-700 hover:shadow-lg",
  secondary:
    "border border-line bg-white text-ink shadow-[0_1px_2px_rgb(23_27_46_/_0.04)] hover:border-brand-200 hover:bg-lavender-50",
  ghost:
    "border border-transparent bg-lavender-100 text-brand-700 hover:bg-lavender-200",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3.5 py-2 text-[13px]",
  md: "min-h-11 px-5 py-2.5 text-sm",
  lg: "min-h-12 px-6 py-3 text-[15px]",
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
