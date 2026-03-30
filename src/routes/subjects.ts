import { FastifyPluginAsync } from "fastify";
import { ROUTE_ENDPOINTS } from "../literals.js"
import { eq, and } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { Type } from "@sinclair/typebox";
import {
    VampifyInstance, VAMPIFY_LITERALS,
    VampifyStandardResponseErrors
} from "@vampify/literals";

import {
    SubjectCreateReqSchema, SubjectCreateRepSchema
} from "@/typescript/schemas/subjects.schema.js";

import {
    t_subjects
} from "@/db/schema.js";



const subjects: FastifyPluginAsync = async (fastify: VampifyInstance): Promise<void>=>
{
    /**
     * Create a new Subject.
     */
    fastify.post(ROUTE_ENDPOINTS.SUBJECTS.ROOT,
    {
        preHandler  :
        [
            fastify.vampifyAuth,
            fastify.eceAuthRequireRoles("ADMIN")
        ],
        schema      :
        {
            tags        : ['Subjects'],
            summary     : "Creates a new subject",
            description : "Creates a new subject",
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
            body        : SubjectCreateReqSchema,
            response    :
            {
                201: SubjectCreateRepSchema,
                400: VampifyStandardResponseErrors[400],
                401: VampifyStandardResponseErrors[400],
                409: VampifyStandardResponseErrors[409]
            }
        }
    },
    async (req, res)=>
    {
        // Get the user uuid and the role.
        const user_uuid = req.vampify_payload?.user_id;

        // Insert.
        const new_uuid = uuidv7();
        await fastify.db
        .insert(t_subjects)
        .values(
        {
            m_uuid  : new_uuid,
            m_name  : req.body.m_name,
            m_school: req.body.m_school
        });

        return res.status(201).send(
        {
            m_uuid  : new_uuid,
            m_name  : req.body.m_name,
            m_school: req.body.m_school
        });
    });



    /**
     * Get all subjects.
     * Anyone can get the subjects.
     */
    fastify.get(ROUTE_ENDPOINTS.SUBJECTS.ROOT,
    {
        preHandler  :
        [
            fastify.vampifyAuth
        ],
        schema      :
        {
            tags        : ['Subjects'],
            summary     : "Get all the subjects",
            description : "Get all the subjects",
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
                201: SubjectCreateRepSchema,
                400: VampifyStandardResponseErrors[400],
                401: VampifyStandardResponseErrors[401],
                404: VampifyStandardResponseErrors[404]
            }
        }
    },
    async (req, res)=>
    {

    });


};

export default subjects;
