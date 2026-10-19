export function MaterialPackagePolicyField({ checked, onChange, baseUnitName, canEnable = true, disabled = false }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  baseUnitName?: string;
  canEnable?: boolean;
  disabled?: boolean;
}) {
  return <div className="space-y-2 rounded-lg border bg-slate-50 p-4">
    <label className="flex items-start gap-3 text-sm">
      <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={checked} disabled={disabled || (!checked && !canEnable)} onChange={event => onChange(event.target.checked)} />
      <span><span className="block font-medium">Full packages only</span><span className="mt-1 block text-muted-foreground">Receive, issue, transfer and sell only complete boxes, bags or other packages. {baseUnitName || "The base unit"} remains the unit used to calculate stock.</span></span>
    </label>
    {!canEnable && !checked && <p className="pl-7 text-xs text-muted-foreground">Add a package containing more than one base unit to enable this option.</p>}
    <p className="pl-7 text-xs text-muted-foreground">Stock counts, authorized adjustments and package conversions remain available.</p>
  </div>;
}
