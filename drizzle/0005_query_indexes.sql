CREATE INDEX `exams_creator_idx` ON `exams` (`creator_id`);
--> statement-breakpoint
CREATE INDEX `exam_questions_exam_sort_idx` ON `exam_questions` (`exam_id`,`sort_order`);
--> statement-breakpoint
CREATE INDEX `exam_options_question_sort_idx` ON `exam_options` (`question_id`,`sort_order`);
--> statement-breakpoint
CREATE INDEX `exam_attempts_exam_user_submitted_idx` ON `exam_attempts` (`exam_id`,`user_id`,`submitted_at`);
--> statement-breakpoint
CREATE INDEX `exam_attempts_exam_submitted_idx` ON `exam_attempts` (`exam_id`,`submitted_at`);
--> statement-breakpoint
CREATE INDEX `exam_answers_attempt_question_idx` ON `exam_answers` (`attempt_id`,`question_id`);
