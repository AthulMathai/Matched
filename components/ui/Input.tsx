import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export default function Input({
  label,
  error,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id || props.name;

  return (
    <label className="block">
      {label ? (
        <span className="mb-2 block text-sm font-bold text-slate-300">
          {label}
        </span>
      ) : null}

      <input
        id={inputId}
        className={`input ${className}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />

      {error ? (
        <span id={`${inputId}-error`} className="mt-2 block text-sm text-red-400">
          {error}
        </span>
      ) : null}
    </label>
  );
}