"use client";

import { formatDuration } from "@/lib/exam";
import Link from "next/link";
import { useEffect, useState } from "react";

type ExamItem = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  maxAttempts: number;
  allowResultReview: boolean;
  participantCount: number;
  createdAt: string;
  expiresAt: string | null;
  creatorId: string;
};

export default function ExamListPage() {
  const [examList, setExamList] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [deletingCode, setDeletingCode] = useState("");

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

      setExamList((previous) => previous.filter((exam) => exam.code !== code));
      setActionMessage("Đã xóa bài kiểm tra.");
    } catch {
      setErrorMessage("Không thể kết nối đến máy chủ.");
    } finally {
      setDeletingCode("");
    }
  };

  useEffect(() => {
    const fetchExams = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/exams?scope=mine");
        const data = await response.json();

        if (!response.ok) {
          setErrorMessage(data.message || "Không thể tải danh sách bài thi.");
          return;
        }

        setExamList(data.exams as ExamItem[]);
      } catch {
        setErrorMessage("Không thể kết nối đến máy chủ.");
      } finally {
        setLoading(false);
      }
    };

    void fetchExams();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-slate-500">Đang tải danh sách bài thi...</div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">
          Danh sách bài thi của bạn
        </h1>
        <Link
          href="/exam/add"
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Tạo bài thi mới
        </Link>
      </div>

      {errorMessage ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {errorMessage}
        </p>
      ) : null}

      {actionMessage ? (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {actionMessage}
        </p>
      ) : null}

      {examList.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
          Bạn chưa tạo bài thi nào.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {examList.map((exam) => (
            <div
              key={exam.id}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <h2 className="text-lg font-semibold text-slate-800">
                {exam.title}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {exam.description || "Không có mô tả"}
              </p>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                <p>
                  Mã bài thi: <span className="font-semibold">{exam.code}</span>
                </p>
                <p>Thời gian: {formatDuration(exam.durationMinutes)}</p>
                <p>
                  Số lần làm:{" "}
                  {exam.maxAttempts === 0 ? "Không giới hạn" : exam.maxAttempts}
                </p>
                <p>Đã tham gia: {exam.participantCount} người</p>
                <p>
                  Xem điểm / xem lại:{" "}
                  {exam.allowResultReview ? "Cho phép" : "Không cho phép"}
                </p>
              </div>

              <div className="mt-4 flex gap-3">
                <Link
                  href={`/exam/${exam.code}`}
                  className="rounded-xl bg-indigo-100 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200"
                >
                  Xem và làm thử
                </Link>
                <button
                  type="button"
                  onClick={() => handleCopyLink(exam.code)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Copy link
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteExam(exam.code)}
                  disabled={deletingCode === exam.code}
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingCode === exam.code
                    ? "Đang xóa..."
                    : "Xóa bài kiểm tra"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
