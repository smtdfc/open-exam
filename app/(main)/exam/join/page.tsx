"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, GraduationCap } from "lucide-react";

export default function ExamJoinPage() {
  const [examCode, setExamCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  const handleJoin = (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage("");

    if (!examCode.trim()) {
      setErrorMessage("Vui lòng nhập mã bài thi.");
      return;
    }

    router.push(`/exam/${examCode.trim().toUpperCase()}`);
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-6">
      <div className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <GraduationCap size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            Tham gia bài thi
          </h1>
          <p className="mt-2 text-slate-500">Nhập mã đề thi để bắt đầu</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div className="relative flex items-center">
            <Search className="absolute left-4 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Ví dụ: MATH26"
              value={examCode}
              onChange={(e) => setExamCode(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-100 py-4 pl-12 pr-4 text-lg font-medium tracking-wide outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 uppercase placeholder:normal-case"
              required
            />
          </div>

          {errorMessage ? (
            <p className="text-sm font-medium text-red-600">{errorMessage}</p>
          ) : null}

          <button
            type="submit"
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-4 text-lg font-semibold text-white transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-[0.98]"
          >
            Vào bài thi
            <ArrowRight
              size={20}
              className="transition-transform group-hover:translate-x-1"
            />
          </button>
        </form>
      </div>
    </div>
  );
}
