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

import {
  SubjectCreateRepSchema,
  SubjectCreateReqSchema
} from '@/typescript/schemas/subjects.schema.js';

import {
  ExamCreateRepSchema, ExamCreateReqSchema
} from '@/typescript/schemas/exams.schema.js';

import {
  ExaminationCreateRepSchema, ExaminationCreateReqSchema
} from '@/typescript/schemas/examinations.schema.js';
import { StudentExaminationCreateRepSchema, StudentExaminationCreateReqSchema } from '@/typescript/schemas/student-examinations.schema.js';




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


export async function subjectsInsertHelper(
  fastify : VampifyInstance,
  cookie  : LightMyRequestResponse['cookies'][number],
  subjects: Static<typeof SubjectCreateReqSchema>[]
): Promise< Static<typeof SubjectCreateRepSchema>[] >
{
  // POST the new subjects.
  const subjPostRes = await fastify.inject(
  {
      method  : 'POST',
      url     : ROUTE_ENDPOINTS.SUBJECTS.ROOT,
      payload : subjects,
      cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: cookie.value }
  });
  assert.strictEqual(subjPostRes.statusCode, 201);

  // Check the response object.
  const res_subjects = subjPostRes.json<Static<typeof SubjectCreateRepSchema>[]>();
  assert.ok(res_subjects && Array.isArray(res_subjects));
  assert.strictEqual(res_subjects.length, subjects.length);

  // Check the response properties.V
  for (let i = 0; i < subjects.length; i++)
  {
    assert(res_subjects[i].m_uuid && typeof res_subjects[i].m_uuid === "string");
    assert.strictEqual(res_subjects[i].m_name, subjects[i].m_name);
    assert.strictEqual(res_subjects[i].m_school, subjects[i].m_school);
  }

  return res_subjects;
}



export async function examInsertHelper(
  fastify : VampifyInstance,
  cookie  : LightMyRequestResponse['cookies'][number],
  data    : Static<typeof ExamCreateReqSchema>[]
): Promise< Static<typeof ExamCreateRepSchema>[] >
{
  // POST.
  const postRes = await fastify.inject(
  {
      method  : 'POST',
      url     : ROUTE_ENDPOINTS.EXAMS.ROOT,
      payload : data,
      cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: cookie.value }
  });
  assert.strictEqual(postRes.statusCode, 201);

  // Check the response object.
  const res_body = postRes.json<Static<typeof ExamCreateRepSchema>[]>();
  assert.ok(res_body && Array.isArray(res_body));
  assert.strictEqual(res_body.length, data.length);

  // Check the response properties.V
  for (let i = 0; i < data.length; i++)
  {
    assert(res_body[i].m_uuid && typeof res_body[i].m_uuid === "string");
    assert.strictEqual(res_body[i].m_semester, data[i].m_semester);
    assert.strictEqual(res_body[i].m_year, data[i].m_year);
  }

  return res_body;
}



export async function examinationsInsertHelper(
  fastify : VampifyInstance,
  cookie  : LightMyRequestResponse['cookies'][number],
  data    : Static<typeof ExaminationCreateReqSchema>[]
): Promise< Static<typeof ExaminationCreateRepSchema>[] >
{
  // POST.
  const postRes = await fastify.inject(
  {
      method  : 'POST',
      url     : ROUTE_ENDPOINTS.EXAMINATIONS.ROOT,
      payload : data,
      cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: cookie.value }
  });
  assert.strictEqual(postRes.statusCode, 201);

  // Check the response object.
  const res_body = postRes.json<Static<typeof ExaminationCreateRepSchema>[]>();
  assert.ok(res_body && Array.isArray(res_body));
  assert.strictEqual(res_body.length, data.length);

  // Check the response properties.
  for (let i = 0; i < data.length; i++)
  {
    assert(res_body[i].m_uuid && typeof res_body[i].m_uuid === "string");
    assert.strictEqual(res_body[i].m_note, data[i].m_note);
    assert.strictEqual(res_body[i].m_datetime, data[i].m_datetime);
    assert.strictEqual(res_body[i].m_subject_uuid, data[i].m_subject_uuid);
    assert.strictEqual(res_body[i].m_exam_uuid, data[i].m_exam_uuid);
  }

  return res_body;
}



export async function studentExaminationsInsertHelper(
  fastify : VampifyInstance,
  cookie  : LightMyRequestResponse['cookies'][number],
  data    : Static<typeof StudentExaminationCreateReqSchema>[]
): Promise< Static<typeof StudentExaminationCreateRepSchema>[] >
{
  // POST.
  const postRes = await fastify.inject(
  {
      method  : 'POST',
      url     : ROUTE_ENDPOINTS.STUDENT_EXAMINATIONS.ROOT,
      payload : data,
      cookies : { [VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME]: cookie.value }
  });
  assert.strictEqual(postRes.statusCode, 201);

  // Check the response object.
  const res_body = postRes.json<Static<typeof StudentExaminationCreateRepSchema>[]>();
  assert.ok(res_body && Array.isArray(res_body));
  assert.strictEqual(res_body.length, data.length);

  // Check the response properties.
  for (let i = 0; i < data.length; i++)
  {
    assert(res_body[i].m_uuid && typeof res_body[i].m_uuid === "string");
    assert.strictEqual(res_body[i].m_note, data[i].m_note);
    assert.strictEqual(res_body[i].m_subjects_exams_uuid, data[i].m_subjects_exams_uuid);
  }

  return res_body;
}

