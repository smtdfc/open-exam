CREATE TABLE "account" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_answers" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"attempt_id" varchar(36) NOT NULL,
	"question_id" varchar(36) NOT NULL,
	"selected_option_id" varchar(36),
	"essay_text" text,
	"is_correct" boolean,
	"points_awarded" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_attempts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"exam_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"score" integer,
	"tab_switch_count" integer DEFAULT 0 NOT NULL,
	"fullscreen_exit_count" integer DEFAULT 0 NOT NULL,
	"is_auto_submitted" boolean DEFAULT false NOT NULL,
	"submission_reason" text,
	"started_at" timestamp NOT NULL,
	"submitted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "exam_options" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"question_id" varchar(36) NOT NULL,
	"content" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_questions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"exam_id" varchar(36) NOT NULL,
	"type" varchar(20) NOT NULL,
	"prompt" text NOT NULL,
	"points" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"correct_text" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"code" varchar(12) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"duration_minutes" integer NOT NULL,
	"max_attempts" integer DEFAULT 1 NOT NULL,
	"allow_result_review" boolean DEFAULT false NOT NULL,
	"is_monitored" boolean DEFAULT false NOT NULL,
	"record_behavior" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"creator_id" varchar(36) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" varchar(255) NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" varchar(36) NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_attempt_id_exam_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."exam_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_question_id_exam_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."exam_questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_selected_option_id_exam_options_id_fk" FOREIGN KEY ("selected_option_id") REFERENCES "public"."exam_options"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_options" ADD CONSTRAINT "exam_options_question_id_exam_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."exam_questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exam_answers_attempt_question_idx" ON "exam_answers" USING btree ("attempt_id","question_id");--> statement-breakpoint
CREATE INDEX "exam_attempts_exam_user_submitted_idx" ON "exam_attempts" USING btree ("exam_id","user_id","submitted_at");--> statement-breakpoint
CREATE INDEX "exam_attempts_exam_submitted_idx" ON "exam_attempts" USING btree ("exam_id","submitted_at");--> statement-breakpoint
CREATE INDEX "exam_options_question_sort_idx" ON "exam_options" USING btree ("question_id","sort_order");--> statement-breakpoint
CREATE INDEX "exam_questions_exam_sort_idx" ON "exam_questions" USING btree ("exam_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "exams_code_unique" ON "exams" USING btree ("code");--> statement-breakpoint
CREATE INDEX "exams_creator_idx" ON "exams" USING btree ("creator_id");