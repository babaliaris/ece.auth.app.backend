import { test, describe} from 'node:test';
import assert from 'node:assert';
import { vampifySetupE2E } from "@vampify/test";
import { vampifyApp } from "@/app.js";
import { Static } from '@sinclair/typebox';
import { ROUTE_ENDPOINTS } from "@/literals.js"
import { VAMPIFY_LITERALS } from '@vampify/literals';

import { UserCreateSchema, UserDataSchema } from '@/typescript/schemas/users.schema.js';

import { t_devices } from '@/db/schema.js';

describe('Users Tests', () =>
{
    const e2e_setup = vampifySetupE2E(vampifyApp);



    test('user should be posted', async () =>
    {
        await e2e_setup.runInTransaction(async (fastify)=>
        {
            const user_data: Static<typeof UserCreateSchema> =
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

            const response_user: Static<typeof UserDataSchema>
            = userPostRes.json< Static<typeof UserDataSchema> >();

            assert.ok(response_user.m_uuid);
            assert.strictEqual(response_user.m_email, user_data.m_email);
        });
    });




    test('user post should fail (password requirments)', async () =>
    {
        await e2e_setup.runInTransaction(async (fastify)=>
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




    test('user should Login and Logout as BROWSER', async () =>
    {
        await e2e_setup.runInTransaction(async (fastify) =>
        {
            const email = `browser_${Date.now()}@vampify.com`;
            const pass  = "Password@123";

            // Create User
            await e2e_setup.fastify.inject(
            {
                method  : 'POST',
                url     : ROUTE_ENDPOINTS.USERS.ROOT,
                payload : { m_email: email, m_pass: pass }
            });

            // Login as Browser (no device info)
            const loginRes = await e2e_setup.fastify.inject(
            {
                method  : 'POST',
                url     : ROUTE_ENDPOINTS.USERS.LOGIN,
                payload :
                { 
                    m_email: email,
                    m_pass: pass,
                }
            });
            assert.strictEqual(loginRes.statusCode, 200);
            assert.ok(loginRes.body);
            
            // For browsers, token should be null in body (it's in the cookie)
            const loginBody = loginRes.json<{token: string | null, body: any}>();
            assert.strictEqual(loginBody.token, null);
            
            // Extract cookie for the next request
            const cookie = loginRes.cookies.find(c => c.name === VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME);
            assert.ok(cookie, "Browser login should return an auth cookie");

            // Logout
            const logoutRes = await e2e_setup.fastify.inject(
            {
                method  : 'POST',
                url     : ROUTE_ENDPOINTS.USERS.LOGOUT,
                cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: cookie.value }
            });

            assert.strictEqual(logoutRes.statusCode, 204);
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
                    m_platform      : "ANDROID",
                    m_device_id     : device_id,
                    m_device_token  : device_token
                }
            });
            assert.strictEqual(loginRes.statusCode, 200);
            assert.ok(loginRes.body);
            
            // Get the body and check the token property.
            const loginBody = loginRes.json<{token: string | null, body: any}>();
            assert.ok(loginBody.token, "Native login should return token in body");

            // Verify device exists in DB (Optional but good for peace of mind)
            // You could query the DB directly here using e2e_setup.fastify.db
            const deviceSelectRes = await fastify.db
            .select()
            .from(t_devices)
            .limit(1);
            assert.strictEqual(deviceSelectRes.length, 1);
            assert.strictEqual(deviceSelectRes[0].m_platform, "ANDROID");
            assert.strictEqual(deviceSelectRes[0].m_device_id, device_id);
            assert.strictEqual(deviceSelectRes[0].m_device_token, device_token);

            // Logout (Must send Bearer Token AND Device ID Header)
            const logoutRes = await e2e_setup.fastify.inject(
            {
                method  : 'POST',
                url     : ROUTE_ENDPOINTS.USERS.LOGOUT,
                headers :
                {
                    'Authorization': `Bearer ${loginBody.token}`,
                    [VAMPIFY_LITERALS.X_NATIVE_DEVICE_ID]: device_id
                }
            });

            assert.strictEqual(logoutRes.statusCode, 204);
        });
    });



    test('user should fail to Login as NATIVE APP (BAD REQUEST)', async () =>
    {
        await e2e_setup.runInTransaction(async (fastify) =>
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

});