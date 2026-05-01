export function toSafeLabel(value: string | null | undefined, fallback: string): string {
  if (!value || value.trim().length === 0) return fallback;
  
  // Mapping status agar lebih enak dibaca di UI
  const labels: Record<string, string> = {
    "OPEN": "TERBUKA",
    "CLOSED": "TERTUTUP",
    "PASSING": "MELINTAS",
    "COMPLETED": "BERSIH",
    "ANOMALY": "ANOMALI"
  };

  // Cek apakah ada di mapping, jika tidak kembalikan Uppercase agar konsisten
  return labels[value.toUpperCase()] || value.toUpperCase();
}

export function formatLocalShortTime(isoString: string | Date | null): string {
  if (!isoString) return "--:--";
  
  const date = typeof isoString === 'string' ? new Date(isoString) : isoString;
  
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit", // Menambahkan detik untuk kebutuhan monitoring IoT
    hour12: false
  });
}

// Tambahkan fungsi khusus tanggal untuk tabel History
export function formatLocalDate(isoString: string | null): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function calculateDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "---";
  
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  
  const diffInSeconds = Math.floor((endTime - startTime) / 1000);
  
  if (diffInSeconds < 0) return "0s";
  if (diffInSeconds >= 60) {
    const mins = Math.floor(diffInSeconds / 60);
    const secs = diffInSeconds % 60;
    return `${mins}m ${secs}s`;
  }
  
  return `${diffInSeconds}s`;
}



