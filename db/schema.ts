import {
  index,
  mysqlTable,
  varchar,
  text,
  timestamp,
  boolean,
  int,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const user = mysqlTable("user", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const session = mysqlTable("session", {
  id: varchar("id", { length: 36 }).primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => user.id),
});

export const account = mysqlTable("account", {
  id: varchar("id", { length: 36 }).primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => user.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = mysqlTable("verification", {
  id: varchar("id", { length: 36 }).primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const exams = mysqlTable(
  "exams",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    code: varchar("code", { length: 12 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    durationMinutes: int("duration_minutes").notNull(),
    maxAttempts: int("max_attempts").notNull().default(1),
    allowResultReview: boolean("allow_result_review").notNull().default(false),
    isMonitored: boolean("is_monitored").notNull().default(false),
    recordBehavior: boolean("record_behavior").notNull().default(false),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    creatorId: varchar("creator_id", { length: 36 })
      .notNull()
      .references(() => user.id),
  },
  (table) => ({
    codeIndex: uniqueIndex("exams_code_unique").on(table.code),
    creatorIndex: index("exams_creator_idx").on(table.creatorId),
  }),
);

export const examQuestions = mysqlTable(
  "exam_questions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    examId: varchar("exam_id", { length: 36 })
      .notNull()
      .references(() => exams.id),
    type: varchar("type", { length: 20 }).notNull(),
    prompt: text("prompt").notNull(),
    points: int("points").notNull().default(1),
    sortOrder: int("sort_order").notNull().default(0),
    correctText: text("correct_text"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    examSortIndex: index("exam_questions_exam_sort_idx").on(
      table.examId,
      table.sortOrder,
    ),
  }),
);

export const examOptions = mysqlTable(
  "exam_options",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    questionId: varchar("question_id", { length: 36 })
      .notNull()
      .references(() => examQuestions.id),
    content: text("content").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    sortOrder: int("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    questionSortIndex: index("exam_options_question_sort_idx").on(
      table.questionId,
      table.sortOrder,
    ),
  }),
);

export const examAttempts = mysqlTable(
  "exam_attempts",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    examId: varchar("exam_id", { length: 36 })
      .notNull()
      .references(() => exams.id),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id),
    score: int("score"),
    tabSwitchCount: int("tab_switch_count").notNull().default(0),
    fullscreenExitCount: int("fullscreen_exit_count").notNull().default(0),
    isAutoSubmitted: boolean("is_auto_submitted").notNull().default(false),
    submissionReason: text("submission_reason"),
    startedAt: timestamp("started_at").notNull(),
    submittedAt: timestamp("submitted_at"),
  },
  (table) => ({
    examUserSubmittedIndex: index("exam_attempts_exam_user_submitted_idx").on(
      table.examId,
      table.userId,
      table.submittedAt,
    ),
    examSubmittedIndex: index("exam_attempts_exam_submitted_idx").on(
      table.examId,
      table.submittedAt,
    ),
  }),
);

export const examAnswers = mysqlTable(
  "exam_answers",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    attemptId: varchar("attempt_id", { length: 36 })
      .notNull()
      .references(() => examAttempts.id),
    questionId: varchar("question_id", { length: 36 })
      .notNull()
      .references(() => examQuestions.id),
    selectedOptionId: varchar("selected_option_id", { length: 36 }).references(
      () => examOptions.id,
    ),
    essayText: text("essay_text"),
    isCorrect: boolean("is_correct"),
    pointsAwarded: int("points_awarded").notNull().default(0),
  },
  (table) => ({
    attemptQuestionIndex: index("exam_answers_attempt_question_idx").on(
      table.attemptId,
      table.questionId,
    ),
  }),
);
