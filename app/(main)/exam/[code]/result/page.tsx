"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ResultPayload = {
  exam: {
    id: string;
    title: string;
    code: string;
    maxAttempts: number;
    allowResultReview: boolean;
    allowScoreView: boolean;
  };
  attempt: {
    id: string;
    score: number | null;
    submittedAt: string;
    isLatest: boolean;
    index: number;
    attemptsUsed: number;
    remainingAttempts: number | null;
    canRetry: boolean;
    isAutoSubmitted: boolean;
    submissionReason: string | null;
    tabSwitchCount: number;
    fullscreenExitCount: number;
  };
  totalPoints: number;
  reviewQuestions: Array<{
    id: string;
    type: "multiple-choice" | "essay";
    prompt: string;
    points: number;
    isCorrect: boolean | null;
    pointsAwarded: number;
    selectedOptionId: string | null;
    selectedOptionContent: string | null;
    correctOptionId: string | null;
    correctOptionContent: string | null;
    essayAnswer: string | null;
    correctEssay: string | null;
  }>;
  attemptHistory: Array<{
    id: string;
    index: number;
    score: number | null;
    submittedAt: string;
    isLatest: boolean;
    canOpen: boolean;
    isAutoSubmitted: boolean;
    submissionReason: string | null;
    tabSwitchCount: number;
    fullscreenExitCount: number;
  }>;
};

export default function ExamResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ attemptId?: string }>;
}) {
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadResult = async () => {
      try {
        const resolvedParams = await params;
        const resolvedSearchParams = await searchParams;
        const code = resolvedParams.code.trim().toUpperCase();
        const attemptId = resolvedSearchParams.attemptId?.trim();

        const query = attemptId
          ? `?attemptId=${encodeURIComponent(attemptId)}`
          : "";

        const response = await fetch(`/api/exams/${code}/submit${query}`);
        const data = (await response.json()) as
          | ResultPayload
          | { message?: string };

        if (!response.ok) {
          const message =
            "message" in data ? data.message : "Không thể tải kết quả.";
          setErrorMessage(message || "Không thể tải kết quả.");
          return;
        }

        setResult(data as ResultPayload);
      } catch {
        setErrorMessage("Không thể kết nối đến máy chủ.");
      } finally {
        setLoading(false);
      }
    };

    void loadResult();
  }, [params, searchParams]);

  if (loading) {
    return <div className="p-6 text-slate-500">Đang tải kết quả...</div>;
  }

  if (!result) {
    return (
      <div className="p-6 space-y-4">
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {errorMessage || "Không tìm thấy kết quả."}
        </p>
        <Link
          href="/exam/join"
          className="text-sm font-semibold text-indigo-600"
        >
          Quay lại trang tham gia
        </Link>
      </div>
    );
  }

  const percent =
    result.exam.allowScoreView &&
    result.attempt.score !== null &&
    result.totalPoints > 0
      ? Math.round((result.attempt.score / result.totalPoints) * 100)
      : 0;

  const formatSubmittedAt = (submittedAt: string) => {
    const date = new Date(submittedAt);
    if (Number.isNaN(date.getTime())) {
      return "Không rõ thời gian";
    }

    return date.toLocaleString("vi-VN");
  };

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-800">Kết quả bài thi</h1>
        <p className="mt-2 text-slate-600">{result.exam.title}</p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            {result.exam.allowScoreView && result.attempt.score !== null ? (
              <>
                <p className="text-sm text-green-700">Điểm đạt được</p>
                <p className="mt-1 text-3xl font-bold text-green-800">
                  {result.attempt.score}/{result.totalPoints}
                </p>
                <p className="mt-1 text-sm text-green-700">{percent}%</p>
              </>
            ) : (
              <>
                <p className="text-sm text-amber-700">Điểm đạt được</p>
                <p className="mt-1 text-xl font-bold text-amber-800">
                  Đang ẩn theo cài đặt bài thi
                </p>
                <p className="mt-1 text-sm text-amber-700">
                  Giảng viên chưa cho phép thí sinh xem điểm.
                </p>
              </>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p>
              Lần nộp:{" "}
              <span className="font-semibold">{result.attempt.index}</span>
            </p>
            <p>
              Đã dùng:{" "}
              <span className="font-semibold">
                {result.attempt.attemptsUsed}
              </span>
              /{" "}
              {result.exam.maxAttempts === 0
                ? "Không giới hạn"
                : result.exam.maxAttempts}
            </p>
            <p>
              Còn lại:{" "}
              <span className="font-semibold">
                {result.attempt.remainingAttempts === null
                  ? "Không giới hạn"
                  : result.attempt.remainingAttempts}
              </span>
            </p>
          </div>
        </div>

        {!result.exam.allowResultReview ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Bài thi này không cho phép xem lại các kết quả cũ.
          </p>
        ) : null}

        {result.attempt.isAutoSubmitted ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Bài thi đã được tự động nộp do phát hiện gian lận.
            {result.attempt.submissionReason
              ? ` Lý do: ${result.attempt.submissionReason}.`
              : ""}{" "}
            Chuyển tab: {result.attempt.tabSwitchCount}, thoát toàn màn hình:{" "}
            {result.attempt.fullscreenExitCount}.
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/exam/${result.exam.code}`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Về trang làm bài
          </Link>

          {result.attempt.canRetry ? (
            <Link
              href={`/exam/${result.exam.code}`}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Thử lại
            </Link>
          ) : (
            <p className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-500">
              Đã hết lượt thử lại
            </p>
          )}

          {result.exam.allowResultReview && result.attempt.isLatest ? (
            <Link
              href={`/exam/${result.exam.code}/result?attemptId=${result.attempt.id}`}
              className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              Xem lại kết quả này
            </Link>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-800">Xem lại bài làm</h2>
        <p className="mt-2 text-sm text-slate-600">
          Đánh dấu câu đúng/sai dựa trên đáp án đã nộp của bạn.
        </p>

        <div className="mt-5 space-y-4">
          {result.reviewQuestions.map((question, index) => {
            const statusClass =
              question.isCorrect === true
                ? "border-green-200 bg-green-50 text-green-700"
                : question.isCorrect === false
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-slate-200 bg-slate-50 text-slate-700";

            return (
              <div
                key={question.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-800">
                    Câu {index + 1}: {question.prompt}
                  </p>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}
                  >
                    {question.isCorrect === true
                      ? "Đúng"
                      : question.isCorrect === false
                        ? "Sai"
                        : "Chưa chấm"}
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-600">
                  Điểm: {question.pointsAwarded}/{question.points}
                </p>

                {question.type === "multiple-choice" ? (
                  <div className="mt-3 space-y-1 text-sm">
                    <p className="text-slate-700">
                      Đáp án bạn chọn:{" "}
                      <span className="font-medium text-slate-900">
                        {question.selectedOptionContent || "(Chưa chọn)"}
                      </span>
                    </p>
                    <p className="text-slate-700">
                      Đáp án đúng:{" "}
                      <span className="font-medium text-green-700">
                        {question.correctOptionContent || "(Không có)"}
                      </span>
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="text-slate-700">
                      Bài làm của bạn:
                      <span className="ml-2 font-medium text-slate-900">
                        {question.essayAnswer || "(Chưa trả lời)"}
                      </span>
                    </p>
                    {question.correctEssay ? (
                      <p className="text-slate-700">
                        Gợi ý đáp án:
                        <span className="ml-2 font-medium text-green-700">
                          {question.correctEssay}
                        </span>
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-800">Lịch sử làm bài</h2>
        <p className="mt-2 text-sm text-slate-600">
          Các lần nộp gần đây của bạn cho bài thi này.
        </p>

        <div className="mt-5 space-y-3">
          {result.attemptHistory.map((item) => {
            const itemPercent =
              result.exam.allowScoreView &&
              item.score !== null &&
              result.totalPoints > 0
                ? Math.round((item.score / result.totalPoints) * 100)
                : 0;

            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Lần nộp {item.index}
                    {item.isLatest ? " (Mới nhất)" : ""}
                  </p>
                  <p className="text-sm text-slate-600">
                    Thời gian: {formatSubmittedAt(item.submittedAt)}
                  </p>
                  <p className="text-sm text-slate-600">
                    Điểm:{" "}
                    {result.exam.allowScoreView && item.score !== null
                      ? `${item.score}/${result.totalPoints} (${itemPercent}%)`
                      : "Đang ẩn"}
                  </p>
                  {item.isAutoSubmitted ? (
                    <p className="text-xs text-red-600">
                      Tự nộp do gian lận
                      {item.submissionReason
                        ? `: ${item.submissionReason}`
                        : ""}
                    </p>
                  ) : null}
                </div>

                {item.canOpen ? (
                  <Link
                    href={`/exam/${result.exam.code}/result?attemptId=${item.id}`}
                    className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                  >
                    Xem lần này
                  </Link>
                ) : (
                  <p className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-500">
                    Không thể mở lại
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
