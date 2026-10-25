import type { InputHTMLAttributes } from "react";
import { fieldClass } from "@/lib/ui";

export default function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldClass} ${className}`} {...rest} />;
}
