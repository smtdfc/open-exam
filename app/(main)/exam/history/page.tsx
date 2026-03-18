"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type HistoryPayload = {
  summary: {
    totalAttempts: number;
    joinedExamCount: number;
    averageScore: number | null;
  };
  items: Array<{
    id: string;
    examId: string;
    examCode: string;
    examTitle: string;
    maxAttempts: number;
    allowResultReview: boolean;
    isOwner: boolean;
    score: number | null;
    submittedAt: string;
    isLatest: boolean;
    attemptsUsed: number;
    canOpen: boolean;
  }>;
};

export default function ExamHistoryPage() {
  const [history, setHistory] = useState<HistoryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [deletingCode, setDeletingCode] = useState("");

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch("/api/exams/history");
        const data = (await response.json()) as
          | HistoryPayload
          | { message?: string };

        if (!response.ok) {
          const message =
            "message" in data ? data.message : "Không thể tải lịch sử làm bài.";
          setErrorMessage(message || "Không thể tải lịch sử làm bài.");
          return;
        }

        setHistory(data as HistoryPayload);
      } catch {
        setErrorMessage("Không thể kết nối đến máy chủ.");
      } finally {
        setLoading(false);
      }
    };

    void loadHistory();
  }, []);

  const groupedByExam = useMemo(() => {
    if (!history) {
      return [] as Array<{
        examCode: string;
        examTitle: string;
        maxAttempts: number;
        attempts: HistoryPayload["items"];
      }>;
    }

    const map = new Map<
      string,
      {
        examCode: string;
        examTitle: string;
        maxAttempts: number;
        attempts: HistoryPayload["items"];
      }
    >();

    for (const item of history.items) {
      const key = item.examId;
      const existing = map.get(key);

      if (existing) {
        existing.attempts.push(item);
        continue;
      }

      map.set(key, {
        examCode: item.examCode,
        examTitle: item.examTitle,
        maxAttempts: item.maxAttempts,
        attempts: [item],
      });
    }

    return Array.from(map.values());
  }, [history]);

  const formatSubmittedAt = (submittedAt: string) => {
    const date = new Date(submittedAt);
    if (Number.isNaN(date.getTime())) {
      return "Không rõ thời gian";
    }

    return date.toLocaleString("vi-VN");
  };

  const buildExamLink = (code: string) => {
    if (typeof window === "undefined") {
      return `/exam/${code}`;
    }

    return `${window.location.origin}/exam/${code}`;
  };

  const handleCopyLink = async (code: string) => {
    try {
      const link = buildExamLink(code);
      await navigator.clipboard.writeText(link);
      setActionMessage("Đã copy link bài kiểm tra.");
      setErrorMessage("");
    } catch {
      setErrorMessage("Không thể copy link. Vui lòng thử lại.");
    }
  };

  const handleDeleteExam = async (code: string) => {
    const confirmed = window.confirm("Bạn có chắc muốn xóa bài kiểm tra này?");
    if (!confirmed) {
      return;
    }

    setDeletingCode(code);
    setActionMessage("");
    setErrorMessage("");

    try {
      const response = await fetch(`/api/exams/${code}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setErrorMessage(data.message || "Không thể xóa bài kiểm tra.");
        return;
      }

      setHistory((previous) => {
        if (!previous) {
          return previous;
        }

        const filteredItems = previous.items.filter(
          (item) => item.examCode !== code,
        );
        const examCodeSet = new Set(filteredItems.map((item) => item.examCode));
        const visibleScoreItems = filteredItems.filter(
          (item) => item.score !== null,
        );
        return {
          summary: {
            totalAttempts: filteredItems.length,
            joinedExamCount: examCodeSet.size,
            averageScore:
              visibleScoreItems.length > 0
                ? Math.round(
                    (visibleScoreItems.reduce(
                      (sum, item) => sum + (item.score ?? 0),
                      0,
                    ) /
                      visibleScoreItems.length) *
                      100,
                  ) / 100
                : null,
          },
          items: filteredItems,
        };
      });
      setActionMessage("Đã xóa bài kiểm tra.");
    } catch {
      setErrorMessage("Không thể kết nối đến máy chủ.");
    } finally {
      setDeletingCode("");
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-slate-500">Đang tải lịch sử làm bài...</div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-800">Lịch sử làm bài</h1>
        <p className="mt-2 text-slate-500">
          Theo dõi các lần nộp bài của bạn, điểm số và truy cập lại kết quả đã
          làm.
        </p>

        {history ? (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">Tổng số lần nộp</p>
              <p className="mt-1 text-2xl font-bold text-slate-800">
                {history.summary.totalAttempts}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">Số bài đã tham gia</p>
              <p className="mt-1 text-2xl font-bold text-slate-800">
                {history.summary.joinedExamCount}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">Điểm trung bình</p>
              <p className="mt-1 text-2xl font-bold text-slate-800">
                {history.summary.averageScore ?? "Đang ẩn"}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {errorMessage}
        </p>
      ) : null}

      {actionMessage ? (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {actionMessage}
        </p>
      ) : null}

      {history && groupedByExam.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
          Bạn chưa có lần nộp nào. Hãy làm bài để bắt đầu lưu lịch sử.
        </div>
      ) : null}

      {groupedByExam.map((group) => (
        <div
          key={group.examCode}
          className="rounded-2xl border border-slate-200 bg-white p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {group.examTitle}
              </h2>
              <p className="text-sm text-slate-600">
                Mã bài thi: {group.examCode}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Số lượt tối đa:{" "}
                {group.maxAttempts === 0 ? "Không giới hạn" : group.maxAttempts}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/exam/${group.examCode}`}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Làm lại bài này
              </Link>
              <button
                type="button"
                onClick={() => handleCopyLink(group.examCode)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Copy link
              </button>
              {group.attempts.some((item) => item.isOwner) ? (
                <button
                  type="button"
                  onClick={() => handleDeleteExam(group.examCode)}
                  disabled={deletingCode === group.examCode}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingCode === group.examCode
                    ? "Đang xóa..."
                    : "Xóa bài kiểm tra"}
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {group.attempts.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Điểm: {item.score ?? "Đang ẩn"}
                    {item.isLatest ? " (Mới nhất)" : ""}
                  </p>
                  <p className="text-sm text-slate-600">
                    Nộp lúc: {formatSubmittedAt(item.submittedAt)}
                  </p>
                  <p className="text-sm text-slate-600">
                    Tổng số lần nộp bài này: {item.attemptsUsed}
                  </p>
                </div>

                {item.canOpen ? (
                  <Link
                    href={`/exam/${group.examCode}/result?attemptId=${item.id}`}
                    className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                  >
                    Xem chi tiết
                  </Link>
                ) : (
                  <p className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-500">
                    Không thể xem lại
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
