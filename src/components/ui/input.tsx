import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, type = "text", ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-10 w-full rounded-xl border border-line bg-surface px-3.5 text-sm outline-none transition-colors",
        "placeholder:text-subtle focus:border-accent/60 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
