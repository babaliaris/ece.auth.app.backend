CREATE TABLE `t_devices` (
	`m_uuid` varchar(36) NOT NULL,
	`m_platform` enum('ANDROID','IOS','BROWSER') NOT NULL,
	`m_device_id` varchar(255) NOT NULL,
	`m_device_token` varchar(255) NOT NULL,
	`m_created_at` datetime DEFAULT CURRENT_TIMESTAMP,
	`m_user_uuid` varchar(36) NOT NULL,
	CONSTRAINT `t_devices_m_uuid` PRIMARY KEY(`m_uuid`),
	CONSTRAINT `t_devices_m_device_token_unique` UNIQUE(`m_device_token`),
	CONSTRAINT `unq_t_devices_m_user_uuid_m_device_id` UNIQUE(`m_user_uuid`,`m_device_id`)
);
--> statement-breakpoint
CREATE TABLE `t_exams` (
	`m_uuid` varchar(36) NOT NULL,
	`m_semester` enum('FALL','SPRING') NOT NULL,
	`m_year` smallint unsigned NOT NULL,
	`m_created_at` datetime DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `t_exams_m_uuid` PRIMARY KEY(`m_uuid`),
	CONSTRAINT `unq_t_exams_m_semester_m_year` UNIQUE(`m_semester`,`m_year`)
);
--> statement-breakpoint
CREATE TABLE `t_notifications` (
	`m_uuid` varchar(36) NOT NULL,
	`m_title` varchar(128) NOT NULL,
	`m_body` text NOT NULL,
	`m_category` varchar(64) NOT NULL,
	`m_payload` text,
	`m_is_read` boolean DEFAULT false,
	`m_created_at` datetime DEFAULT CURRENT_TIMESTAMP,
	`m_user_uuid` varchar(36) NOT NULL,
	`m_device_uuid` varchar(36) NOT NULL,
	CONSTRAINT `t_notifications_m_uuid` PRIMARY KEY(`m_uuid`)
);
--> statement-breakpoint
CREATE TABLE `t_subjects` (
	`m_uuid` varchar(36) NOT NULL,
	`m_name` varchar(255) NOT NULL,
	`m_school` varchar(255) NOT NULL,
	`m_created_at` datetime DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `t_subjects_m_uuid` PRIMARY KEY(`m_uuid`)
);
--> statement-breakpoint
CREATE TABLE `t_subjects_exams` (
	`m_uuid` varchar(36) NOT NULL,
	`m_note` text,
	`m_datetime` datetime NOT NULL,
	`m_created_at` datetime DEFAULT CURRENT_TIMESTAMP,
	`m_subject_uuid` varchar(36) NOT NULL,
	`m_exam_uuid` varchar(36) NOT NULL,
	CONSTRAINT `t_subjects_exams_m_uuid` PRIMARY KEY(`m_uuid`),
	CONSTRAINT `unq_t_subjects_exams_m_subject_uuid_m_exam_uuid` UNIQUE(`m_subject_uuid`,`m_exam_uuid`)
);
--> statement-breakpoint
CREATE TABLE `t_users` (
	`m_uuid` varchar(36) NOT NULL,
	`m_email` varchar(124) NOT NULL,
	`m_pass` varchar(60) NOT NULL,
	`m_role` enum('ADMIN','PROFESSOR','STUDENT') NOT NULL,
	`m_created_at` datetime DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `t_users_m_uuid` PRIMARY KEY(`m_uuid`),
	CONSTRAINT `t_users_m_email_unique` UNIQUE(`m_email`)
);
--> statement-breakpoint
CREATE TABLE `t_users_subjects_exams` (
	`m_uuid` varchar(36) NOT NULL,
	`m_note` text,
	`m_created_at` datetime DEFAULT CURRENT_TIMESTAMP,
	`m_user_uuid` varchar(36) NOT NULL,
	`m_subjects_exams_uuid` varchar(36) NOT NULL,
	CONSTRAINT `t_users_subjects_exams_m_uuid` PRIMARY KEY(`m_uuid`),
	CONSTRAINT `unq_t_users_subjects_exams_m_user_uuid_m_subjects_exams_uuid` UNIQUE(`m_user_uuid`,`m_subjects_exams_uuid`)
);
--> statement-breakpoint
ALTER TABLE `t_devices` ADD CONSTRAINT `t_devices_m_user_uuid_t_users_m_uuid_fk` FOREIGN KEY (`m_user_uuid`) REFERENCES `t_users`(`m_uuid`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `t_notifications` ADD CONSTRAINT `t_notifications_m_user_uuid_t_users_m_uuid_fk` FOREIGN KEY (`m_user_uuid`) REFERENCES `t_users`(`m_uuid`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `t_notifications` ADD CONSTRAINT `t_notifications_m_device_uuid_t_devices_m_uuid_fk` FOREIGN KEY (`m_device_uuid`) REFERENCES `t_devices`(`m_uuid`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `t_subjects_exams` ADD CONSTRAINT `t_subjects_exams_m_subject_uuid_t_subjects_m_uuid_fk` FOREIGN KEY (`m_subject_uuid`) REFERENCES `t_subjects`(`m_uuid`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `t_subjects_exams` ADD CONSTRAINT `t_subjects_exams_m_exam_uuid_t_exams_m_uuid_fk` FOREIGN KEY (`m_exam_uuid`) REFERENCES `t_exams`(`m_uuid`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `t_users_subjects_exams` ADD CONSTRAINT `t_users_subjects_exams_m_user_uuid_t_users_m_uuid_fk` FOREIGN KEY (`m_user_uuid`) REFERENCES `t_users`(`m_uuid`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `t_users_subjects_exams` ADD CONSTRAINT `fk_t_users_subjects_exams_m_subjects_exams_uuid_registration` FOREIGN KEY (`m_subjects_exams_uuid`) REFERENCES `t_subjects_exams`(`m_uuid`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_t_notifications_m_user_uuid_m_is_read` ON `t_notifications` (`m_user_uuid`,`m_is_read`);--> statement-breakpoint
CREATE INDEX `idx_t_notifications_m_created_at` ON `t_notifications` (`m_created_at`);--> statement-breakpoint
CREATE INDEX `idx_t_subjects_m_name` ON `t_subjects` (`m_name`);--> statement-breakpoint
CREATE INDEX `idx_t_subjects_m_school` ON `t_subjects` (`m_school`);--> statement-breakpoint
CREATE INDEX `idx_t_subjects_exams_m_datetime` ON `t_subjects_exams` (`m_datetime`);--> statement-breakpoint
CREATE INDEX `idx_t_users_m_email` ON `t_users` (`m_email`);