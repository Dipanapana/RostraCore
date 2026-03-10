import {
  Bell,
  Calendar,
  AlertTriangle,
  Banknote,
  CalendarClock,
  Shield,
  type LucideIcon,
} from "lucide-react";

export interface NotificationItem {
  notification_id: number;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  read_at: string | null;
  reference_type: string | null;
  reference_id: number | null;
  created_at: string;
}

export function getTypeIcon(type: string): LucideIcon {
  const t = type.toLowerCase();
  if (t.includes("shift") || t.includes("assignment") || t.includes("schedule") || t.includes("roster"))
    return Calendar;
  if (t.includes("leave")) return CalendarClock;
  if (t.includes("incident") || t.includes("alert") || t.includes("emergency"))
    return AlertTriangle;
  if (t.includes("payroll") || t.includes("pay") || t.includes("salary") || t.includes("payslip"))
    return Banknote;
  if (t.includes("psira") || t.includes("cert") || t.includes("compliance"))
    return Shield;
  return Bell;
}

export function getTypeColor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("shift") || t.includes("assignment") || t.includes("schedule") || t.includes("roster"))
    return "text-blue-500 bg-blue-50";
  if (t.includes("leave")) return "text-amber-500 bg-amber-50";
  if (t.includes("incident") || t.includes("alert") || t.includes("emergency"))
    return "text-red-500 bg-red-50";
  if (t.includes("payroll") || t.includes("pay") || t.includes("salary") || t.includes("payslip"))
    return "text-emerald-500 bg-emerald-50";
  if (t.includes("psira") || t.includes("cert") || t.includes("compliance"))
    return "text-violet-500 bg-violet-50";
  return "text-gray-500 bg-gray-100";
}
