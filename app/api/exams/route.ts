import { db } from "@/db";
import { examAttempts, examOptions, examQuestions, exams } from "@/db/schema";
import { generateExamCode } from "@/lib/exam";
import { getServerSession } from "@/lib/session";
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

type IncomingQuestion = {
  type: "multiple-choice" | "essay";
  title: string;
  answers: string[];
  correct: number | string;
  points: number;
};

type CreateExamRequest = {
  title: string;
  description?: string;
  durationMinutes: number;
  maxAttempts: number;
  allowResultReview: boolean;
  deadline?: string;
  isMonitored: boolean;
  recordBehavior: boolean;
  questions: IncomingQuestion[];
};

function normalizeQuestions(questions: IncomingQuestion[]) {
  return questions
    .map((question) => ({
      ...question,
      title: question.title.trim(),
      points: Number.isFinite(question.points) ? question.points : 0,
      answers: Array.isArray(question.answers)
        ? question.answers.map((answer) => answer.trim())
        : [],
    }))
    .filter((question) => question.title.length > 0 && question.points > 0);
}

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "Bạn chưa đăng nhập." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");

  const baseQuery = db
    .select({
      id: exams.id,
      code: exams.code,
      title: exams.title,
      description: exams.description,
      durationMinutes: exams.durationMinutes,
      maxAttempts: exams.maxAttempts,
      allowResultReview: exams.allowResultReview,
      createdAt: exams.createdAt,
      expiresAt: exams.expiresAt,
      creatorId: exams.creatorId,
    })
    .from(exams);

  const examList =
    scope === "mine"
      ? await baseQuery
          .where(eq(exams.creatorId, session.user.id))
          .orderBy(desc(exams.createdAt))
      : await baseQuery.orderBy(desc(exams.createdAt));

  const examIds = examList.map((exam) => exam.id);
  const participantRows =
    examIds.length > 0
      ? await db
          .select({
            examId: examAttempts.examId,
            participantCount: sql<number>`count(distinct ${examAttempts.userId})`,
          })
          .from(examAttempts)
          .where(
            and(
              isNotNull(examAttempts.submittedAt),
              inArray(examAttempts.examId, examIds),
            ),
          )
          .groupBy(examAttempts.examId)
      : [];

  const participantMap = new Map(
    participantRows.map((row) => [row.examId, Number(row.participantCount)]),
  );

  const examsWithStats = examList.map((exam) => ({
    ...exam,
    participantCount: participantMap.get(exam.id) ?? 0,
  }));

  return NextResponse.json({ exams: examsWithStats });
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "Bạn chưa đăng nhập." },
      { status: 401 },
    );
  }

  const body = (await request.json()) as CreateExamRequest;

  if (!body?.title?.trim()) {
    return NextResponse.json(
      { message: "Vui lòng nhập tiêu đề." },
      { status: 400 },
    );
  }

  const normalizedQuestions = normalizeQuestions(body.questions ?? []);
  if (normalizedQuestions.length === 0) {
    return NextResponse.json(
      { message: "Cần ít nhất một câu hỏi hợp lệ." },
      { status: 400 },
    );
  }

  const durationMinutes = Number(body.durationMinutes);
  if (!Number.isFinite(durationMinutes) || durationMinutes < 0) {
    return NextResponse.json(
      { message: "Thời gian làm bài không hợp lệ." },
      { status: 400 },
    );
  }

  const maxAttempts = Number(body.maxAttempts ?? 1);
  if (!Number.isFinite(maxAttempts) || maxAttempts < 0) {
    return NextResponse.json(
      { message: "Số lượt thử không hợp lệ." },
      { status: 400 },
    );
  }

  const normalizedMaxAttempts = Math.floor(maxAttempts);
  const examId = randomUUID();

  let code = generateExamCode(6);
  for (let tries = 0; tries < 5; tries += 1) {
    const existed = await db
      .select({ id: exams.id })
      .from(exams)
      .where(eq(exams.code, code))
      .limit(1);

    if (existed.length === 0) {
      break;
    }

    code = generateExamCode(6);
  }

  const now = new Date();
  const expiresAt = body.deadline ? new Date(body.deadline) : null;

  await db.transaction(async (tx) => {
    await tx.insert(exams).values({
      id: examId,
      code,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      durationMinutes,
      maxAttempts: normalizedMaxAttempts,
      allowResultReview: Boolean(body.allowResultReview),
      isMonitored: Boolean(body.isMonitored),
      recordBehavior: Boolean(body.recordBehavior),
      expiresAt,
      createdAt: now,
      updatedAt: now,
      creatorId: session.user.id,
    });

    for (
      let questionIndex = 0;
      questionIndex < normalizedQuestions.length;
      questionIndex += 1
    ) {
      const question = normalizedQuestions[questionIndex];
      const questionId = randomUUID();

      await tx.insert(examQuestions).values({
        id: questionId,
        examId,
        type: question.type,
        prompt: question.title,
        points: question.points,
        sortOrder: questionIndex,
        correctText:
          question.type === "essay" && typeof question.correct === "string"
            ? question.correct.trim() || null
            : null,
        createdAt: now,
        updatedAt: now,
      });

      if (question.type === "multiple-choice") {
        const options = question.answers
          .map((answer, optionIndex) => ({
            id: randomUUID(),
            questionId,
            content: answer,
            isCorrect: optionIndex === Number(question.correct),
            sortOrder: optionIndex,
            createdAt: now,
            updatedAt: now,
          }))
          .filter((option) => option.content.length > 0);

        if (options.length < 2) {
          throw new Error("Mỗi câu hỏi trắc nghiệm cần ít nhất 2 đáp án.");
        }

        await tx.insert(examOptions).values(options);
      }
    }
  });

  return NextResponse.json({
    message: "Tạo bài thi thành công.",
    exam: {
      id: examId,
      code,
    },
  });
}
