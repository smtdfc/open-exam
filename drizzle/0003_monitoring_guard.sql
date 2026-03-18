ALTER TABLE `exam_attempts` ADD `tab_switch_count` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD `fullscreen_exit_count` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD `is_auto_submitted` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD `submission_reason` text;
