import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "ghost" | "default" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children?: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-1.5 font-serif text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40";

const variants: Record<Variant, string> = {
  primary:
    "h-9 px-4 rounded-md bg-shiori-500 text-white hover:bg-shiori-600 shadow-warm-sm",
  ghost:
    "h-9 px-3 rounded-md bg-transparent text-ink-700 hover:bg-paper-2",
  default:
    "h-9 px-4 rounded-md bg-paper-0 text-ink-900 border border-paper-edge hover:bg-paper-2",
  icon:
    "h-8 w-8 rounded-md bg-paper-0 text-ink-700 border border-paper-edge hover:bg-paper-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", className = "", children, ...rest }, ref) => (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  ),
);
Button.displayName = "Button";
