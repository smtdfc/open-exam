CREATE TABLE `exam_answers` (
	`id` varchar(36) NOT NULL,
	`attempt_id` varchar(36) NOT NULL,
	`question_id` varchar(36) NOT NULL,
	`selected_option_id` varchar(36),
	`essay_text` text,
	`is_correct` boolean,
	`points_awarded` int NOT NULL DEFAULT 0,
	CONSTRAINT `exam_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exam_attempts` (
	`id` varchar(36) NOT NULL,
	`exam_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`score` int,
	`started_at` timestamp NOT NULL,
	`submitted_at` timestamp,
	CONSTRAINT `exam_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exam_options` (
	`id` varchar(36) NOT NULL,
	`question_id` varchar(36) NOT NULL,
	`content` text NOT NULL,
	`is_correct` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `exam_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exam_questions` (
	`id` varchar(36) NOT NULL,
	`exam_id` varchar(36) NOT NULL,
	`type` varchar(20) NOT NULL,
	`prompt` text NOT NULL,
	`points` int NOT NULL DEFAULT 1,
	`sort_order` int NOT NULL DEFAULT 0,
	`correct_text` text,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `exam_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exams` (
	`id` varchar(36) NOT NULL,
	`code` varchar(12) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`duration_minutes` int NOT NULL,
	`max_attempts` int NOT NULL DEFAULT 1,
	`is_monitored` boolean NOT NULL DEFAULT false,
	`record_behavior` boolean NOT NULL DEFAULT false,
	`expires_at` timestamp,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	`creator_id` varchar(36) NOT NULL,
	CONSTRAINT `exams_id` PRIMARY KEY(`id`),
	CONSTRAINT `exams_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `exam_answers` ADD CONSTRAINT `exam_answers_attempt_id_exam_attempts_id_fk` FOREIGN KEY (`attempt_id`) REFERENCES `exam_attempts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_answers` ADD CONSTRAINT `exam_answers_question_id_exam_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `exam_questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_answers` ADD CONSTRAINT `exam_answers_selected_option_id_exam_options_id_fk` FOREIGN KEY (`selected_option_id`) REFERENCES `exam_options`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD CONSTRAINT `exam_attempts_exam_id_exams_id_fk` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD CONSTRAINT `exam_attempts_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_options` ADD CONSTRAINT `exam_options_question_id_exam_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `exam_questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_questions` ADD CONSTRAINT `exam_questions_exam_id_exams_id_fk` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exams` ADD CONSTRAINT `exams_creator_id_user_id_fk` FOREIGN KEY (`creator_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;