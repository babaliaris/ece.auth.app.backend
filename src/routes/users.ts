import { FastifyPluginAsync } from "fastify";
import { VampifyInstance, VampifyStandardResponseErrors } from "@vampify/literals";
import { ROUTE_ENDPOINTS } from "../literals.js"
import { RequestUserSchema, ResponseUserSchema } from "@/typescript/schemas/users.schema.js";
import { t_users } from "@/db/schema.js";
import { v7 as uuidv7 } from "uuid";

const users: FastifyPluginAsync = async (fastify: VampifyInstance): Promise<void>=>
{
    fastify.post(ROUTE_ENDPOINTS.USERS.ROOT,
    {
        schema:
        {
            tags        : ['Users'],
            summary     : "Creates a new User",
            description : "Creates a new User",
            body        : RequestUserSchema,
            response    :
            {
                201: ResponseUserSchema,
                ...VampifyStandardResponseErrors
            }
        }
    },
        async (req, res)=>
        {
            const new_uuid = uuidv7();
            
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
                m_email : req.body.m_email
            })
        });
};

export default users;
