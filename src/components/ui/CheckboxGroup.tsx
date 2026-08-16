interface CheckboxGroupProps {
  label: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
}

export function CheckboxGroup({ label, options, value, onChange, error }: CheckboxGroupProps) {
  function toggle(optionValue: string) {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  }

  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <div className="checkbox-group" role="group" aria-label={label}>
        {options.map((opt) => (
          <label className="checkbox-group__option" key={opt.value}>
            <input
              type="checkbox"
              checked={value.includes(opt.value)}
              onChange={() => toggle(opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </div>
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}
