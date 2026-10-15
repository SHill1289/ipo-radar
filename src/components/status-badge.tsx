import type { IpoStatus } from "@/lib/types";

const labels: Record<IpoStatus, string> = { rumored: "Rumored", filed: "Filed", upcoming: "Upcoming", withdrawn: "Withdrawn", completed: "Priced" };

export function StatusBadge({ status }: { status: IpoStatus }) {
  return <span className={`status status-${status}`}><span className="status-dot" />{labels[status]}</span>;
}
