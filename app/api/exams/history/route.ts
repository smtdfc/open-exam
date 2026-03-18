import { db } from "@/db";
import { examAttempts, exams } from "@/db/schema";
import { getServerSession } from "@/lib/session";
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "Bạn chưa đăng nhập." },
      { status: 401 },
    );
  }

  const attemptRows = await db
    .select({
      id: examAttempts.id,
      examId: examAttempts.examId,
      score: examAttempts.score,
      submittedAt: examAttempts.submittedAt,
    })
    .from(examAttempts)
    .where(
      and(
        eq(examAttempts.userId, session.user.id),
        isNotNull(examAttempts.submittedAt),
      ),
    )
    .orderBy(desc(examAttempts.submittedAt));

  if (attemptRows.length === 0) {
    return NextResponse.json({
      summary: {
        totalAttempts: 0,
        joinedExamCount: 0,
        averageScore: 0,
      },
      items: [],
    });
  }

  const examIds = Array.from(
    new Set(attemptRows.map((attempt) => attempt.examId)),
  );

  const examRows = await db
    .select({
      id: exams.id,
      code: exams.code,
      title: exams.title,
      maxAttempts: exams.maxAttempts,
      allowResultReview: exams.allowResultReview,
      allowScoreView: exams.allowResultReview,
      creatorId: exams.creatorId,
    })
    .from(exams)
    .where(inArray(exams.id, examIds));

  const examById = new Map(examRows.map((exam) => [exam.id, exam]));
  const latestAttemptByExam = new Map<string, string>();
  const attemptCounterByExam = new Map<string, number>();

  for (const attempt of attemptRows) {
    if (!latestAttemptByExam.has(attempt.examId)) {
      latestAttemptByExam.set(attempt.examId, attempt.id);
    }

    const current = attemptCounterByExam.get(attempt.examId) ?? 0;
    attemptCounterByExam.set(attempt.examId, current + 1);
  }

  const items = attemptRows
    .map((attempt) => {
      const exam = examById.get(attempt.examId);
      if (!exam) {
        return null;
      }

      const latestAttemptId = latestAttemptByExam.get(attempt.examId);
      const canOpen = exam.allowResultReview || latestAttemptId === attempt.id;

      return {
        id: attempt.id,
        examId: attempt.examId,
        examCode: exam.code,
        examTitle: exam.title,
        maxAttempts: exam.maxAttempts,
        allowResultReview: exam.allowResultReview,
        allowScoreView: exam.allowScoreView,
        isOwner: exam.creatorId === session.user.id,
        score: exam.allowScoreView ? Number(attempt.score ?? 0) : null,
        submittedAt: attempt.submittedAt,
        isLatest: latestAttemptId === attempt.id,
        attemptsUsed: attemptCounterByExam.get(attempt.examId) ?? 0,
        canOpen,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const visibleScoreItems = items.filter((item) => item.score !== null);
  const averageScore =
    visibleScoreItems.length > 0
      ? Math.round(
          (visibleScoreItems.reduce((sum, item) => sum + (item.score ?? 0), 0) /
            visibleScoreItems.length) *
            100,
        ) / 100
      : null;

  return NextResponse.json({
    summary: {
      totalAttempts: items.length,
      joinedExamCount: examIds.length,
      averageScore,
    },
    items,
  });
}
