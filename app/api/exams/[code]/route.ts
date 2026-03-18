import { db } from "@/db";
import {
  examAnswers,
  examAttempts,
  examOptions,
  examQuestions,
  exams,
} from "@/db/schema";
import { getServerSession } from "@/lib/session";
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

type ExamQuestionResponse = {
  id: string;
  type: string;
  prompt: string;
  points: number;
  sortOrder: number;
  options: Array<{ id: string; content: string; sortOrder: number }>;
};

export async function GET(
  _request: Request,
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
      code: exams.code,
      title: exams.title,
      description: exams.description,
      durationMinutes: exams.durationMinutes,
      maxAttempts: exams.maxAttempts,
      allowResultReview: exams.allowResultReview,
      isMonitored: exams.isMonitored,
      recordBehavior: exams.recordBehavior,
      createdAt: exams.createdAt,
      expiresAt: exams.expiresAt,
      creatorId: exams.creatorId,
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

  const questionRows = await db
    .select({
      id: examQuestions.id,
      type: examQuestions.type,
      prompt: examQuestions.prompt,
      points: examQuestions.points,
      sortOrder: examQuestions.sortOrder,
    })
    .from(examQuestions)
    .where(eq(examQuestions.examId, exam.id));

  const questionIds = questionRows.map((question) => question.id);
  const optionRows =
    questionIds.length > 0
      ? await db
          .select({
            id: examOptions.id,
            questionId: examOptions.questionId,
            content: examOptions.content,
            sortOrder: examOptions.sortOrder,
          })
          .from(examOptions)
          .where(inArray(examOptions.questionId, questionIds))
      : [];

  const questionMap = new Map<string, ExamQuestionResponse>();
  for (const question of questionRows) {
    questionMap.set(question.id, {
      ...question,
      options: [],
    });
  }

  for (const option of optionRows) {
    const item = questionMap.get(option.questionId);
    if (item) {
      item.options.push({
        id: option.id,
        content: option.content,
        sortOrder: option.sortOrder,
      });
    }
  }

  const questions = Array.from(questionMap.values())
    .map((question) => ({
      ...question,
      options: question.options.sort((a, b) => a.sortOrder - b.sortOrder),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const attemptCondition = and(
    eq(examAttempts.examId, exam.id),
    eq(examAttempts.userId, session.user.id),
    isNotNull(examAttempts.submittedAt),
  );

  const attemptCountRows = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(examAttempts)
    .where(attemptCondition);

  const latestAttemptRows = await db
    .select({
      id: examAttempts.id,
      score: examAttempts.score,
      submittedAt: examAttempts.submittedAt,
    })
    .from(examAttempts)
    .where(attemptCondition)
    .orderBy(desc(examAttempts.submittedAt))
    .limit(1);

  const participantCountRows = await db
    .select({
      count: sql<number>`count(distinct ${examAttempts.userId})`,
    })
    .from(examAttempts)
    .where(
      and(
        eq(examAttempts.examId, exam.id),
        isNotNull(examAttempts.submittedAt),
      ),
    );

  const attemptsUsed = Number(attemptCountRows[0]?.count ?? 0);
  const hasUnlimitedAttempts = exam.maxAttempts === 0;
  const remainingAttempts = hasUnlimitedAttempts
    ? null
    : Math.max(0, exam.maxAttempts - attemptsUsed);
  const latestAttempt = latestAttemptRows[0] ?? null;
  const participantCount = Number(participantCountRows[0]?.count ?? 0);

  return NextResponse.json({
    exam: {
      ...exam,
      participantCount,
      questions,
      viewer: {
        attemptsUsed,
        remainingAttempts,
        canRetry: hasUnlimitedAttempts || remainingAttempts > 0,
        latestAttemptId: latestAttempt?.id ?? null,
        latestScore: latestAttempt?.score ?? null,
        canReviewResult: exam.allowResultReview,
      },
    },
  });
}

export async function DELETE(
  _request: Request,
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
    .select({ id: exams.id, creatorId: exams.creatorId })
    .from(exams)
    .where(
      and(eq(exams.code, normalizedCode), eq(exams.creatorId, session.user.id)),
    )
    .limit(1);

  if (!examRows[0]) {
    return NextResponse.json(
      { message: "Không tìm thấy bài thi." },
      { status: 404 },
    );
  }

  const examId = examRows[0].id;

  await db.transaction(async (tx) => {
    const attemptRows = await tx
      .select({ id: examAttempts.id })
      .from(examAttempts)
      .where(eq(examAttempts.examId, examId));

    const attemptIds = attemptRows.map((attempt) => attempt.id);
    if (attemptIds.length > 0) {
      await tx
        .delete(examAnswers)
        .where(inArray(examAnswers.attemptId, attemptIds));
      await tx.delete(examAttempts).where(inArray(examAttempts.id, attemptIds));
    }

    const questionRows = await tx
      .select({ id: examQuestions.id })
      .from(examQuestions)
      .where(eq(examQuestions.examId, examId));

    const questionIds = questionRows.map((question) => question.id);
    if (questionIds.length > 0) {
      await tx
        .delete(examOptions)
        .where(inArray(examOptions.questionId, questionIds));
      await tx
        .delete(examQuestions)
        .where(inArray(examQuestions.id, questionIds));
    }

    await tx.delete(exams).where(eq(exams.id, examId));
  });

  return NextResponse.json({ message: "Đã xóa bài thi." });
}
