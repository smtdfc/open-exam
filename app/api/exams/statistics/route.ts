import { db } from "@/db";
import { examAttempts, exams } from "@/db/schema";
import { getServerSession } from "@/lib/session";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "Bạn chưa đăng nhập." },
      { status: 401 },
    );
  }

  const examRows = await db
    .select({
      id: exams.id,
      code: exams.code,
      title: exams.title,
      maxAttempts: exams.maxAttempts,
      createdAt: exams.createdAt,
      allowResultReview: exams.allowResultReview,
    })
    .from(exams)
    .where(eq(exams.creatorId, session.user.id));

  if (examRows.length === 0) {
    return NextResponse.json({
      summary: {
        totalExams: 0,
        totalParticipants: 0,
        totalAttempts: 0,
      },
      items: [],
    });
  }

  const examIds = examRows.map((exam) => exam.id);

  const perExamRows = await db
    .select({
      examId: examAttempts.examId,
      participantCount: sql<number>`count(distinct ${examAttempts.userId})`,
      attemptCount: sql<number>`count(*)`,
      averageScore: sql<number>`coalesce(avg(${examAttempts.score}), 0)`,
      highestScore: sql<number>`coalesce(max(${examAttempts.score}), 0)`,
      lastSubmittedAt: sql<string | null>`max(${examAttempts.submittedAt})`,
    })
    .from(examAttempts)
    .where(
      and(
        inArray(examAttempts.examId, examIds),
        isNotNull(examAttempts.submittedAt),
      ),
    )
    .groupBy(examAttempts.examId);

  const statsByExamId = new Map(
    perExamRows.map((row) => [
      row.examId,
      {
        participantCount: Number(row.participantCount ?? 0),
        attemptCount: Number(row.attemptCount ?? 0),
        averageScore: Math.round(Number(row.averageScore ?? 0) * 100) / 100,
        highestScore: Number(row.highestScore ?? 0),
        lastSubmittedAt: row.lastSubmittedAt,
      },
    ]),
  );

  const items = examRows
    .map((exam) => {
      const stat = statsByExamId.get(exam.id);
      return {
        examId: exam.id,
        examCode: exam.code,
        examTitle: exam.title,
        maxAttempts: exam.maxAttempts,
        allowResultReview: exam.allowResultReview,
        createdAt: exam.createdAt,
        participantCount: stat?.participantCount ?? 0,
        attemptCount: stat?.attemptCount ?? 0,
        averageScore: stat?.averageScore ?? 0,
        highestScore: stat?.highestScore ?? 0,
        lastSubmittedAt: stat?.lastSubmittedAt ?? null,
      };
    })
    .sort((a, b) => b.attemptCount - a.attemptCount);

  const totalParticipants = items.reduce(
    (sum, item) => sum + item.participantCount,
    0,
  );
  const totalAttempts = items.reduce((sum, item) => sum + item.attemptCount, 0);

  return NextResponse.json({
    summary: {
      totalExams: items.length,
      totalParticipants,
      totalAttempts,
    },
    items,
  });
}
