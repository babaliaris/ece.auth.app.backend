import assert from 'node:assert';
import { eq } from 'drizzle-orm';
import { LightMyRequestResponse } from 'fastify';
import { VampifyInstance, VAMPIFY_LITERALS } from '@vampify/literals';
import { Static } from '@sinclair/typebox';
import { ROUTE_ENDPOINTS } from '@/literals.js';
import { t_devices, t_users } from '@/db/schema.js';

import {
    UserCreateSchema,
    UserDataSchema,
    UserLoginSchema
} from '@/typescript/schemas/users.schema.js';
import { UserRolesE } from '@/typescript/types/ece-types.js';




/**
 * Register and Login a user as Browser.
 * 
 * @param fastify The fastify instance.
 * @param user_data The user data to insert.
 * @returns An object containing the user data and the cookie session token.
 */
export async function registerLoginAsBrowserHelper(
    fastify     : VampifyInstance,
    user_data   : Static<typeof UserCreateSchema>,
    role        : UserRolesE = UserRolesE.STUDENT
): Promise<{user: Static<typeof UserDataSchema>, cookie: LightMyRequestResponse['cookies'][number]}>
{
    // Create the user.
    const userPostRes = await fastify.inject(
    {
        method  : 'POST',
        url     : ROUTE_ENDPOINTS.USERS.ROOT,
        payload : user_data
    });
    assert.strictEqual(userPostRes.statusCode, 201);
    assert.ok(userPostRes.body);

    // Get the USER POST response.
    const response_user: Static<typeof UserDataSchema>
    = userPostRes.json< Static<typeof UserDataSchema> >();

    // Check the user POST response.
    assert.ok(response_user.m_uuid);
    assert.strictEqual(response_user.m_email, user_data.m_email);


    // Update the role of the user.
    const [updateResult] = await fastify.db
    .update(t_users)
    .set(
    {
          m_role: role
    })
    .where(
        eq(t_users.m_uuid, response_user.m_uuid)
    );
    assert.strictEqual(updateResult.affectedRows, 1, "uuid should much exactly one row");


    // Login as Browser (no device info)
    const loginRes = await fastify.inject(
    {
        method  : 'POST',
        url     : ROUTE_ENDPOINTS.USERS.LOGIN,
        payload :
        { 
            m_email : user_data.m_email,
            m_pass  : user_data.m_pass
        }
    });
    assert.strictEqual(loginRes.statusCode, 200);
    assert.ok(loginRes.body);
    
    // For browsers, token should be null in body (it's in the cookie)
    //TODO REPLACE {token: string | null, body: any} with type provided by the vampify framework.
    const loginBody = loginRes.json<{token: string | null, body: any}>();
    assert.strictEqual(loginBody.token, null);
    
    // Extract cookie for the next request
    const cookie = loginRes.cookies.find(c => c.name === VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME);
    assert.ok(cookie, "Browser login should return an auth cookie");

    return {
        user    : response_user,
        cookie  : cookie
    }
}


/**
 * Register and Login a user as a Native App.
 * 
 * @param fastify The fastify instance.
 * @param user_data The user data to be inserted
 * @param login_data The login data to be used in the login request.
 * @returns The user data and the JTW token.
 */
export async function registerLoginAsNativeAppHelper(
    fastify     : VampifyInstance,
    user_data   : Static<typeof UserCreateSchema>,
    login_data  : Static<typeof UserLoginSchema>,
    role        : UserRolesE = UserRolesE.STUDENT
): Promise<{user: Static<typeof UserDataSchema>, token: string}>
{
    // Create the user.
    const userPostRes = await fastify.inject(
    {
        method  : 'POST',
        url     : ROUTE_ENDPOINTS.USERS.ROOT,
        payload : user_data
    });
    assert.strictEqual(userPostRes.statusCode, 201);
    assert.ok(userPostRes.body);

    // Get the USER POST response.
    const response_user: Static<typeof UserDataSchema>
    = userPostRes.json< Static<typeof UserDataSchema> >();

    // Check the user POST response.
    assert.ok(response_user.m_uuid);
    assert.strictEqual(response_user.m_email, user_data.m_email);

    // Update the role of the user.
    const [updateResult] = await fastify.db
    .update(t_users)
    .set(
    {
          m_role: role
    })
    .where(
        eq(t_users.m_uuid, response_user.m_uuid)
    );
    assert.strictEqual(updateResult.affectedRows, 1, "uuid should much exactly one row");

    // Login as Native App.
    const loginRes = await fastify.inject(
    {
        method  : 'POST',
        url     : ROUTE_ENDPOINTS.USERS.LOGIN,
        payload : login_data
    });
    assert.strictEqual(loginRes.statusCode, 200);
    assert.ok(loginRes.body);
    
    // Get the body and check the token property.
    const loginBody = loginRes.json<{token: string | null, body: any}>();
    assert.ok(loginBody.token, "Native login should return token in body");

    // Verify device exists in DB
    const deviceSelectRes = await fastify.db
    .select()
    .from(t_devices)
    .limit(1);
    assert.strictEqual(deviceSelectRes.length, 1);
    assert.strictEqual(deviceSelectRes[0].m_platform, login_data.m_platform);
    assert.strictEqual(deviceSelectRes[0].m_device_id, login_data.m_device_id);
    assert.strictEqual(deviceSelectRes[0].m_device_token, login_data.m_device_token);

    return {
        user  : response_user,
        token : loginBody.token
    }
}

