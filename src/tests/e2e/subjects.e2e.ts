
import { test, describe} from 'node:test';
import assert from 'node:assert';
import { vampifySetupE2E } from "@vampify/test";
import { vampifyApp } from "@/app.js";
import { Static } from '@sinclair/typebox';
import { ROUTE_ENDPOINTS } from "@/literals.js"
import { VAMPIFY_LITERALS } from '@vampify/literals';

import {
    registerLoginAsBrowserHelper,
} from '../test-helpers.js';
import { SubjectCreateRepSchema, SubjectCreateReqSchema } from '@/typescript/schemas/subjects.schema.js';
import { UserRolesE } from '@/typescript/types/ece-types.js';


describe('Subjects Tests', () =>
{
    const e2e_setup = vampifySetupE2E(vampifyApp);

    test('subject should POST (ADMIN)', async () =>
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
                payload : new_subject,
                cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: cookie.value }
            });
            assert.strictEqual(subjPostRes.statusCode, 201);

            // Check the response object.
            const res_subject = subjPostRes.json<Static<typeof SubjectCreateRepSchema>>();
            assert.ok(res_subject);

            // Check the response properties.
            assert(res_subject.m_uuid && typeof res_subject.m_uuid === "string");
            assert.strictEqual(res_subject.m_name, new_subject.m_name);
            assert.strictEqual(res_subject.m_school, new_subject.m_school);
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
                payload : new_subject,
                cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: cookie.value }
            });
            assert.strictEqual(subjPostRes.statusCode, 403, "Should be forbidden 403");
        });
    });


});

