type DeviceStatusMeta = {
  label: string;
  textClass: string;
  dotClass: string;
  cardClass: string;
  barClass: string;
};

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStatusMeta(status: string | null): DeviceStatusMeta {
  const normalized = (status ?? "unknown").toLowerCase();

  if (normalized === "online") {
    return {
      label: "ONLINE",
      textClass: "text-emerald-400",
      dotClass: "text-emerald-400",
      cardClass: "border-emerald-500/20 bg-emerald-500/5",
      barClass: "bg-emerald-500",
    };
  }

  if (normalized === "maintenance") {
    return {
      label: "MAINTENANCE",
      textClass: "text-amber-400",
      dotClass: "text-amber-400",
      cardClass: "border-amber-500/20 bg-amber-500/5",
      barClass: "bg-amber-500",
    };
  }

  if (normalized === "offline") {
    return {
      label: "OFFLINE",
      textClass: "text-rose-400",
      dotClass: "text-rose-400",
      cardClass: "border-rose-500/20 bg-rose-500/5",
      barClass: "bg-rose-500",
    };
  }

  return {
    label: "UNKNOWN",
    textClass: "text-slate-400",
    dotClass: "text-slate-400",
    cardClass: "border-slate-800 bg-slate-900/40",
    barClass: "bg-slate-500",
  };
}
