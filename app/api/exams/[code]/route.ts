import { db } from "@/db";
import {
  examAnswers,
  examAttempts,
  examOptions,
  examQuestions,
  exams,
} from "@/db/schema";
import { getServerSession } from "@/lib/session";
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

type ExamQuestionResponse = {
  id: string;
  type: string;
  prompt: string;
  points: number;
  sortOrder: number;
  correctText?: string | null;
  options: Array<{
    id: string;
    content: string;
    sortOrder: number;
    isCorrect?: boolean;
  }>;
};

type StoredQuestion = {
  id: string;
  type: "multiple-choice" | "essay";
  title: string;
  points: number;
  sortOrder: number;
  correctText: string | null;
  options: Array<{
    id: string;
    content: string;
    sortOrder: number;
    isCorrect: boolean;
  }>;
};

type EditableQuestion = {
  type: "multiple-choice" | "essay";
  title: string;
  answers: string[];
  correct: number | string;
  points: number;
};

type IncomingQuestion = EditableQuestion;

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
  const isEditMode = new URL(_request.url).searchParams.get("mode") === "edit";

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

  const isOwner = exam.creatorId === session.user.id;

  if (isEditMode && !isOwner) {
    return NextResponse.json(
      { message: "Bạn không có quyền sửa bài thi này." },
      { status: 403 },
    );
  }

  if (
    !isEditMode &&
    exam.expiresAt &&
    new Date(exam.expiresAt).getTime() < Date.now()
  ) {
    return NextResponse.json(
      { message: "Bài thi đã hết hạn." },
      { status: 410 },
    );
  }

  const storedQuestions = await loadStoredQuestions(exam.id);

  const questionMap = new Map<string, ExamQuestionResponse>();
  for (const question of storedQuestions) {
    questionMap.set(question.id, {
      id: question.id,
      type: question.type,
      prompt: question.title,
      points: question.points,
      sortOrder: question.sortOrder,
      correctText: isEditMode && isOwner ? question.correctText : null,
      options: [],
    });
  }

  for (const question of storedQuestions) {
    const item = questionMap.get(question.id);
    if (item) {
      item.options.push(
        ...question.options.map((option) => ({
          id: option.id,
          content: option.content,
          sortOrder: option.sortOrder,
          ...(isEditMode && isOwner ? { isCorrect: option.isCorrect } : {}),
        })),
      );
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

  const submittedAttemptCountRows = await db
    .select({
      count: sql<number>`count(*)`,
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
  const submittedAttemptCount = Number(
    submittedAttemptCountRows[0]?.count ?? 0,
  );

  return NextResponse.json({
    exam: {
      ...exam,
      participantCount,
      questions,
      viewer: {
        attemptsUsed,
        remainingAttempts,
        canRetry: hasUnlimitedAttempts || remainingAttempts! > 0,
        latestAttemptId: latestAttempt?.id ?? null,
        latestScore: latestAttempt?.score ?? null,
        canReviewResult: exam.allowResultReview,
        isOwner,
        canEditQuestions: isEditMode
          ? isOwner && submittedAttemptCount === 0
          : false,
      },
    },
  });
}

function normalizeQuestions(questions: IncomingQuestion[]): EditableQuestion[] {
  return questions
    .map<EditableQuestion>((question) => ({
      type: question.type === "essay" ? "essay" : "multiple-choice",
      title: question.title.trim(),
      points: Number.isFinite(question.points) ? question.points : 0,
      answers: Array.isArray(question.answers)
        ? question.answers.map((answer) => answer.trim())
        : [],
      correct: question.correct,
    }))
    .filter((question) => question.title.length > 0 && question.points > 0);
}

async function loadStoredQuestions(examId: string) {
  const questionRows = await db
    .select({
      id: examQuestions.id,
      type: examQuestions.type,
      title: examQuestions.prompt,
      points: examQuestions.points,
      sortOrder: examQuestions.sortOrder,
      correctText: examQuestions.correctText,
    })
    .from(examQuestions)
    .where(eq(examQuestions.examId, examId))
    .orderBy(asc(examQuestions.sortOrder));

  const questionIds = questionRows.map((question) => question.id);
  const optionRows =
    questionIds.length > 0
      ? await db
          .select({
            id: examOptions.id,
            questionId: examOptions.questionId,
            content: examOptions.content,
            sortOrder: examOptions.sortOrder,
            isCorrect: examOptions.isCorrect,
          })
          .from(examOptions)
          .where(inArray(examOptions.questionId, questionIds))
          .orderBy(asc(examOptions.sortOrder))
      : [];

  const questionMap = new Map<string, StoredQuestion>();

  for (const question of questionRows) {
    questionMap.set(question.id, {
      ...question,
      type: question.type as "multiple-choice" | "essay",
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
        isCorrect: Boolean(option.isCorrect),
      });
    }
  }

  return Array.from(questionMap.values()).sort(
    (left, right) => left.sortOrder - right.sortOrder,
  );
}

function toEditableQuestions(questions: StoredQuestion[]) {
  return questions.map<EditableQuestion>((question) => {
    if (question.type === "multiple-choice") {
      const sortedOptions = question.options
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder);
      const correctIndex = sortedOptions.findIndex(
        (option) => option.isCorrect,
      );

      return {
        type: "multiple-choice",
        title: question.title,
        answers: sortedOptions.map((option) => option.content),
        correct: correctIndex < 0 ? 0 : correctIndex,
        points: question.points,
      };
    }

    return {
      type: "essay",
      title: question.title,
      answers: [],
      correct: question.correctText ?? "",
      points: question.points,
    };
  });
}

function questionSignature(question: EditableQuestion) {
  return JSON.stringify({
    type: question.type,
    title: question.title,
    answers: question.answers,
    correct: question.correct,
    points: question.points,
  });
}

function questionsMatch(left: EditableQuestion[], right: EditableQuestion[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every(
    (question, index) =>
      questionSignature(question) === questionSignature(right[index]),
  );
}

export async function PUT(
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

  const examRows = await db
    .select({
      id: exams.id,
      creatorId: exams.creatorId,
    })
    .from(exams)
    .where(
      and(eq(exams.code, normalizedCode), eq(exams.creatorId, session.user.id)),
    )
    .limit(1);

  const exam = examRows[0];
  if (!exam) {
    return NextResponse.json(
      { message: "Không tìm thấy bài thi." },
      { status: 404 },
    );
  }

  const submittedAttemptRows = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(examAttempts)
    .where(
      and(
        eq(examAttempts.examId, exam.id),
        isNotNull(examAttempts.submittedAt),
      ),
    );

  const submittedAttemptCount = Number(submittedAttemptRows[0]?.count ?? 0);
  const now = new Date();
  const expiresAt = body.deadline ? new Date(body.deadline) : null;

  if (submittedAttemptCount > 0) {
    const currentQuestions = toEditableQuestions(
      await loadStoredQuestions(exam.id),
    );

    if (!questionsMatch(currentQuestions, normalizedQuestions)) {
      return NextResponse.json(
        {
          message:
            "Bài thi đã có lượt làm nên chỉ có thể sửa thông tin chung, không thể thay đổi nội dung câu hỏi.",
        },
        { status: 409 },
      );
    }

    await db
      .update(exams)
      .set({
        title: body.title.trim(),
        description: body.description?.trim() || null,
        durationMinutes,
        maxAttempts: Math.floor(maxAttempts),
        allowResultReview: Boolean(body.allowResultReview),
        isMonitored: Boolean(body.isMonitored),
        recordBehavior: Boolean(body.recordBehavior),
        expiresAt,
        updatedAt: now,
      })
      .where(eq(exams.id, exam.id));

    return NextResponse.json({
      message: "Đã lưu thay đổi bài thi.",
      exam: {
        code: normalizedCode,
      },
    });
  }

  const existingQuestions = await loadStoredQuestions(exam.id);
  const existingQuestionIds = existingQuestions.map((question) => question.id);

  await db.transaction(async (tx) => {
    await tx
      .update(exams)
      .set({
        title: body.title.trim(),
        description: body.description?.trim() || null,
        durationMinutes,
        maxAttempts: Math.floor(maxAttempts),
        allowResultReview: Boolean(body.allowResultReview),
        isMonitored: Boolean(body.isMonitored),
        recordBehavior: Boolean(body.recordBehavior),
        expiresAt,
        updatedAt: now,
      })
      .where(eq(exams.id, exam.id));

    if (existingQuestionIds.length > 0) {
      await tx
        .delete(examOptions)
        .where(inArray(examOptions.questionId, existingQuestionIds));
      await tx
        .delete(examQuestions)
        .where(inArray(examQuestions.id, existingQuestionIds));
    }

    for (
      let questionIndex = 0;
      questionIndex < normalizedQuestions.length;
      questionIndex += 1
    ) {
      const question = normalizedQuestions[questionIndex];
      const questionId = randomUUID();

      await tx.insert(examQuestions).values({
        id: questionId,
        examId: exam.id,
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
    message: "Đã lưu thay đổi bài thi.",
    exam: {
      code: normalizedCode,
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
