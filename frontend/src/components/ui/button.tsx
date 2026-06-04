import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({ className = "", variant = "secondary", ...props }: ButtonProps) {
  const variantClass = variant === "primary" ? "btn btn-primary" : "btn";
  return <button className={`${variantClass} ${className}`.trim()} {...props} />;
}
