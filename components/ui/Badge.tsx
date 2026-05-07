import type { HTMLAttributes, ReactNode } from "react";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  active?: boolean;
};

export default function Badge({
  children,
  active = false,
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span
      className={`badge ${
        active ? "border-cyan-400 bg-cyan-400/15 text-cyan-200" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}