import { test, describe} from 'node:test';
import assert from 'node:assert';
import { vampifySetupE2E } from "@vampify/test";
import { vampifyApp } from "@/app.js";
import { Static } from '@sinclair/typebox';
import { ROUTE_ENDPOINTS } from "@/literals.js"
import { VAMPIFY_LITERALS } from '@vampify/literals';
import { v7 as uuidv7 } from "uuid";
import { eq } from 'drizzle-orm';

import {
    examinationsInsertHelper,
    examInsertHelper,
    registerLoginAsBrowserHelper,
    subjectsInsertHelper,
} from '../test-helpers.js';
import { UserRolesE } from '@/typescript/types/ece-types.js';
import { stdPaginationReplySchema } from '@/typescript/schemas/standard.schema.js';
import { t_subjects_exams } from '@/db/schema.js';
import { ExaminationCreateReqSchema, ExaminationPaginationRepSchema, ExaminationUpdateReqSchema } from '@/typescript/schemas/examinations.schema.js';
import { SubjectCreateReqSchema } from '@/typescript/schemas/subjects.schema.js';


describe('Examinations Tests', () =>
{
    const e2e_setup = vampifySetupE2E(vampifyApp);

    test('examination should POST', async () =>
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

            // New Data.
            const data: Static<typeof ExaminationCreateReqSchema> =
            {
                m_note        : "This is a note",
                m_datetime    : new Date(Date.now()).toISOString(),
                m_subject_uuid: subject.m_uuid,
                m_exam_uuid   : exam.m_uuid
            };


            // Try to insert without a session.
            const no_session_insert = await fastify.inject(
            {
                method  : 'POST',
                url     : ROUTE_ENDPOINTS.EXAMINATIONS.ROOT,
                payload : [data],
            });
            assert.strictEqual(no_session_insert.statusCode, 401, "Should be unauthorized");


            // Try to insert as a student.
            const student_insert = await fastify.inject(
            {
                method  : 'POST',
                url     : ROUTE_ENDPOINTS.EXAMINATIONS.ROOT,
                payload : [data],
                cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: student_session.cookie.value }
            });
            assert.strictEqual(student_insert.statusCode, 403, "Should be forbidden 403");

            // Insert the data as admin, should pass correctly.
            await examinationsInsertHelper(fastify, admin_session.cookie, [data]);
        });
    });




    test('examination should POST 20 Objects & Get them through Pagination', async () =>
    {
        await e2e_setup.runInTransaction(async (fastify) =>
        {
            // Insert a user (ADMIN).
            const {cookie} = await registerLoginAsBrowserHelper(
              fastify,
              {
                m_email: `browser_${Date.now()}@vampify.com`,
                m_pass: "Password@123"
              },
              UserRolesE.ADMIN
            );

            // Add an exam.
            const [exam] = await examInsertHelper(fastify, cookie,
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

            // Add the subjects.
            const inserted_subjects = await subjectsInsertHelper(fastify, cookie, subjects);

            // New Data
            const data: Static<typeof ExaminationCreateReqSchema>[] = [];
            for (let i =0; i < num_of_data; i++)
            {
              data.push(
              {
                  m_note        : `Note${i}`,
                  m_datetime    : new Date(Date.now()).toISOString(),
                  m_subject_uuid: inserted_subjects[i].m_uuid,
                  m_exam_uuid   : exam.m_uuid
              });
            }


            // Insert the data.
            await examinationsInsertHelper(fastify, cookie, data);

            // Paginate through the objects 5 time (5 pages).
            const limit       = 4;
            const totalPages  = Math.ceil(data.length / limit);
            for (let page = 0; page < totalPages; page++ )
            {
              const get_res = await fastify.inject(
              {
                  method  : 'GET',
                  url     : ROUTE_ENDPOINTS.EXAMINATIONS.ROOT,
                  query   : {m_page: String(page), m_limit: String(limit)},
              });
              assert.strictEqual(get_res.statusCode, 200);

              // Get the pagination response and check it.
              const repSchema = stdPaginationReplySchema(ExaminationPaginationRepSchema);
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
                assert.strictEqual(get_body.m_data[i].m_datetime, data[page * limit + i].m_datetime);
                assert.strictEqual(get_body.m_data[i].m_subject_uuid, data[page * limit + i].m_subject_uuid);
                assert.strictEqual(get_body.m_data[i].m_exam_uuid, data[page * limit + i].m_exam_uuid);
              }
            }
        });
    });



    test('examination should PATCH', async () =>
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

            // New Data.
            const new_data: Static<typeof ExaminationCreateReqSchema> =
            {
                m_note        : "This is a note",
                m_datetime    : new Date(Date.now()).toISOString(),
                m_subject_uuid: subject.m_uuid,
                m_exam_uuid   : exam.m_uuid
            };

            // Insert the data.
            const inserted_data = await examinationsInsertHelper(fastify, admin_session.cookie, [new_data]);

            // Update data.
            const update_data: Static<typeof ExaminationUpdateReqSchema> =
            {
                m_note        : "This is a NEW note",
                m_datetime    : new Date(Date.now()).toISOString(),
            };

            // Try to update with no session..
            const noSessionUpdateRes = await fastify.inject(
            {
                method  : 'PATCH',
                url     : ROUTE_ENDPOINTS.EXAMINATIONS.patchSingle(inserted_data[0].m_uuid),
                payload : update_data,
            });
            assert.strictEqual(noSessionUpdateRes.statusCode, 401, "Should be unauthorized");


            // Try to update using the student session.
            const studentUpdateRes = await fastify.inject(
            {
                method  : 'PATCH',
                url     : ROUTE_ENDPOINTS.EXAMINATIONS.patchSingle(inserted_data[0].m_uuid),
                payload : update_data,
                cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: student_session.cookie.value }
            });
            assert.strictEqual(studentUpdateRes.statusCode, 403, "Student should be forbiddent");


            // Update.
            const updateRes = await fastify.inject(
            {
                method  : 'PATCH',
                url     : ROUTE_ENDPOINTS.EXAMINATIONS.patchSingle(inserted_data[0].m_uuid),
                payload : update_data,
                cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: admin_session.cookie.value }
            });
            console.log(`UPDATE DATA: `, updateRes.body);
            assert.strictEqual(updateRes.statusCode, 204);

            // Select the updated object.
            const selected_obj = await fastify.db
            .select()
            .from(t_subjects_exams)
            .where(
                eq(t_subjects_exams.m_uuid, inserted_data[0].m_uuid)
              );

            // Check if the data where actually updated.
            assert.strictEqual(selected_obj.length, 1);
            assert.strictEqual(selected_obj[0].m_note, update_data.m_note);
            assert.strictEqual(selected_obj[0].m_datetime.toISOString(), update_data.m_datetime);

            // These should NOT be UPDATED.
            assert.strictEqual(selected_obj[0].m_subject_uuid, new_data.m_subject_uuid);
            assert.strictEqual(selected_obj[0].m_exam_uuid, new_data.m_exam_uuid);
        });
    });



    test('subject should be DELETED', async () =>
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
                url     : ROUTE_ENDPOINTS.EXAMINATIONS.deleteSingle(uuidv7()),
                cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: admin_session.cookie.value }
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

            // New Data.
            const new_data: Static<typeof ExaminationCreateReqSchema> =
            {
                m_note        : "This is a note",
                m_datetime    : new Date(Date.now()).toISOString(),
                m_subject_uuid: subject.m_uuid,
                m_exam_uuid   : exam.m_uuid
            };

            // Insert the data.
            const inserted_data = await examinationsInsertHelper(fastify, admin_session.cookie, [new_data]);

            // Try to delete the subject without a session.
            const no_session_del_res = await fastify.inject(
            {
                method  : 'DELETE',
                url     : ROUTE_ENDPOINTS.EXAMINATIONS.deleteSingle(inserted_data[0].m_uuid)
            });
            assert.strictEqual(no_session_del_res.statusCode, 401, "Should be unauthorized");


            // Try to delete the object as a student.
            const student_del_res = await fastify.inject(
            {
                method  : 'DELETE',
                url     : ROUTE_ENDPOINTS.EXAMINATIONS.deleteSingle(inserted_data[0].m_uuid),
                cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: student_session.cookie.value }
            });
            assert.strictEqual(student_del_res.statusCode, 403, "Should be forbidden");


            // Try to delete the object as the admin.
            const admin_del_res = await fastify.inject(
            {
                method  : 'DELETE',
                url     : ROUTE_ENDPOINTS.EXAMINATIONS.deleteSingle(inserted_data[0].m_uuid),
                cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: admin_session.cookie.value }
            });
            assert.strictEqual(admin_del_res.statusCode, 204);

            // Check that the object was actually deleted.
            const selected_object = await fastify.db
            .select()
            .from(t_subjects_exams)
            .where(
              eq(t_subjects_exams.m_uuid, inserted_data[0].m_uuid)
            );
            assert.strictEqual(selected_object.length, 0);
        });
    });
});

