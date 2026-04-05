import { test, describe} from 'node:test';
import assert from 'node:assert';
import { vampifySetupE2E } from "@vampify/test";
import { vampifyApp } from "@/app.js";
import { Static } from '@sinclair/typebox';
import { ROUTE_ENDPOINTS } from "@/literals.js"
import { VAMPIFY_LITERALS } from '@vampify/literals';
import { UserCreateSchema, UserDataSchema } from '@/typescript/schemas/users.schema.js';

import {
    registerLoginAsBrowserHelper,
    registerLoginAsNativeAppHelper
} from '../test-helpers.js';
import { t_users } from '@/db/schema.js';


describe('Users Tests', () =>
{
    const e2e_setup = vampifySetupE2E(vampifyApp);


    test('user should Login and Logout as BROWSER', async () =>
    {
        await e2e_setup.runInTransaction(async (fastify) =>
        {
            const email = `browser_${Date.now()}@vampify.com`;
            const pass  = "Password@123";

            const {cookie} = await registerLoginAsBrowserHelper(fastify,
            {
                m_email: email, 
                m_pass: pass
            });


            // Check /me session validation.
            const getMeRes = await fastify.inject(
            {
                method  : 'GET',
                url     : ROUTE_ENDPOINTS.USERS.ME,
                cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: cookie.value }
            });
            assert.strictEqual(getMeRes.statusCode, 200);
            const get_me_body = getMeRes.json<Static<typeof UserDataSchema>>();
            assert.ok(get_me_body);
            assert.strictEqual(get_me_body.m_email, email);
            assert.strictEqual(get_me_body.m_role, "STUDENT");
            assert.ok(get_me_body.m_uuid);

            // Logout
            const logoutRes = await fastify.inject(
            {
                method  : 'POST',
                url     : ROUTE_ENDPOINTS.USERS.LOGOUT,
                cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: cookie.value }
            });

            assert.strictEqual(logoutRes.statusCode, 204);
        });
    });



    test('user post should fail (password requirments)', async () =>
    {
        await e2e_setup.runInTransaction(async ()=>
        {
            const user_data: Static<typeof UserCreateSchema> =
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




    test('user should Login and Logout as NATIVE APP', async () =>
    {
        await e2e_setup.runInTransaction(async (fastify) =>
        {
            const email         = `native_${Date.now()}@vampify.com`;
            const pass          = "Password@123";
            const device_id     = "test-uuid-device-123";
            const device_token  = "fcm-token-abc-123";

            const {token} = await registerLoginAsNativeAppHelper(fastify,
            {
                m_email: email,
                m_pass: pass
            },
            {
                m_email         : email,
                m_pass          : pass,
                m_device_id     : device_id,
                m_device_token  : device_token,
                m_platform      : "ANDROID"
            });


            // Check /me session validation.
            const getMeRes = await fastify.inject(
            {
                method  : 'GET',
                url     : ROUTE_ENDPOINTS.USERS.ME,
                headers :
                {
                    'Authorization': `Bearer ${token}`,
                    [VAMPIFY_LITERALS.X_NATIVE_DEVICE_ID]: device_id
                }
            });
            assert.strictEqual(getMeRes.statusCode, 200);
            const get_me_body = getMeRes.json<Static<typeof UserDataSchema>>();
            assert.ok(get_me_body);
            assert.strictEqual(get_me_body.m_email, email);
            assert.strictEqual(get_me_body.m_role, "STUDENT");
            assert.ok(get_me_body.m_uuid);

            // Logout (Must send Bearer Token AND Device ID Header)
            const logoutRes = await e2e_setup.fastify.inject(
            {
                method  : 'POST',
                url     : ROUTE_ENDPOINTS.USERS.LOGOUT,
                headers :
                {
                    'Authorization': `Bearer ${token}`,
                    [VAMPIFY_LITERALS.X_NATIVE_DEVICE_ID]: device_id
                }
            });

            assert.strictEqual(logoutRes.statusCode, 204);
        });
    });



    test('user should fail to Login as NATIVE APP (BAD REQUEST)', async () =>
    {
        await e2e_setup.runInTransaction(async () =>
        {
            const email         = `native_${Date.now()}@vampify.com`;
            const pass          = "Password@123";
            const device_id     = "test-uuid-device-123";

            // Create User
            await e2e_setup.fastify.inject(
            {
                method  : 'POST',
                url     : ROUTE_ENDPOINTS.USERS.ROOT,
                payload : { m_email: email, m_pass: pass }
            });

            // Login as Native App
            const loginRes = await e2e_setup.fastify.inject(
            {
                method  : 'POST',
                url     : ROUTE_ENDPOINTS.USERS.LOGIN,
                payload :
                {
                    m_email         : email,
                    m_pass          : pass,
                    m_device_id     : device_id,
                    // Do note provide platform & device_token
                    // which are required when device_id IS provided.
                }
            });
            assert.strictEqual(loginRes.statusCode, 400, "Should return bad request for not providing required device data");
        });
    });


    test('user should have the correct data posted', async () =>
    {
        await e2e_setup.runInTransaction(async (fastify) =>
        {
            const email = `browser_${Date.now()}@vampify.com`;
            const pass  = "Password@123";

            await registerLoginAsBrowserHelper(fastify,
            {
                m_email: email, 
                m_pass: pass
            });
            
            // Select the data directly from the database
            // because the registerLoginAsBrowserHelper result
            // does not return every user property.
            const selectRes = await fastify.db
            .select()
            .from(t_users)
            .limit(1);

            assert(selectRes && selectRes.length);
            assert.strictEqual(selectRes.length, 1, "I only inserted one user");
            assert(selectRes[0].m_uuid && typeof selectRes[0].m_uuid === "string");
            assert.strictEqual(selectRes[0].m_email, email);
            assert.strictEqual(selectRes[0].m_role, "STUDENT");
        });
    });

});
