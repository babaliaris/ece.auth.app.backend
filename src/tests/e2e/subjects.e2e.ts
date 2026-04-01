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
    registerLoginAsBrowserHelper,
    subjectsInsertHelper,
} from '../test-helpers.js';
import { SubjectCreateRepSchema, SubjectCreateReqSchema, SubjectUpdateReqSchema } from '@/typescript/schemas/subjects.schema.js';
import { UserRolesE } from '@/typescript/types/ece-types.js';
import { stdPaginationReplySchema } from '@/typescript/schemas/standard.schema.js';
import { t_subjects } from '@/db/schema.js';


describe('Subjects Tests', () =>
{
    const e2e_setup = vampifySetupE2E(vampifyApp);

    test('subject should POST 2 objects (ADMIN)', async () =>
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
                m_email: `browser_${Date.now()}@vampify.com`,
                m_pass: "Password@123"
              },
              UserRolesE.STUDENT
            );


            // New Subjects Data array.
            const subjects: Static<typeof SubjectCreateReqSchema>[] =
            [
                {
                    m_name: "Name1",
                    m_school: "School1"
                },

                {
                    m_name: "Name2",
                    m_school: "School2"
                }
            ];


            // POST without a session.
            const no_session_post = await fastify.inject(
            {
                method  : 'POST',
                url     : ROUTE_ENDPOINTS.SUBJECTS.ROOT,
                payload : subjects,
            });
            assert.strictEqual(no_session_post.statusCode, 401, "Should be unauthorized");


            // POST as student.
            const student_post = await fastify.inject(
            {
                method  : 'POST',
                url     : ROUTE_ENDPOINTS.SUBJECTS.ROOT,
                payload : subjects,
                cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: student_session.cookie.value }
            });
            assert.strictEqual(student_post.statusCode, 403, "Should be forbidden 403");

            // Insert as Admin.
            await subjectsInsertHelper(fastify, admin_session.cookie, subjects);
        });
    });



    test('subject should POST 50 Objects & Get them through Pagination', async () =>
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


            // New Subjects Data array.
            const subjects: Static<typeof SubjectCreateReqSchema>[] = [];
            for (let i = 0; i < 50; i++)
            {
              subjects.push(
              {
                  m_name  : `Name${i}`,
                  m_school: `School${i}`
              });
            };

            // Insert the subjects.
            await subjectsInsertHelper(fastify, cookie, subjects);

            // Paginate through the objects 5 time (5 pages).
            const limit       = 10;
            const totalPages  = Math.ceil(subjects.length / limit);
            for (let page = 0; page < totalPages; page++ )
            {
              const subjGetRes = await fastify.inject(
              {
                  method  : 'GET',
                  url     : ROUTE_ENDPOINTS.SUBJECTS.ROOT,
                  query   : {m_page: String(page), m_limit: String(limit)},
              });
              assert.strictEqual(subjGetRes.statusCode, 200);

              // Get the pagination response and check it.
              const repSchema = stdPaginationReplySchema(SubjectCreateRepSchema);
              const get_res   = subjGetRes.json< Static<typeof repSchema>  >();
              assert(get_res && get_res.m_data && Array.isArray(get_res.m_data));

              // Check the meta object.
              assert.strictEqual(get_res.m_meta.m_current_page, page);
              assert.strictEqual(get_res.m_meta.m_total_pages, totalPages);
              assert.strictEqual(get_res.m_meta.m_limit, limit)

              // Check the data.
              for (let i = 0; i < get_res.m_data.length; i++)
              {
                assert.ok(get_res.m_data[i].m_uuid && typeof get_res.m_data[i].m_uuid === "string");
                assert.strictEqual(get_res.m_data[i].m_name, subjects[page * limit + i].m_name);
                assert.strictEqual(get_res.m_data[i].m_school, subjects[page * limit + i].m_school);
              }
            }
        });
    });


    test('subject should GET no data (Empty List Pagination)', async () =>
    {
        await e2e_setup.runInTransaction(async (fastify) =>
        {
            //Do not add any data.

            // Try to get the first page.
            const subjGetRes = await fastify.inject(
            {
                method  : 'GET',
                url     : ROUTE_ENDPOINTS.SUBJECTS.ROOT,
                query   : {m_page: String(0), m_limit: String(10)},
            });
            assert.strictEqual(subjGetRes.statusCode, 200);

            // Get the response data and check it.
            const repSchema = stdPaginationReplySchema(SubjectCreateRepSchema);
            const get_res   = subjGetRes.json< Static<typeof repSchema>  >();
            assert(get_res && get_res.m_data && Array.isArray(get_res.m_data));

            // Make sure the data property is an empty array.
            assert.strictEqual(get_res.m_data.length, 0);

            // Check the meta data.
            assert.strictEqual(get_res.m_meta.m_limit, 10);
            assert.strictEqual(get_res.m_meta.m_current_page, 0);
            assert.strictEqual(get_res.m_meta.m_total_pages, 1);
        });
    });



    test('subject should PATCH', async () =>
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


            // New Subject.
            const new_subj: Static<typeof SubjectCreateReqSchema> =
            {
                m_name: "Name",
                m_school: "School"
            };

            // Insert the subjects.
            const subjects = await subjectsInsertHelper(fastify, admin_session.cookie, [new_subj]);
            assert.strictEqual(subjects.length, 1);


            // Update data.
            const update_data: Static<typeof SubjectUpdateReqSchema> =
            {
                m_name: "Name_updated",
                m_school: "School_updated"
            };


            // Update the subject without a session.
            const noSessionUpdateRes = await fastify.inject(
            {
                method  : 'PATCH',
                url     : ROUTE_ENDPOINTS.SUBJECTS.patchSingle(subjects[0].m_uuid),
                payload : update_data,
            });
            assert.strictEqual(noSessionUpdateRes.statusCode, 401, "Should be unauthorized");


            // Update the subject using the student session.
            const studentUpdateRes = await fastify.inject(
            {
                method  : 'PATCH',
                url     : ROUTE_ENDPOINTS.SUBJECTS.patchSingle(subjects[0].m_uuid),
                payload : update_data,
                cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: student_session.cookie.value }
            });
            assert.strictEqual(studentUpdateRes.statusCode, 403, "Student should be forbiddent");


            // Update the subject.
            const subjUpdateRes = await fastify.inject(
            {
                method  : 'PATCH',
                url     : ROUTE_ENDPOINTS.SUBJECTS.patchSingle(subjects[0].m_uuid),
                payload : update_data,
                cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: admin_session.cookie.value }
            });
            assert.strictEqual(subjUpdateRes.statusCode, 204);

            // Select the updated subject.
            const selected_subj = await fastify.db
            .select()
            .from(t_subjects)
            .where(
                eq(t_subjects.m_uuid, subjects[0].m_uuid)
              );

            // Check if the data where actually updated.
            assert.strictEqual(selected_subj.length, 1);
            assert.strictEqual(selected_subj[0].m_name, update_data.m_name);
            assert.strictEqual(selected_subj[0].m_school, update_data.m_school);
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
                url     : ROUTE_ENDPOINTS.SUBJECTS.delete(uuidv7()),
                cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: admin_session.cookie.value }
            });
            assert.strictEqual(no_object_del_res.statusCode, 404, "Should not exist");

            // New Subject.
            const new_subj: Static<typeof SubjectCreateReqSchema> =
            {
                m_name: "Name",
                m_school: "School"
            };

            // Insert the subjects.
            const subjects = await subjectsInsertHelper(fastify, admin_session.cookie, [new_subj]);
            assert.strictEqual(subjects.length, 1);


            // Try to delete the subject without a session.
            const no_session_del_res = await fastify.inject(
            {
                method  : 'DELETE',
                url     : ROUTE_ENDPOINTS.SUBJECTS.delete(subjects[0].m_uuid)
            });
            assert.strictEqual(no_session_del_res.statusCode, 401, "Should be unauthorized");


            // Try to delete the object as a student.
            const student_del_res = await fastify.inject(
            {
                method  : 'DELETE',
                url     : ROUTE_ENDPOINTS.SUBJECTS.delete(subjects[0].m_uuid),
                cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: student_session.cookie.value }
            });
            assert.strictEqual(student_del_res.statusCode, 403, "Should be forbidden");


            // Try to delete the object as the admin.
            const admin_del_res = await fastify.inject(
            {
                method  : 'DELETE',
                url     : ROUTE_ENDPOINTS.SUBJECTS.delete(subjects[0].m_uuid),
                cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: admin_session.cookie.value }
            });
            assert.strictEqual(admin_del_res.statusCode, 204);

            // Check that the object was actually deleted.
            const selected_object = await fastify.db
            .select()
            .from(t_subjects)
            .where(
              eq(t_subjects.m_uuid, subjects[0].m_uuid)
            );
            assert.strictEqual(selected_object.length, 0);
        });
    });
});

