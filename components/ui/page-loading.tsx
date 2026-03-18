type PageLoadingProps = {
  label?: string;
  compact?: boolean;
};

export default function PageLoading({
  label = "Đang tải dữ liệu...",
  compact = false,
}: PageLoadingProps) {
  return (
    <div
      className={
        compact
          ? "flex items-center gap-3 p-6 text-slate-600"
          : "flex min-h-[40vh] flex-col items-center justify-center gap-3 p-6 text-slate-600"
      }
      role="status"
      aria-live="polite"
    >
      <span className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
