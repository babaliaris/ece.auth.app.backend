ALTER TABLE `t_devices` MODIFY COLUMN `m_created_at` datetime(3) DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `t_exams` MODIFY COLUMN `m_created_at` datetime(3) DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `t_notifications` MODIFY COLUMN `m_created_at` datetime(3) DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `t_subjects` MODIFY COLUMN `m_created_at` datetime(3) DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `t_subjects_exams` MODIFY COLUMN `m_created_at` datetime(3) DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `t_users` MODIFY COLUMN `m_created_at` datetime(3) DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `t_users_subjects_exams` MODIFY COLUMN `m_created_at` datetime(3) DEFAULT CURRENT_TIMESTAMP;