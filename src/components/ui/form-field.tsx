import { Label } from "@/components/ui/label"

interface FormFieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

export function FormField({ label, hint, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
