"use client";

import { formatDuration } from "@/lib/exam";
import PageLoading from "@/components/ui/page-loading";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const MIN_CONSECUTIVE_VIOLATIONS_FOR_AUTOSUBMIT = 3;

type Option = {
  id: string;
  content: string;
  sortOrder: number;
};

type Question = {
  id: string;
  type: "multiple-choice" | "essay";
  prompt: string;
  points: number;
  sortOrder: number;
  options: Option[];
};

type ExamPayload = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  maxAttempts: number;
  isMonitored: boolean;
  recordBehavior: boolean;
  createdAt: string;
  expiresAt: string | null;
  creatorId: string;
  participantCount: number;
  questions: Question[];
  viewer: {
    attemptsUsed: number;
    remainingAttempts: number | null;
    canRetry: boolean;
    latestAttemptId: string | null;
    latestScore: number | null;
    canReviewResult: boolean;
    isOwner: boolean;
    canEditQuestions: boolean;
  };
};

export default function ExamByCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [exam, setExam] = useState<ExamPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [fullscreenExitCount, setFullscreenExitCount] = useState(0);
  const [violationStreak, setViolationStreak] = useState(0);
  const [strictNotice, setStrictNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const monitoringRef = useRef({ tabSwitchCount: 0, fullscreenExitCount: 0 });
  const violationStreakRef = useRef(0);
  const autoSubmitTriggeredRef = useRef(false);

  useEffect(() => {
    const loadExam = async () => {
      try {
        const resolved = await params;
        const normalizedCode = resolved.code.trim().toUpperCase();
        setCode(normalizedCode);

        const response = await fetch(`/api/exams/${normalizedCode}`);
        const data = await response.json();

        if (!response.ok) {
          setErrorMessage(data.message || "Không tìm thấy bài thi.");
          return;
        }

        setExam(data.exam as ExamPayload);
      } catch {
        setErrorMessage("Không thể tải thông tin bài thi.");
      } finally {
        setLoading(false);
      }
    };

    void loadExam();
  }, [params]);

  const totalPoints = useMemo(() => {
    if (!exam) {
      return 0;
    }

    return exam.questions.reduce((sum, question) => sum + question.points, 0);
  }, [exam]);

  const handleSubmit = async (options?: {
    isAutoSubmitted?: boolean;
    submissionReason?: string;
  }) => {
    if (!exam) {
      return;
    }

    const isAutoSubmitted = Boolean(options?.isAutoSubmitted);
    const submissionReason = options?.submissionReason?.trim();

    setSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        answers: exam.questions.map((question) => {
          const value = answers[question.id] || "";

          if (question.type === "multiple-choice") {
            return {
              questionId: question.id,
              selectedOptionId: value || undefined,
            };
          }

          return {
            questionId: question.id,
            essayText: value,
          };
        }),
        monitoring: {
          tabSwitchCount: monitoringRef.current.tabSwitchCount,
          fullscreenExitCount: monitoringRef.current.fullscreenExitCount,
          isAutoSubmitted,
          submissionReason,
        },
      };

      const response = await fetch(`/api/exams/${code}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.message || "Nộp bài thất bại.");
        if (isAutoSubmitted) {
          autoSubmitTriggeredRef.current = false;
        }
        return;
      }

      const attemptId = String(data.attemptId || "").trim();
      if (!attemptId) {
        setErrorMessage("Không nhận được mã kết quả sau khi nộp bài.");
        return;
      }

      router.push(`/exam/${code}/result?attemptId=${attemptId}`);
    } catch {
      setErrorMessage("Không thể kết nối đến máy chủ.");
      if (isAutoSubmitted) {
        autoSubmitTriggeredRef.current = false;
      }
    } finally {
      setSubmitting(false);
    }
  };

  const triggerAutoSubmit = (reason: string) => {
    if (
      autoSubmitTriggeredRef.current ||
      submitting ||
      !exam?.viewer.canRetry
    ) {
      return;
    }

    autoSubmitTriggeredRef.current = true;
    setErrorMessage(
      `Phát hiện gian lận: ${reason}. Hệ thống đang tự động nộp bài.`,
    );
    void handleSubmit({ isAutoSubmitted: true, submissionReason: reason });
  };

  const registerViolation = (reason: string) => {
    const nextStreak = violationStreakRef.current + 1;
    violationStreakRef.current = nextStreak;
    setViolationStreak(nextStreak);

    if (nextStreak >= MIN_CONSECUTIVE_VIOLATIONS_FOR_AUTOSUBMIT) {
      triggerAutoSubmit(`${reason} (${nextStreak} lần liên tiếp)`);
      return;
    }

    setErrorMessage(
      `Cảnh báo gian lận: ${reason}. Nếu tiếp tục vi phạm, hệ thống sẽ tự nộp bài.`,
    );
  };

  const handleStartExam = async () => {
    if (!exam || !exam.viewer.canRetry) {
      return;
    }

    monitoringRef.current = { tabSwitchCount: 0, fullscreenExitCount: 0 };
    setTabSwitchCount(0);
    setFullscreenExitCount(0);
    violationStreakRef.current = 0;
    setViolationStreak(0);
    setErrorMessage("");
    setStrictNotice("");
    autoSubmitTriggeredRef.current = false;

    if (exam.isMonitored) {
      try {
        if (document.fullscreenEnabled) {
          await document.documentElement.requestFullscreen();
        } else {
        }
      } catch {}
    }

    setHasStarted(true);
  };

  useEffect(() => {
    if (
      !exam?.isMonitored ||
      !hasStarted ||
      !exam.viewer.canRetry ||
      submitting
    ) {
      return;
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        return;
      }

      const nextCount = monitoringRef.current.tabSwitchCount + 1;
      monitoringRef.current.tabSwitchCount = nextCount;
      setTabSwitchCount(nextCount);
      registerViolation("Chuyển tab hoặc rời khỏi cửa sổ làm bài");
    };

    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        return;
      }

      const nextCount = monitoringRef.current.fullscreenExitCount + 1;
      monitoringRef.current.fullscreenExitCount = nextCount;
      setFullscreenExitCount(nextCount);
      registerViolation("Thoát chế độ toàn màn hình ở chế độ nghiêm ngặt");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [exam, hasStarted, submitting]);

  if (loading) {
    return <PageLoading label="Đang tải bài thi..." compact />;
  }

  if (!exam) {
    return (
      <div className="p-6 space-y-4">
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {errorMessage || "Không tìm thấy bài thi"}
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

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-bold text-slate-800">{exam.title}</h1>
        <p className="mt-2 text-slate-500">
          {exam.description || "Không có mô tả"}
        </p>
        <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
          <p>
            Mã bài thi: <span className="font-semibold">{exam.code}</span>
          </p>
          <p>Thời gian: {formatDuration(exam.durationMinutes)}</p>
          <p>Tổng điểm: {totalPoints}</p>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Đã có <span className="font-semibold">{exam.participantCount}</span>{" "}
          người đã nộp bài.
        </p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p>
            Số lần đã nộp:{" "}
            <span className="font-semibold">{exam.viewer.attemptsUsed}</span>/{" "}
            {exam.maxAttempts === 0 ? "Không giới hạn" : exam.maxAttempts}
          </p>
          <p>
            Lượt còn lại:{" "}
            <span className="font-semibold">
              {exam.viewer.remainingAttempts === null
                ? "Không giới hạn"
                : exam.viewer.remainingAttempts}
            </span>
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {exam.viewer.latestAttemptId && exam.viewer.canReviewResult ? (
            <Link
              href={`/exam/${exam.code}/result?attemptId=${exam.viewer.latestAttemptId}`}
              className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              Xem lại kết quả gần nhất
            </Link>
          ) : null}
          {exam.viewer.latestAttemptId && !exam.viewer.canReviewResult ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
              Bài này không cho phép xem lại kết quả cũ.
            </p>
          ) : null}
          {exam.viewer.isOwner ? (
            <Link
              href={`/exam/${exam.code}/edit`}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              Sửa đề
            </Link>
          ) : null}
        </div>
      </div>

      {errorMessage ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {errorMessage}
        </p>
      ) : null}

      {!exam.viewer.canRetry ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Bạn đã hết lượt làm bài. Không thể thử lại.
        </p>
      ) : null}

      {!hasStarted ? (
        <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-6">
          <h2 className="text-xl font-bold text-indigo-800">
            Thông tin trước khi làm bài
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-indigo-900">
            <li>Tổng số câu: {exam.questions.length}</li>
            <li>Tổng điểm tối đa: {totalPoints}</li>
            <li>Thời gian làm bài: {formatDuration(exam.durationMinutes)}</li>
            <li>
              Số lượt còn lại:{" "}
              {exam.viewer.remainingAttempts === null
                ? "Không giới hạn"
                : exam.viewer.remainingAttempts}
            </li>
          </ul>
          <p className="mt-4 text-sm text-indigo-900">
            Nhấn "Bắt đầu làm bài" khi bạn đã sẵn sàng.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleStartExam()}
              disabled={!exam.viewer.canRetry}
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Bắt đầu làm bài
            </button>
            <Link
              href="/exam/join"
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Quay lại
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-4">
            {exam.questions.map((question, index) => (
              <div
                key={question.id}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <p className="text-sm font-semibold text-indigo-700">
                  Câu {index + 1} - {question.points} điểm
                </p>
                <h2 className="mt-2 text-lg font-semibold text-slate-800">
                  {question.prompt}
                </h2>

                {question.type === "multiple-choice" ? (
                  <div className="mt-4 space-y-2">
                    {question.options.map((option) => (
                      <label
                        key={option.id}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50"
                      >
                        <input
                          type="radio"
                          name={question.id}
                          disabled={!exam.viewer.canRetry || submitting}
                          checked={answers[question.id] === option.id}
                          onChange={() =>
                            setAnswers((previous) => ({
                              ...previous,
                              [question.id]: option.id,
                            }))
                          }
                        />
                        <span>{option.content}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={answers[question.id] || ""}
                    disabled={!exam.viewer.canRetry || submitting}
                    onChange={(event) =>
                      setAnswers((previous) => ({
                        ...previous,
                        [question.id]: event.target.value,
                      }))
                    }
                    className="mt-4 min-h-24 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-indigo-500 disabled:bg-slate-100"
                    placeholder="Nhập câu trả lời của bạn"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => void handleSubmit()}
              disabled={submitting || !exam.viewer.canRetry}
              className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Đang nộp..." : "Nộp bài"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
