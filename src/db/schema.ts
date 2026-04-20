import {
  boolean, mysqlTable, varchar, mysqlEnum, datetime, index, text,
  unique, smallint, foreignKey

} from 'drizzle-orm/mysql-core';

import {sql} from 'drizzle-orm';



/**
 * Users Table.
 * 
 * Stores basic user data.
 */
export const t_users = mysqlTable('t_users',
{
  m_uuid      : varchar("m_uuid", {length: 36}).primaryKey(),
  m_email     : varchar("m_email", {length: 124}).notNull().unique(),
  m_pass      : varchar("m_pass", {length: 60}).notNull(),
  m_role      : mysqlEnum("m_role", ["ADMIN", "PROFESSOR", "STUDENT"]).notNull().default("STUDENT"),
  m_created_at: datetime('m_created_at', { mode: 'date', fsp: 3 }).default(sql`CURRENT_TIMESTAMP`)
});



/**
 * Devices Table.
 * 
 * Stores information about log in devices for the users.
 */
export const t_devices = mysqlTable('t_devices',
{
  m_uuid          : varchar("m_uuid", {length: 36}).primaryKey(),
  m_platform      : mysqlEnum("m_platform", ["ANDROID", "IOS", "BROWSER"]).notNull(),
  m_device_id     : varchar("m_device_id", { length: 255 }).notNull(),
  m_device_token  : varchar("m_device_token", { length: 255 }).notNull().unique(),
  m_created_at    : datetime('m_created_at', { mode: 'date', fsp: 3 }).default(sql`CURRENT_TIMESTAMP`),

  m_user_uuid     : varchar("m_user_uuid", {length: 36}).notNull().references(()=>t_users.m_uuid, {onDelete: "cascade"})
}, (t)=>
  [
    unique("unq_t_devices_m_user_uuid_m_device_id").on(t.m_user_uuid, t.m_device_id)
  ]
);



/**
 * Notifications Table.
 * 
 * For each notification generated (by an admin or the system),
 * this table is used to create a notification instance for
 * EACH user in the sytem and for EACH device he logged in.
 * This means, for each new notification broadbast we must
 * store U * D rows, where U: "t_users length" and
 * D: "t_devices length". Old notifications, should be
 * deleted after some period of time, to keep this table
 * managable.
 */
export const t_notifications = mysqlTable('t_notifications',
{
  m_uuid          : varchar("m_uuid", {length: 36}).primaryKey(),
  m_title         : varchar("m_title", { length: 128 }).notNull(),
  m_body          : text("m_body").notNull(),
  m_category      : varchar("m_category", { length: 64 }).notNull(),
  m_payload       : text("m_payload"),
  m_is_read       : boolean("m_is_read").default(false),
  m_created_at    : datetime('m_created_at', { mode: 'date', fsp: 3 }).default(sql`CURRENT_TIMESTAMP`),

  m_user_uuid     : varchar("m_user_uuid", {length: 36}).notNull().references(()=>t_users.m_uuid, {onDelete: "cascade"}),
  m_device_uuid   : varchar("m_device_uuid", {length: 36}).notNull().references(()=>t_devices.m_uuid, {onDelete: "cascade"})
}, (t)=>
  [
    index("idx_t_notifications_m_user_uuid_m_is_read").on(t.m_user_uuid, t.m_is_read),
    index("idx_t_notifications_m_created_at").on(t.m_created_at)
  ]
);




/**
 * Subjects Table.
 * 
 * This stores informations for each subject.
 */
export const t_subjects = mysqlTable('t_subjects',
{
  m_uuid        : varchar("m_uuid", {length: 36}).primaryKey(),
  m_name        : varchar('m_name', {length: 255}).notNull(),
  m_school      : varchar('m_school', {length: 255}).notNull(),
  m_created_at  : datetime('m_created_at', { mode: 'date', fsp: 3 }).default(sql`CURRENT_TIMESTAMP`)
}, (t)=>
  [
    index("idx_t_subjects_m_name").on(t.m_name),
    index("idx_t_subjects_m_school").on(t.m_school)
  ]
);



/**
 * Exams Table
 * 
 * This stores information for each exam period.
 */
export const t_exams = mysqlTable('t_exams',
{
  m_uuid        : varchar("m_uuid", {length: 36}).primaryKey(),
  m_semester    : mysqlEnum("m_semester", ["FALL", "SPRING"]).notNull(),
  m_year        : smallint('m_year', {unsigned: true}).notNull(),
  m_created_at  : datetime('m_created_at', { mode: 'date', fsp: 3 }).default(sql`CURRENT_TIMESTAMP`)
}, (t)=>
  [
    unique("unq_t_exams_m_semester_m_year").on(t.m_semester, t.m_year),
    index("index_t_exams_m_year_m_created_at").on(t.m_year, t.m_created_at)
  ]
);



/**
 * Exam subjects registration Table.
 * 
 * When a Professor creates a new exam period, they can link
 * which subjects take place in this exam period and at what time.
 */
export const t_subjects_exams = mysqlTable('t_subjects_exams',
{
  m_uuid        : varchar("m_uuid", {length: 36}).primaryKey(),
  m_note        : text("m_note"),
  m_datetime    : datetime('m_datetime', { mode: 'date', fsp: 3 }).notNull(),
  m_created_at  : datetime('m_created_at', { mode: 'date', fsp: 3 }).default(sql`CURRENT_TIMESTAMP`),

  m_subject_uuid: varchar("m_subject_uuid", {length: 36}).notNull().references(()=>t_subjects.m_uuid, {onDelete: "cascade"}),
  m_exam_uuid   : varchar("m_exam_uuid", {length: 36}).notNull().references(()=>t_exams.m_uuid, {onDelete: "cascade"})
}, (t) =>
  [
    unique("unq_t_subjects_exams_m_subject_uuid_m_exam_uuid").on(t.m_subject_uuid, t.m_exam_uuid),
    index("idx_t_subjects_exams_m_datetime").on(t.m_datetime)
  ]
);



/**
 * Users (students) exam subjects registrations Table.
 * 
 * Students an create a list of which subjects (that belong in an exam period)
 * they wish to "track".
 */
export const t_users_subjects_exams = mysqlTable('t_users_subjects_exams',
{
  m_uuid        : varchar("m_uuid", {length: 36}).primaryKey(),
  m_note        : text("m_note"),
  m_created_at  : datetime('m_created_at', { mode: 'date', fsp: 3 }).default(sql`CURRENT_TIMESTAMP`),

  m_user_uuid           : varchar("m_user_uuid", {length: 36}).notNull().references(()=>t_users.m_uuid, {onDelete: "cascade"}),
  m_subjects_exams_uuid : varchar("m_subjects_exams_uuid", {length: 36}).notNull()
}, (t) =>
  [
    // Create this manually, because the default drizzle naming is exceeding the 64 char limit
    // in this case.
    foreignKey(
    {
      columns       : [t.m_subjects_exams_uuid],
      foreignColumns: [t_subjects_exams.m_uuid],
      name          : "fk_t_users_subjects_exams_m_subjects_exams_uuid_registration"
    }).onDelete("cascade"),
  
    unique("unq_t_users_subjects_exams_m_user_uuid_m_subjects_exams_uuid").on(t.m_user_uuid, t.m_subjects_exams_uuid)
  ]
);
