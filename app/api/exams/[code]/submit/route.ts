import { db } from "@/db";
import {
  examAnswers,
  examAttempts,
  examOptions,
  examQuestions,
  exams,
} from "@/db/schema";
import { getServerSession } from "@/lib/session";
import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

type SubmitRequest = {
  answers: Array<{
    questionId: string;
    selectedOptionId?: string;
    essayText?: string;
  }>;
  monitoring?: {
    tabSwitchCount?: number;
    fullscreenExitCount?: number;
    isAutoSubmitted?: boolean;
    submissionReason?: string;
  };
};

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "Bạn chưa đăng nhập." },
      { status: 401 },
    );
  }

  const { code } = await context.params;
  const normalizedCode = code.trim().toUpperCase();

  const examRows = await db
    .select({
      id: exams.id,
      title: exams.title,
      maxAttempts: exams.maxAttempts,
      allowResultReview: exams.allowResultReview,
      allowScoreView: exams.allowResultReview,
      expiresAt: exams.expiresAt,
    })
    .from(exams)
    .where(eq(exams.code, normalizedCode))
    .limit(1);

  const exam = examRows[0];
  if (!exam) {
    return NextResponse.json(
      { message: "Không tìm thấy bài thi." },
      { status: 404 },
    );
  }

  if (exam.expiresAt && new Date(exam.expiresAt).getTime() < Date.now()) {
    return NextResponse.json(
      { message: "Bài thi đã hết hạn." },
      { status: 410 },
    );
  }

  const submittedCountRows = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(examAttempts)
    .where(
      and(
        eq(examAttempts.examId, exam.id),
        eq(examAttempts.userId, session.user.id),
        isNotNull(examAttempts.submittedAt),
      ),
    );

  const submittedCount = Number(submittedCountRows[0]?.count ?? 0);
  const hasUnlimitedAttempts = exam.maxAttempts === 0;
  if (!hasUnlimitedAttempts && submittedCount >= exam.maxAttempts) {
    return NextResponse.json(
      { message: "Bạn đã dùng hết số lần làm bài." },
      { status: 403 },
    );
  }

  const body = (await request.json()) as SubmitRequest;
  if (!Array.isArray(body.answers)) {
    return NextResponse.json(
      { message: "Dữ liệu gửi lên không hợp lệ." },
      { status: 400 },
    );
  }

  const tabSwitchCount = Math.max(
    0,
    Math.floor(Number(body.monitoring?.tabSwitchCount ?? 0) || 0),
  );
  const fullscreenExitCount = Math.max(
    0,
    Math.floor(Number(body.monitoring?.fullscreenExitCount ?? 0) || 0),
  );
  const isAutoSubmitted = Boolean(body.monitoring?.isAutoSubmitted);
  const submissionReason = body.monitoring?.submissionReason?.trim() || null;

  const questionOptionRows = await db
    .select({
      questionId: examQuestions.id,
      questionType: examQuestions.type,
      questionPoints: examQuestions.points,
      optionId: examOptions.id,
      optionQuestionId: examOptions.questionId,
      optionIsCorrect: examOptions.isCorrect,
    })
    .from(examQuestions)
    .leftJoin(examOptions, eq(examOptions.questionId, examQuestions.id))
    .where(eq(examQuestions.examId, exam.id));

  const questionMap = new Map<
    string,
    { id: string; type: string; points: number }
  >();
  const optionMap = new Map<
    string,
    { id: string; questionId: string; isCorrect: boolean }
  >();

  for (const row of questionOptionRows) {
    if (!questionMap.has(row.questionId)) {
      questionMap.set(row.questionId, {
        id: row.questionId,
        type: row.questionType,
        points: row.questionPoints,
      });
    }

    if (row.optionId && row.optionQuestionId) {
      optionMap.set(row.optionId, {
        id: row.optionId,
        questionId: row.optionQuestionId,
        isCorrect: Boolean(row.optionIsCorrect),
      });
    }
  }

  const questionRows = Array.from(questionMap.values());

  const answerMap = new Map(
    body.answers.map((item) => [item.questionId, item]),
  );
  let score = 0;
  const attemptId = randomUUID();
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(examAttempts).values({
      id: attemptId,
      examId: exam.id,
      userId: session.user.id,
      score: 0,
      tabSwitchCount,
      fullscreenExitCount,
      isAutoSubmitted,
      submissionReason,
      startedAt: now,
      submittedAt: now,
    });

    for (const question of questionRows) {
      const picked = answerMap.get(question.id);
      const answerId = randomUUID();

      if (question.type === "multiple-choice") {
        const selectedOption = picked?.selectedOptionId
          ? optionMap.get(picked.selectedOptionId)
          : undefined;
        const isCorrect =
          Boolean(selectedOption?.isCorrect) &&
          selectedOption?.questionId === question.id;
        const awarded = isCorrect ? question.points : 0;
        score += awarded;

        await tx.insert(examAnswers).values({
          id: answerId,
          attemptId,
          questionId: question.id,
          selectedOptionId: selectedOption?.id || null,
          essayText: null,
          isCorrect,
          pointsAwarded: awarded,
        });

        continue;
      }

      await tx.insert(examAnswers).values({
        id: answerId,
        attemptId,
        questionId: question.id,
        selectedOptionId: null,
        essayText: picked?.essayText?.trim() || null,
        isCorrect: null,
        pointsAwarded: 0,
      });
    }

    await tx
      .update(examAttempts)
      .set({ score, submittedAt: now })
      .where(eq(examAttempts.id, attemptId));
  });

  const attemptsUsed = submittedCount + 1;
  const remainingAttempts = hasUnlimitedAttempts
    ? null
    : Math.max(0, exam.maxAttempts - attemptsUsed);

  return NextResponse.json({
    message: isAutoSubmitted
      ? "Bài thi đã được tự động nộp do phát hiện gian lận."
      : "Nộp bài thành công.",
    score: exam.allowScoreView ? score : null,
    attemptId,
    attemptsUsed,
    remainingAttempts,
    canRetry: hasUnlimitedAttempts || remainingAttempts! > 0,
    canViewScore: exam.allowScoreView,
    canReviewResult: exam.allowResultReview,
    isAutoSubmitted,
    submissionReason,
    tabSwitchCount,
    fullscreenExitCount,
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "Bạn chưa đăng nhập." },
      { status: 401 },
    );
  }

  const { code } = await context.params;
  const normalizedCode = code.trim().toUpperCase();

  const examRows = await db
    .select({
      id: exams.id,
      title: exams.title,
      code: exams.code,
      maxAttempts: exams.maxAttempts,
      allowResultReview: exams.allowResultReview,
      allowScoreView: exams.allowResultReview,
    })
    .from(exams)
    .where(eq(exams.code, normalizedCode))
    .limit(1);

  const exam = examRows[0];
  if (!exam) {
    return NextResponse.json(
      { message: "Không tìm thấy bài thi." },
      { status: 404 },
    );
  }

  const attemptRows = await db
    .select({
      id: examAttempts.id,
      score: examAttempts.score,
      submittedAt: examAttempts.submittedAt,
      tabSwitchCount: examAttempts.tabSwitchCount,
      fullscreenExitCount: examAttempts.fullscreenExitCount,
      isAutoSubmitted: examAttempts.isAutoSubmitted,
      submissionReason: examAttempts.submissionReason,
    })
    .from(examAttempts)
    .where(
      and(
        eq(examAttempts.examId, exam.id),
        eq(examAttempts.userId, session.user.id),
        isNotNull(examAttempts.submittedAt),
      ),
    )
    .orderBy(desc(examAttempts.submittedAt));

  if (attemptRows.length === 0) {
    return NextResponse.json(
      { message: "Bạn chưa có kết quả cho bài thi này." },
      { status: 404 },
    );
  }

  const requestUrl = new URL(request.url);
  const attemptId = requestUrl.searchParams.get("attemptId")?.trim();
  const latestAttempt = attemptRows[0];

  let attempt = latestAttempt;
  if (attemptId) {
    const matched = attemptRows.find((item) => item.id === attemptId);
    if (!matched) {
      return NextResponse.json(
        { message: "Không tìm thấy lần nộp bài này." },
        { status: 404 },
      );
    }

    if (!exam.allowResultReview && matched.id !== latestAttempt.id) {
      return NextResponse.json(
        { message: "Bài thi này không cho phép xem lại kết quả cũ." },
        { status: 403 },
      );
    }

    attempt = matched;
  }

  const reviewRows = await db
    .select({
      questionId: examQuestions.id,
      questionType: examQuestions.type,
      questionPrompt: examQuestions.prompt,
      questionPoints: examQuestions.points,
      questionSortOrder: examQuestions.sortOrder,
      questionCorrectText: examQuestions.correctText,
      optionId: examOptions.id,
      optionQuestionId: examOptions.questionId,
      optionContent: examOptions.content,
      optionIsCorrect: examOptions.isCorrect,
      optionSortOrder: examOptions.sortOrder,
      answerQuestionId: examAnswers.questionId,
      answerSelectedOptionId: examAnswers.selectedOptionId,
      answerEssayText: examAnswers.essayText,
      answerIsCorrect: examAnswers.isCorrect,
      answerPointsAwarded: examAnswers.pointsAwarded,
    })
    .from(examQuestions)
    .leftJoin(examOptions, eq(examOptions.questionId, examQuestions.id))
    .leftJoin(
      examAnswers,
      and(
        eq(examAnswers.questionId, examQuestions.id),
        eq(examAnswers.attemptId, attempt.id),
      ),
    )
    .where(eq(examQuestions.examId, exam.id))
    .orderBy(asc(examQuestions.sortOrder), asc(examOptions.sortOrder));

  const reviewQuestionMap = new Map<
    string,
    {
      id: string;
      type: string;
      prompt: string;
      points: number;
      sortOrder: number;
      correctEssay: string | null;
      isCorrect: boolean | null;
      pointsAwarded: number;
      selectedOptionId: string | null;
      essayAnswer: string | null;
      options: Array<{
        id: string;
        questionId: string;
        content: string;
        isCorrect: boolean;
        sortOrder: number;
      }>;
    }
  >();

  for (const row of reviewRows) {
    if (!reviewQuestionMap.has(row.questionId)) {
      reviewQuestionMap.set(row.questionId, {
        id: row.questionId,
        type: row.questionType,
        prompt: row.questionPrompt,
        points: row.questionPoints,
        sortOrder: row.questionSortOrder,
        correctEssay: row.questionCorrectText,
        isCorrect: row.answerIsCorrect,
        pointsAwarded: Number(row.answerPointsAwarded ?? 0),
        selectedOptionId: row.answerSelectedOptionId,
        essayAnswer: row.answerEssayText,
        options: [],
      });
    }

    const current = reviewQuestionMap.get(row.questionId);
    if (
      current &&
      row.optionId &&
      row.optionQuestionId &&
      row.optionContent !== null
    ) {
      current.options.push({
        id: row.optionId,
        questionId: row.optionQuestionId,
        content: row.optionContent,
        isCorrect: Boolean(row.optionIsCorrect),
        sortOrder: row.optionSortOrder ?? 0,
      });
    }
  }

  const reviewQuestions = Array.from(reviewQuestionMap.values()).map(
    (question) => {
      const selectedOption = question.selectedOptionId
        ? question.options.find(
            (option) => option.id === question.selectedOptionId,
          )
        : null;
      const correctOption =
        question.options.find((option) => option.isCorrect) ?? null;

      return {
        id: question.id,
        type: question.type,
        prompt: question.prompt,
        points: question.points,
        sortOrder: question.sortOrder,
        isCorrect: question.isCorrect,
        pointsAwarded: question.pointsAwarded,
        selectedOptionId: question.selectedOptionId,
        selectedOptionContent: selectedOption?.content ?? null,
        correctOptionId: correctOption?.id ?? null,
        correctOptionContent: correctOption?.content ?? null,
        essayAnswer: question.essayAnswer,
        correctEssay: question.correctEssay,
      };
    },
  );

  const totalPoints = reviewQuestions.reduce(
    (sum, question) => sum + question.points,
    0,
  );

  const attemptsUsed = attemptRows.length;
  const hasUnlimitedAttempts = exam.maxAttempts === 0;
  const remainingAttempts = hasUnlimitedAttempts
    ? null
    : Math.max(0, exam.maxAttempts - attemptsUsed);
  const attemptHistory = attemptRows.map((row, idx) => {
    const isLatest = row.id === latestAttempt.id;
    const index = idx + 1;
    return {
      id: row.id,
      index,
      score: exam.allowScoreView ? Number(row.score ?? 0) : null,
      submittedAt: row.submittedAt,
      isLatest,
      canOpen: exam.allowResultReview || isLatest,
      isAutoSubmitted: Boolean(row.isAutoSubmitted),
      submissionReason: row.submissionReason,
      tabSwitchCount: Number(row.tabSwitchCount ?? 0),
      fullscreenExitCount: Number(row.fullscreenExitCount ?? 0),
    };
  });

  return NextResponse.json({
    exam: {
      id: exam.id,
      title: exam.title,
      code: exam.code,
      maxAttempts: exam.maxAttempts,
      allowResultReview: exam.allowResultReview,
      allowScoreView: exam.allowScoreView,
    },
    attempt: {
      id: attempt.id,
      score: exam.allowScoreView ? Number(attempt.score ?? 0) : null,
      submittedAt: attempt.submittedAt,
      isLatest: attempt.id === latestAttempt.id,
      index: attemptRows.findIndex((item) => item.id === attempt.id) + 1,
      attemptsUsed,
      remainingAttempts,
      canRetry: hasUnlimitedAttempts || (remainingAttempts ?? 0) > 0,
      isAutoSubmitted: Boolean(attempt.isAutoSubmitted),
      submissionReason: attempt.submissionReason,
      tabSwitchCount: Number(attempt.tabSwitchCount ?? 0),
      fullscreenExitCount: Number(attempt.fullscreenExitCount ?? 0),
    },
    totalPoints,
    reviewQuestions,
    attemptHistory,
  });
}
