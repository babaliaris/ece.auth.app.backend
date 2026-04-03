import { test, describe} from 'node:test';
import assert from 'node:assert';
import { vampifySetupE2E } from "@vampify/test";
import { vampifyApp } from "@/app.js";
import { Static } from '@sinclair/typebox';
import { ROUTE_ENDPOINTS } from "@/literals.js"
import { VAMPIFY_LITERALS } from '@vampify/literals';
import { v7 as uuidv7 } from "uuid";
import { eq, and } from 'drizzle-orm';
import {
    examinationsInsertHelper,
    examInsertHelper,
    registerLoginAsBrowserHelper,
    studentExaminationsInsertHelper,
    subjectsInsertHelper,
} from '../test-helpers.js';
import { UserRolesE } from '@/typescript/types/ece-types.js';
import { stdPaginationReplySchema } from '@/typescript/schemas/standard.schema.js';
import { t_subjects_exams, t_users_subjects_exams } from '@/db/schema.js';
import { ExaminationCreateReqSchema, ExaminationPaginationRepSchema, ExaminationUpdateReqSchema } from '@/typescript/schemas/examinations.schema.js';
import { SubjectCreateReqSchema } from '@/typescript/schemas/subjects.schema.js';
import { StudentExaminationCreateReqSchema, StudentExaminationPaginationRepSchema, StudentExaminationUpdateReqSchema } from '@/typescript/schemas/student-examinations.schema.js';


describe('Student Examinations Tests', () =>
{
    const e2e_setup = vampifySetupE2E(vampifyApp);

    test('student examination should POST', async () =>
    {
        await e2e_setup.runInTransaction(async (fastify) =>
        {
            // Insert a user (vampifyAppADMIN).
            const admin_session = await registerLoginAsBrowserHelper(
              fastify,
              {
                m_email: `admin_${Date.now()}@vampify.com`,
                m_pass: "Password@123"
              },
              UserRolesE.ADMIN
            );


            // Insert a user (DEFAULT ROLE IS STUDENT).
            const student_session = await registerLoginAsBrowserHelper(
              fastify,
              {
                m_email: `student_${Date.now()}@vampify.com`,
                m_pass: "Password@123"
              }
            );

            // Add a subject.
            const [subject] = await subjectsInsertHelper(fastify, admin_session.cookie,
            [
                {
                  m_name: "subject",
                  m_school: "school"
                }
            ]);

            // Add an exam.
            const [exam] = await examInsertHelper(fastify, admin_session.cookie,
            [
                {
                  m_semester: "FALL",
                  m_year    : 2026
                }
            ]);

            // Add an examination.
            const [examination] = await examinationsInsertHelper(fastify, admin_session.cookie,
            [
              {
                m_note        : "This is a note",
                m_datetime    : new Date(Date.now()).toISOString(),
                m_subject_uuid: subject.m_uuid,
                m_exam_uuid   : exam.m_uuid
              }
            ]);

            // New Data.
            const data: Static<typeof StudentExaminationCreateReqSchema> =
            {
                m_note                : "This is a note",
                m_subjects_exams_uuid : examination.m_uuid
            };


            // Try to insert without a session.
            const no_session_insert = await fastify.inject(
            {
                method  : 'POST',
                url     : ROUTE_ENDPOINTS.STUDENT_EXAMINATIONS.ROOT,
                payload : [data],
            });
            assert.strictEqual(no_session_insert.statusCode, 401, "Should be unauthorized");

            // Insert the data as a STUDENT, should pass correctly.
            await studentExaminationsInsertHelper(fastify, student_session.cookie, [data]);
        });
    });




    test('student examination should POST 20 Objects & Get them through Pagination', async () =>
    {
        await e2e_setup.runInTransaction(async (fastify) =>
        {
            // Insert a user (vampifyAppADMIN).
            const admin_session = await registerLoginAsBrowserHelper(
              fastify,
              {
                m_email: `admin_${Date.now()}@vampify.com`,
                m_pass: "Password@123"
              },
              UserRolesE.ADMIN
            );


            // Insert a user (DEFAULT ROLE IS STUDENT).
            const student_session = await registerLoginAsBrowserHelper(
              fastify,
              {
                m_email: `student_${Date.now()}@vampify.com`,
                m_pass: "Password@123"
              }
            );

            // Add an exam.
            const [exam] = await examInsertHelper(fastify, admin_session.cookie,
            [
                {
                  m_semester: "FALL",
                  m_year    : 2026
                }
            ]);

            // Declare the total number of data.
            const num_of_data: number = 20;

            // Subjects Data to be inserted.
            const subjects: Static<typeof SubjectCreateReqSchema>[] = [];
            for (let i =0; i < num_of_data; i++)
            {
              subjects.push(
              {
                  m_name: `Subject${i}`,
                  m_school: `Schoold${i}`
              });
            }
            const inserted_subjects = await subjectsInsertHelper(fastify, admin_session.cookie, subjects);


            // Examinations Data
            const examinations: Static<typeof ExaminationCreateReqSchema>[] = [];
            for (let i =0; i < num_of_data; i++)
            {
              examinations.push(
              {
                  m_note        : `Note${i}`,
                  m_datetime    : new Date(Date.now()).toISOString(),
                  m_subject_uuid: inserted_subjects[i].m_uuid,
                  m_exam_uuid   : exam.m_uuid
              });
            }
            const inserted_examinations = await examinationsInsertHelper(fastify, admin_session.cookie, examinations);


            // New Data
            const data: Static<typeof StudentExaminationCreateReqSchema>[] = [];
            for (let i =0; i < num_of_data; i++)
            {
              data.push(
              {
                  m_note                : `StudentNote${i}`,
                  m_subjects_exams_uuid : inserted_examinations[i].m_uuid
              });
            }

            // Insert the data.
            await studentExaminationsInsertHelper(fastify, student_session.cookie, data);

            // Paginate through the objects 5 time (5 pages).
            const limit       = 4;
            const totalPages  = Math.ceil(data.length / limit);
            for (let page = 0; page < totalPages; page++ )
            {
              const get_res = await fastify.inject(
              {
                  method  : 'GET',
                  url     : ROUTE_ENDPOINTS.STUDENT_EXAMINATIONS.ROOT,
                  query   : {m_page: String(page), m_limit: String(limit)},
                  cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: student_session.cookie.value }
              });
              assert.strictEqual(get_res.statusCode, 200);

              // Get the pagination response and check it.
              const repSchema = stdPaginationReplySchema(StudentExaminationPaginationRepSchema);
              const get_body  = get_res.json< Static<typeof repSchema>  >();
              assert(get_body && get_body.m_data && Array.isArray(get_body.m_data));

              // Check the meta object.
              assert.strictEqual(get_body.m_meta.m_current_page, page);
              assert.strictEqual(get_body.m_meta.m_total_pages, totalPages);
              assert.strictEqual(get_body.m_meta.m_limit, limit)

              // Check the data.
              for (let i = 0; i < get_body.m_data.length; i++)
              {
                assert.ok(get_body.m_data[i].m_uuid && typeof get_body.m_data[i].m_uuid === "string");
                assert.strictEqual(get_body.m_data[i].m_note, data[page * limit + i].m_note);
                assert.strictEqual(get_body.m_data[i].m_user_uuid, student_session.user.m_uuid);
                assert.strictEqual(get_body.m_data[i].m_subjects_exams_uuid, data[page * limit + i].m_subjects_exams_uuid);
              }
            }
        });
    });



    test('student examination should PATCH', async () =>
    {
        await e2e_setup.runInTransaction(async (fastify) =>
        {
            // Insert a user (ADMIN).
            const admin_session = await registerLoginAsBrowserHelper(
              fastify,
              {
                m_email: `admin_${Date.now()}@vampify.com`,
                m_pass: "Password@123"
              },
              UserRolesE.ADMIN
            );


            // Insert a user (STUDENT).
            const student_session = await registerLoginAsBrowserHelper(
              fastify,
              {
                m_email: `student_${Date.now()}@vampify.com`,
                m_pass: "Password@123"
              }
            );

            // Add a subject.
            const [subject] = await subjectsInsertHelper(fastify, admin_session.cookie,
            [
                {
                  m_name: "subject",
                  m_school: "school"
                }
            ]);

            // Add an exam.
            const [exam] = await examInsertHelper(fastify, admin_session.cookie,
            [
                {
                  m_semester: "FALL",
                  m_year    : 2026
                }
            ]);


            // Add an Examination.
            const [examination] = await examinationsInsertHelper(fastify, admin_session.cookie,
            [
                {
                    m_note        : "This is a note",
                    m_datetime    : new Date(Date.now()).toISOString(),
                    m_subject_uuid: subject.m_uuid,
                    m_exam_uuid   : exam.m_uuid
                }
            ]);


            // New Data.
            const new_data: Static<typeof StudentExaminationCreateReqSchema> =
            {
                m_note                : "This is a note",
                m_subjects_exams_uuid : examination.m_uuid
            };

            // Insert the data.
            const inserted_data = await studentExaminationsInsertHelper(fastify, student_session.cookie, [new_data]);

            // Update data.
            const update_data: Static<typeof StudentExaminationUpdateReqSchema> =
            {
                m_note: "This is a NEW note",
            };

            // Try to update with no session..
            const noSessionUpdateRes = await fastify.inject(
            {
                method  : 'PATCH',
                url     : ROUTE_ENDPOINTS.STUDENT_EXAMINATIONS.patchSingle(inserted_data[0].m_uuid),
                payload : update_data,
            });
            assert.strictEqual(noSessionUpdateRes.statusCode, 401, "Should be unauthorized");

            // Update.
            const updateRes = await fastify.inject(
            {
                method  : 'PATCH',
                url     : ROUTE_ENDPOINTS.STUDENT_EXAMINATIONS.patchSingle(inserted_data[0].m_uuid),
                payload : update_data,
                cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: student_session.cookie.value }
            });
            assert.strictEqual(updateRes.statusCode, 204);

            // Select the updated object.
            const selected_obj = await fastify.db
            .select()
            .from(t_users_subjects_exams)
            .where(
                and(
                  eq(t_users_subjects_exams.m_uuid, inserted_data[0].m_uuid),
                  eq(t_users_subjects_exams.m_user_uuid, student_session.user.m_uuid)
                )
            );

            // Check if the data where actually updated.
            assert.strictEqual(selected_obj.length, 1);
            assert.strictEqual(selected_obj[0].m_note, update_data.m_note);

            // These should NOT be UPDATED.
            assert.strictEqual(selected_obj[0].m_user_uuid, student_session.user.m_uuid);
            assert.strictEqual(selected_obj[0].m_subjects_exams_uuid, new_data.m_subjects_exams_uuid);
        });
    });



    test('student examination should be DELETED', async () =>
    {
        await e2e_setup.runInTransaction(async (fastify) =>
        {
            // Insert a user (ADMIN).
            const admin_session = await registerLoginAsBrowserHelper(
              fastify,
              {
                m_email: `admin_${Date.now()}@vampify.com`,
                m_pass: "Password@123"
              },
              UserRolesE.ADMIN
            );


            // Insert a user (STUDENT).
            const student_session = await registerLoginAsBrowserHelper(
              fastify,
              {
                m_email: `student_${Date.now()}@vampify.com`,
                m_pass: "Password@123"
              }
            );


            // Try to delete the object that does not exist yet.
            const no_object_del_res = await fastify.inject(
            {
                method  : 'DELETE',
                url     : ROUTE_ENDPOINTS.STUDENT_EXAMINATIONS.deleteSingle(uuidv7()),
                cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: student_session.cookie.value }
            });
            assert.strictEqual(no_object_del_res.statusCode, 404, "Should not exist");

            // Add a subject.
            const [subject] = await subjectsInsertHelper(fastify, admin_session.cookie,
            [
                {
                  m_name: "subject",
                  m_school: "school"
                }
            ]);

            // Add an exam.
            const [exam] = await examInsertHelper(fastify, admin_session.cookie,
            [
                {
                  m_semester: "FALL",
                  m_year    : 2026
                }
            ]);


            // Insert an examination.
            const [examination] = await examinationsInsertHelper(fastify, admin_session.cookie,
            [
                {
                    m_note        : "This is a note",
                    m_datetime    : new Date(Date.now()).toISOString(),
                    m_subject_uuid: subject.m_uuid,
                    m_exam_uuid   : exam.m_uuid
                }
            ]);

            // New Data.
            const new_data: Static<typeof StudentExaminationCreateReqSchema> =
            {
                m_note                : "just a note",
                m_subjects_exams_uuid : examination.m_uuid
            };

            // Insert the data.
            const inserted_data = await studentExaminationsInsertHelper(fastify, student_session.cookie, [new_data]);

            // Try to delete the subject without a session.
            const no_session_del_res = await fastify.inject(
            {
                method  : 'DELETE',
                url     : ROUTE_ENDPOINTS.STUDENT_EXAMINATIONS.deleteSingle(inserted_data[0].m_uuid)
            });
            assert.strictEqual(no_session_del_res.statusCode, 401, "Should be unauthorized");

            // Try to delete the object as a student.
            const admin_del_res = await fastify.inject(
            {
                method  : 'DELETE',
                url     : ROUTE_ENDPOINTS.STUDENT_EXAMINATIONS.deleteSingle(inserted_data[0].m_uuid),
                cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: student_session.cookie.value }
            });
            assert.strictEqual(admin_del_res.statusCode, 204);

            // Check that the object was actually deleted.
            const selected_object = await fastify.db
            .select()
            .from(t_users_subjects_exams)
            .where(
              and(
                  eq(t_users_subjects_exams.m_uuid, inserted_data[0].m_uuid),
                  eq(t_users_subjects_exams.m_user_uuid, student_session.user.m_uuid)
              )
            );
            assert.strictEqual(selected_object.length, 0);
        });
    });
});

