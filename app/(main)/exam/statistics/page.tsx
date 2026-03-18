"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type StatisticsPayload = {
  summary: {
    totalExams: number;
    totalParticipants: number;
    totalAttempts: number;
  };
  items: Array<{
    examId: string;
    examCode: string;
    examTitle: string;
    maxAttempts: number;
    allowResultReview: boolean;
    createdAt: string;
    participantCount: number;
    attemptCount: number;
    averageScore: number;
    highestScore: number;
    lastSubmittedAt: string | null;
  }>;
};

export default function ExamStatisticsPage() {
  const [stats, setStats] = useState<StatisticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadStatistics = async () => {
      try {
        const response = await fetch("/api/exams/statistics");
        const data = (await response.json()) as
          | StatisticsPayload
          | { message?: string };

        if (!response.ok) {
          const message =
            "message" in data
              ? data.message
              : "Không thể tải thống kê bài kiểm tra.";
          setErrorMessage(message || "Không thể tải thống kê bài kiểm tra.");
          return;
        }

        setStats(data as StatisticsPayload);
      } catch {
        setErrorMessage("Không thể kết nối đến máy chủ.");
      } finally {
        setLoading(false);
      }
    };

    void loadStatistics();
  }, []);

  const formatDateTime = (value: string | null) => {
    if (!value) {
      return "Chưa có dữ liệu";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Không rõ thời gian";
    }

    return date.toLocaleString("vi-VN");
  };

  if (loading) {
    return <div className="p-6 text-slate-500">Đang tải thống kê...</div>;
  }

  return (
    <div className="p-6 space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-800">
          Thống kê người làm bài
        </h1>
        <p className="mt-2 text-slate-500">
          Theo dõi số người tham gia và số lượt làm theo từng bài kiểm tra.
        </p>

        {stats ? (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">Tổng số bài thi</p>
              <p className="mt-1 text-2xl font-bold text-slate-800">
                {stats.summary.totalExams}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">Tổng số người tham gia</p>
              <p className="mt-1 text-2xl font-bold text-slate-800">
                {stats.summary.totalParticipants}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">Tổng số lượt làm</p>
              <p className="mt-1 text-2xl font-bold text-slate-800">
                {stats.summary.totalAttempts}
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

      {stats && stats.items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
          Bạn chưa có bài thi nào để thống kê.
        </div>
      ) : null}

      {stats && stats.items.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 overflow-x-auto">
          <table className="min-w-full text-sm text-left text-slate-700">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="px-3 py-3 font-semibold">Bài thi</th>
                <th className="px-3 py-3 font-semibold">Người làm</th>
                <th className="px-3 py-3 font-semibold">Số lượt làm</th>
                <th className="px-3 py-3 font-semibold">Điểm TB</th>
                <th className="px-3 py-3 font-semibold">Điểm cao nhất</th>
                <th className="px-3 py-3 font-semibold">Lần nộp gần nhất</th>
                <th className="px-3 py-3 font-semibold">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {stats.items.map((item) => (
                <tr key={item.examId} className="border-b border-slate-100">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-slate-800">
                      {item.examTitle}
                    </p>
                    <p className="text-xs text-slate-500">
                      Mã: {item.examCode}
                    </p>
                  </td>
                  <td className="px-3 py-3">{item.participantCount}</td>
                  <td className="px-3 py-3">{item.attemptCount}</td>
                  <td className="px-3 py-3">{item.averageScore}</td>
                  <td className="px-3 py-3">{item.highestScore}</td>
                  <td className="px-3 py-3">
                    {formatDateTime(item.lastSubmittedAt)}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/exam/${item.examCode}`}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                      Mở bài thi
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
