"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type DashboardStats = {
  total: number;
  active: number;
  participants: number;
};

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    active: 0,
    participants: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const response = await fetch("/api/exams?scope=mine");
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as {
        exams: Array<{ expiresAt: string | null; participantCount?: number }>;
      };

      const now = Date.now();
      const active = data.exams.filter((exam) => {
        if (!exam.expiresAt) {
          return true;
        }

        return new Date(exam.expiresAt).getTime() >= now;
      }).length;

      const participants = data.exams.reduce(
        (sum, exam) => sum + Number(exam.participantCount ?? 0),
        0,
      );

      setStats({ total: data.exams.length, active, participants });
    };

    void fetchStats();
  }, []);

  return (
    <div className="p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Dashboard Open Exam
          </h1>
          <p className="mt-2 text-slate-500">
            Quản lý đề thi, phát mã thi và theo dõi tiến độ làm bài.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Tổng bài thi</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">
              {stats.total}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Bài thi đang mở</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">
              {stats.active}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Tổng lượt người đã làm</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">
              {stats.participants}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/exam/add"
            className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 transition hover:bg-indigo-100"
          >
            <h2 className="text-lg font-semibold text-indigo-800">
              Tạo bài kiểm tra
            </h2>
            <p className="mt-2 text-sm text-indigo-700">
              Tạo câu hỏi trắc nghiệm/tự luận, đặt thời gian và hạn nộp.
            </p>
          </Link>

          <Link
            href="/exam/start"
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:bg-slate-50"
          >
            <h2 className="text-lg font-semibold text-slate-800">
              Danh sách bài thi
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Xem tất cả bài thi bạn đã tạo và mã tham gia tương ứng.
            </p>
          </Link>

          <Link
            href="/exam/join"
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:bg-slate-50"
          >
            <h2 className="text-lg font-semibold text-slate-800">
              Tham gia bài thi
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Nhập mã bài thi để vào giao diện làm bài.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
