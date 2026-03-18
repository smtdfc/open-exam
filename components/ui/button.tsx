import React from "react";

import { LucideIcon, Loader2 } from "lucide-react";
import { ReactNode, ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}

export default function Button({
  children,
  isLoading,
  icon: Icon,
  variant = "primary",
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200",
    secondary:
      "bg-slate-100 text-slate-700 hover:bg-slate-200 shadow-slate-100",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-red-100",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-50",
  };

  return (
    <button
      className={`
        relative flex items-center justify-center gap-2 px-5 py-2
        rounded-xl font-semibold transition-all duration-200
        active:scale-[0.97] disabled:opacity-70 disabled:cursor-not-allowed
         ${variants[variant]} ${className}
      `}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin" size={18} />
      ) : (
        Icon && <Icon size={18} />
      )}

      <span className={isLoading ? "opacity-0" : "opacity-100"}>
        {children}
      </span>

      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          Đang xử lý...
        </span>
      )}
    </button>
  );
}
