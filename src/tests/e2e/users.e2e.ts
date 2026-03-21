import { test, describe} from 'node:test';
import assert from 'node:assert';
import { vampifySetupE2E } from "@vampify/test";
import { vampifyApp } from "@/app.js";
import { Static } from '@sinclair/typebox';
import { ROUTE_ENDPOINTS } from "@/literals.js"

import { RequestUserSchema, ResponseUserSchema } from '@/typescript/schemas/users.schema.js';

describe('Users Tests', () =>
{
    const e2e_setup = vampifySetupE2E(vampifyApp);

    test('user should be posted', async () =>
    {
        await e2e_setup.runInTransaction(async (fastify)=>
        {
            const user_data: Static<typeof RequestUserSchema> =
            {
                m_email: `user_${Date.now()}_${Math.floor(Math.random() * 1000)}@gmail.com`,
                m_pass : "Password@12345678"
            };

            const userPostRes = await e2e_setup.fastify.inject(
            {
                method  : 'POST',
                url     : ROUTE_ENDPOINTS.USERS.ROOT,
                payload : user_data
            });

            assert.strictEqual(userPostRes.statusCode, 201);
            assert.ok(userPostRes.body);

            const response_user: Static<typeof ResponseUserSchema>
            = userPostRes.json< Static<typeof ResponseUserSchema> >();

            assert.ok(response_user.m_uuid);
            assert.strictEqual(response_user.m_email, user_data.m_email);
        });
    });


    test('user post should fail (password requirments)', async () =>
    {
        await e2e_setup.runInTransaction(async (fastify)=>
        {
            const user_data: Static<typeof RequestUserSchema> =
            {
                m_email: `user_${Date.now()}_${Math.floor(Math.random() * 1000)}@gmail.com`,
                m_pass : "pass123"
            };

            const userPostRes = await e2e_setup.fastify.inject(
            {
                method  : 'POST',
                url     : ROUTE_ENDPOINTS.USERS.ROOT,
                payload : user_data
            });

            assert.strictEqual(userPostRes.statusCode, 400);
        });
    });

});