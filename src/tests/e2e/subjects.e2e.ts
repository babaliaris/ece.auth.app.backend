
import { test, describe} from 'node:test';
import assert from 'node:assert';
import { vampifySetupE2E } from "@vampify/test";
import { vampifyApp } from "@/app.js";
import { Static } from '@sinclair/typebox';
import { ROUTE_ENDPOINTS } from "@/literals.js"
import { VAMPIFY_LITERALS } from '@vampify/literals';

import {
    registerLoginAsBrowserHelper,
    subjectsInsertHelper,
} from '../test-helpers.js';
import { SubjectCreateRepSchema, SubjectCreateReqSchema } from '@/typescript/schemas/subjects.schema.js';
import { UserRolesE } from '@/typescript/types/ece-types.js';
import { paginationReplySchema } from '@/typescript/schemas/standard.schema.js';


describe('Subjects Tests', () =>
{
    const e2e_setup = vampifySetupE2E(vampifyApp);

    test('subject should POST 2 objects (ADMIN)', async () =>
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

            // Insert and check.
            const rep_subjects = await subjectsInsertHelper(fastify, cookie, subjects);
            assert.strictEqual(rep_subjects.length, subjects.length);
        });
    });



    test('subject should FAIL to POST (NOT ADMIN)', async () =>
    {
        await e2e_setup.runInTransaction(async (fastify) =>
        {
            // Insert a user (DEFAULT ROLE IS STUDENT).
            const {cookie} = await registerLoginAsBrowserHelper(
              fastify,
              {
                m_email: `browser_${Date.now()}@vampify.com`,
                m_pass: "Password@123"
              }
            );


            // New Subject Data.
            const new_subject: Static<typeof SubjectCreateReqSchema> =
            {
                m_name: "Name",
                m_school: "School"
            };


            // POST a new subject.
            const subjPostRes = await e2e_setup.fastify.inject(
            {
                method  : 'POST',
                url     : ROUTE_ENDPOINTS.SUBJECTS.ROOT,
                payload : [new_subject],
                cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: cookie.value }
            });
            assert.strictEqual(subjPostRes.statusCode, 403, "Should be forbidden 403");
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
              const subjGetRes = await e2e_setup.fastify.inject(
              {
                  method  : 'GET',
                  url     : ROUTE_ENDPOINTS.SUBJECTS.ROOT,
                  query   : {m_page: String(page), m_limit: String(limit)},
                  cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: cookie.value }
              });
              assert.strictEqual(subjGetRes.statusCode, 200);

              // Get the pagination response and check it.
              const repSchema = paginationReplySchema(SubjectCreateRepSchema);
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


});

