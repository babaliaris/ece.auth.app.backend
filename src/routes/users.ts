import { FastifyPluginAsync } from "fastify";
import { ROUTE_ENDPOINTS } from "../literals.js"
import { eq, and } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { Static, Type } from "@sinclair/typebox";
import {
    VampifyInstance, VAMPIFY_LITERALS,
    VampifyStandardResponseErrors
} from "@vampify/literals";

import {
    UserCreateSchema, UserDataSchema,
    UserLoginSchema
} from "@/typescript/schemas/users.schema.js";

import {
    t_users, t_devices
} from "@/db/schema.js";

import { EceJwtPayload } from "@/typescript/types/ece-types.js";



const users: FastifyPluginAsync = async (fastify: VampifyInstance): Promise<void>=>
{
    /**
     * Register.
     */
    fastify.post(ROUTE_ENDPOINTS.USERS.ROOT,
    {
        schema:
        {
            tags        : ['Users'],
            summary     : "Creates a new User",
            description : "Creates a new User",
            body        : UserCreateSchema,
            response    :
            {
                201: UserDataSchema,
                400: VampifyStandardResponseErrors[400],
                409: VampifyStandardResponseErrors[409]
            }
        }
    },
    async (req, res)=>
    {
        const new_uuid = uuidv7();

        // Insert the user.
        await fastify.db
        .insert(t_users)
        .values(
        {
            m_uuid : new_uuid,
            m_email: req.body.m_email,
            m_pass : await fastify.vampifyHashCreate(req.body.m_pass)
        });

        return res.status(201).send(
        {
            m_uuid  : new_uuid,
            m_email : req.body.m_email,
            m_role  : "STUDENT" // Default Role.
        })
    });


    /**
     * Login.
     */
    fastify.post(ROUTE_ENDPOINTS.USERS.LOGIN,
    {
        schema:
        {
            tags        : ['Users'],
            summary     : "Log In",
            description : "If no device and platform data is provided, we assume a \
            BROWSER loggin and return the session as HttpOnly cookie. \
            Otherwise, we return the JTW token in the body.",
            body        : UserLoginSchema,
            response    :
            {
                200: Type.Object(
                {
                    token   : Type.Union([Type.String(), Type.Null()]),
                    body    : UserDataSchema
                }),
                400: VampifyStandardResponseErrors[400],
                401: VampifyStandardResponseErrors[401]
            }
        }
    },
    async (req, rep)=>
    {
        // Find the user by email.
        const selectedUsers = await fastify.db
        .select()
        .from(t_users)
        .where(
            eq(t_users.m_email, req.body.m_email)
        );

        // User was not found.
        req.vampifyAbort(
        selectedUsers.length !== 0,
        401,
        `User email = ${req.body.m_email} , was NOT found`,
        {
            email: req.body.m_email
        });

        // Compare the hashed password with the password provided in the request.
        const check_password = await fastify.vampifyHashCompare(
            req.body.m_pass,
            selectedUsers[0].m_pass
        );

        // Password did not match.
        req.vampifyAbort(
        check_password,
        401,
        `User email = ${req.body.m_email} , provided a wrong password`,
        {
            email: req.body.m_email
        });

        // If device id is provided, this is a native app. Upload device information.
        if (req.body.m_device_id)
        {
            // Check that device required parameters are present.
            req.vampifyAbort(
                req.body.m_platform && req.body.m_device_token,
                400,
                `Device ID was provided without the platform and the device token`,
                {
                    email       : req.body.m_email,
                    device_id   : req.body.m_device_id
                }
            );

            const uuid = uuidv7();

            await fastify.db
            .insert(t_devices)
            .values(
            {
                m_uuid          : uuid,
                m_device_id     : req.body.m_device_id,
                m_platform      : req.body.m_platform! as "ANDROID" | "IOS" | "BROWSER",
                m_device_token  : req.body.m_device_token!,
                m_user_uuid     : selectedUsers[0].m_uuid
            })
            .onDuplicateKeyUpdate(
            {
                set:
                {
                    m_device_token  : req.body.m_device_token,
                    m_platform      : req.body.m_platform 
                }
            });
        }

        // Sign the payload.
        const ONE_HOUR = 60 * 60;
        const ONE_YEAR = 365 * 24 * 60 * 60;
        return rep.vampifySignPayload<Static<typeof UserDataSchema>, EceJwtPayload>(
            // User UUID.
            selectedUsers[0].m_uuid,

            // A custom body payload for the response.
            {
                m_uuid  : selectedUsers[0].m_uuid,
                m_email : selectedUsers[0].m_email,
                m_role  : selectedUsers[0].m_role
            },

            // A custom payload for the JWT token, to be used at
            // any protected endpoint.
            {
                device_id   : req.body.m_device_id,
                expires     : req.body.m_device_id ? ONE_YEAR : ONE_HOUR,
                jwt_data    :
                {
                    m_email : selectedUsers[0].m_email,
                    m_role  : selectedUsers[0].m_role
                }
            }
        );
    });



    /**
     * Logout.
    */
    fastify.post(ROUTE_ENDPOINTS.USERS.LOGOUT,
    {
        preHandler  : [fastify.vampifyAuth],
        schema      :
        {
            tags        : ['Users'],
            summary     : "Log Out",
            description : "Clears the session and removes the device token from the notification list.",
            security    :
            [
                {
                    BearerAuth      : [],
                    NativeDeviceID  : []
                },
                { 
                    cookieAuth      : []
                } 
            ],
            response    :
            {
                204: Type.Null(),
                400: VampifyStandardResponseErrors[400],
                401: VampifyStandardResponseErrors[401]
            }
        },
    }, 
    async (req, rep) =>
    {
        const payload = req.vampify_payload!;

        // If it's a native app, delete the device entry
        const device_id = req.headers[VAMPIFY_LITERALS.X_NATIVE_DEVICE_ID];
        if (device_id && typeof device_id === "string")
        {
            await fastify.db
            .delete(t_devices)
            .where(
                and(
                    eq(t_devices.m_user_uuid, payload.user_id),
                    eq(t_devices.m_device_id, device_id)
                )
            );
        }

        // Clear the cookie for browsers
        return rep
            .clearCookie(VAMPIFY_LITERALS.PAYLOAD_COOKIE_NAME, { path: '/' })
            .status(204)
            .send(null);
    });


    /**
     * Me.
     */
    fastify.get(ROUTE_ENDPOINTS.USERS.ME,
    {
        preHandler  : [fastify.vampifyAuth],
        schema      :
        {
            tags        : ['Users'],
            summary     : "Checks if the user session is valid",
            description : "Use this from your front-end app, to check if a user session is valid",
            security    :
            [
                {
                    BearerAuth      : [],
                    NativeDeviceID  : []
                },
                { 
                    cookieAuth      : []
                } 
            ],
            response    :
            {
                200: UserDataSchema,
                400: VampifyStandardResponseErrors[400],
                401: VampifyStandardResponseErrors[401]
            }
        },
    }, 
    async (req, rep) =>
    {
      const user_uuid = req.vampify_payload!.user_id;
      const jwt_data  = req.vampify_payload!.data! as EceJwtPayload;

      return rep.status(200).send(
      {
        m_uuid  : user_uuid,
        m_email : jwt_data.m_email,
        m_role  : jwt_data.m_role
      });
    });
};

export default users;
