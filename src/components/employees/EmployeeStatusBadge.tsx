import { Badge } from "@/components/ui/badge";
import { EMPLOYEE_STATUS_LABELS, type EmployeeStatus } from "@/lib/permissions";
import { cn } from "@/lib/utils";

interface EmployeeStatusBadgeProps {
  status: EmployeeStatus;
  className?: string;
  variant?: "solid" | "outline";
}

export function EmployeeStatusBadge({ status, className, variant = "solid" }: EmployeeStatusBadgeProps) {
  const styles: Record<EmployeeStatus, string> = {
    ativo: variant === "solid" 
      ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
      : "border-emerald-200 text-emerald-700 bg-emerald-50/30",
    ferias: variant === "solid"
      ? "bg-amber-50 text-amber-700 border-amber-100"
      : "border-amber-200 text-amber-700 bg-amber-50/30",
    afastado: variant === "solid"
      ? "bg-blue-50 text-blue-700 border-blue-100"
      : "border-blue-200 text-blue-700 bg-blue-50/30",
    desligado: variant === "solid"
      ? "bg-rose-50 text-rose-700 border-rose-100"
      : "border-rose-200 text-rose-700 bg-rose-50/30",
  };

  return (
    <Badge 
      variant="secondary" 
      className={cn(
        "text-[10px] font-medium h-5 px-1.5",
        styles[status],
        className
      )}
    >
      {EMPLOYEE_STATUS_LABELS[status]}
    </Badge>
  );
}
