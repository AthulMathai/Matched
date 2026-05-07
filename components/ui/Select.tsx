import type { SelectHTMLAttributes } from "react";

type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
};

export default function Select({
  label,
  error,
  options,
  placeholder = "Select option",
  className = "",
  id,
  ...props
}: SelectProps) {
  const selectId = id || props.name;

  return (
    <label className="block">
      {label ? (
        <span className="mb-2 block text-sm font-bold text-slate-300">
          {label}
        </span>
      ) : null}

      <select
        id={selectId}
        className={`input ${className}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${selectId}-error` : undefined}
        {...props}
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error ? (
        <span id={`${selectId}-error`} className="mt-2 block text-sm text-red-400">
          {error}
        </span>
      ) : null}
    </label>
  );
}