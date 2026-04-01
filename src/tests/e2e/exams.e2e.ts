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
    examInsertHelper,
    registerLoginAsBrowserHelper,
} from '../test-helpers.js';
import { UserRolesE } from '@/typescript/types/ece-types.js';
import { stdPaginationReplySchema } from '@/typescript/schemas/standard.schema.js';
import { t_exams } from '@/db/schema.js';
import { ExamCreateReqSchema, ExamPaginationRepSchema, ExamUpdateReqSchema } from '@/typescript/schemas/exams.schema.js';


describe('Exams Tests', () =>
{
    const e2e_setup = vampifySetupE2E(vampifyApp);

    test('exam should POST', async () =>
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


            // New Data.
            const data: Static<typeof ExamCreateReqSchema> =
            {
                m_semester: "FALL",
                m_year    : 2026
            };


            // Try to insert without a session.
            const no_session_insert = await fastify.inject(
            {
                method  : 'POST',
                url     : ROUTE_ENDPOINTS.EXAMS.ROOT,
                payload : [data],
            });
            assert.strictEqual(no_session_insert.statusCode, 401, "Should be unauthorized");


            // Try to insert as a student.
            const student_insert = await fastify.inject(
            {
                method  : 'POST',
                url     : ROUTE_ENDPOINTS.EXAMS.ROOT,
                payload : [data],
                cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: student_session.cookie.value }
            });
            assert.strictEqual(student_insert.statusCode, 403, "Should be forbidden 403");

            // Insert the data as admin, should pass correctly.
            await examInsertHelper(fastify, admin_session.cookie, [data]);
        });
    });




    test('exam should POST 20 Objects & Get them through Pagination', async () =>
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


            // New Data array.
            const data: Static<typeof ExamCreateReqSchema>[] = [];
            for (let i = 0; i < 20; i++)
            {
              data.push(
              {
                  m_semester  : "FALL",
                  m_year      : i
              });
            };

            // Insert the subjects.
            await examInsertHelper(fastify, cookie, data);

            // Paginate through the objects 5 time (5 pages).
            const limit       = 4;
            const totalPages  = Math.ceil(data.length / limit);
            for (let page = 0; page < totalPages; page++ )
            {
              const get_res = await fastify.inject(
              {
                  method  : 'GET',
                  url     : ROUTE_ENDPOINTS.EXAMS.ROOT,
                  query   : {m_page: String(page), m_limit: String(limit)},
              });
              assert.strictEqual(get_res.statusCode, 200);

              // Get the pagination response and check it.
              const repSchema = stdPaginationReplySchema(ExamPaginationRepSchema);
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
                assert.strictEqual(get_body.m_data[i].m_semester, data[page * limit + i].m_semester);
                assert.strictEqual(get_body.m_data[i].m_year, data[page * limit + i].m_year);
              }
            }
        });
    });



    test('exam should PATCH', async () =>
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

            // New Data.
            const new_data: Static<typeof ExamCreateReqSchema> =
            {
                m_semester: "SPRING",
                m_year    : 2026
            };

            // Insert the subjects.
            const inserted_data = await examInsertHelper(fastify, admin_session.cookie, [new_data]);

            // Update data.
            const update_data: Static<typeof ExamUpdateReqSchema> =
            {
                m_semester: "FALL",
                m_year    : 2027
            };

            // Try to update with no session..
            const noSessionUpdateRes = await fastify.inject(
            {
                method  : 'PATCH',
                url     : ROUTE_ENDPOINTS.EXAMS.patchSingle(inserted_data[0].m_uuid),
                payload : update_data,
            });
            assert.strictEqual(noSessionUpdateRes.statusCode, 401, "Should be unauthorized");


            // Try to update using the student session.
            const studentUpdateRes = await fastify.inject(
            {
                method  : 'PATCH',
                url     : ROUTE_ENDPOINTS.EXAMS.patchSingle(inserted_data[0].m_uuid),
                payload : update_data,
                cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: student_session.cookie.value }
            });
            assert.strictEqual(studentUpdateRes.statusCode, 403, "Student should be forbiddent");


            // Update.
            const updateRes = await fastify.inject(
            {
                method  : 'PATCH',
                url     : ROUTE_ENDPOINTS.EXAMS.patchSingle(inserted_data[0].m_uuid),
                payload : update_data,
                cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: admin_session.cookie.value }
            });
            assert.strictEqual(updateRes.statusCode, 204);

            // Select the updated object.
            const selected_obj = await fastify.db
            .select()
            .from(t_exams)
            .where(
                eq(t_exams.m_uuid, inserted_data[0].m_uuid)
              );

            // Check if the data where actually updated.
            assert.strictEqual(selected_obj.length, 1);
            assert.strictEqual(selected_obj[0].m_semester, update_data.m_semester);
            assert.strictEqual(selected_obj[0].m_year, update_data.m_year);
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
                url     : ROUTE_ENDPOINTS.EXAMS.deleteSingle(uuidv7()),
                cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: admin_session.cookie.value }
            });
            assert.strictEqual(no_object_del_res.statusCode, 404, "Should not exist");

            // New data.
            const new_data: Static<typeof ExamCreateReqSchema> =
            {
                m_semester: "FALL",
                m_year    : 2026
            };

            // Insert the subjects.
            const inserted_data = await examInsertHelper(fastify, admin_session.cookie, [new_data]);

            // Try to delete the subject without a session.
            const no_session_del_res = await fastify.inject(
            {
                method  : 'DELETE',
                url     : ROUTE_ENDPOINTS.EXAMS.deleteSingle(inserted_data[0].m_uuid)
            });
            assert.strictEqual(no_session_del_res.statusCode, 401, "Should be unauthorized");


            // Try to delete the object as a student.
            const student_del_res = await fastify.inject(
            {
                method  : 'DELETE',
                url     : ROUTE_ENDPOINTS.EXAMS.deleteSingle(inserted_data[0].m_uuid),
                cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: student_session.cookie.value }
            });
            assert.strictEqual(student_del_res.statusCode, 403, "Should be forbidden");


            // Try to delete the object as the admin.
            const admin_del_res = await fastify.inject(
            {
                method  : 'DELETE',
                url     : ROUTE_ENDPOINTS.EXAMS.deleteSingle(inserted_data[0].m_uuid),
                cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: admin_session.cookie.value }
            });
            assert.strictEqual(admin_del_res.statusCode, 204);

            // Check that the object was actually deleted.
            const selected_object = await fastify.db
            .select()
            .from(t_exams)
            .where(
              eq(t_exams.m_uuid, inserted_data[0].m_uuid)
            );
            assert.strictEqual(selected_object.length, 0);
        });
    });
});

