DROP INDEX `idx_t_users_m_email` ON `t_users`;--> statement-breakpoint
ALTER TABLE `t_users` MODIFY COLUMN `m_role` enum('ADMIN','PROFESSOR','STUDENT') NOT NULL DEFAULT 'STUDENT';