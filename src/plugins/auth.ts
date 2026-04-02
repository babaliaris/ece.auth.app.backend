import fp from "fastify-plugin";
import { FastifyRequest, FastifyReply } from "fastify";
import { VampifyInstance } from "@vampify/literals";
import { EceJwtPayload } from "@/typescript/types/ece-types.js";

/**
 * A PreHandler Factory that creates a role-based guard.
 * It assumes vampifyAuth has already run and populated req.vampify_payload.
 */
function requireRoles(
    fastify: VampifyInstance,
    roles: ("ADMIN" | "PROFESSOR" | "STUDENT")[] | "ADMIN" | "PROFESSOR" | "STUDENT")
{
    const rolesArray = Array.isArray(roles) ? roles : [roles];

    return async (req: FastifyRequest, res: FastifyReply) =>
    {
        // Check that the payload and jtw data are defined.
        req.vampifyAbort(
            req.vampify_payload && req.vampify_payload.data,
            500,
            `Payload and its data should exist at this point.`,
            {
                roles   : rolesArray,
                actual  : "undefined",
                payload : req.vampify_payload
            }
        );

        // Get the JWT Data.
        const jwt_data = req.vampify_payload.data as EceJwtPayload;

        // Check that the role matches.
        req.vampifyAbort(
            rolesArray.includes(jwt_data.m_role),
            403,
            `Access Denied: Required roles was not included in the roles array`,
            {
                roles : rolesArray,
                actual: jwt_data.m_role
            }
        );
    };
};




const eceAuthPlugin = fp(async (fastify: VampifyInstance) =>
{
    // Decorate the instance so you can use it in any route
    fastify.decorate("eceAuthRequireRoles", (roles: any) =>
    {
        return requireRoles(fastify, roles);
    });
});




declare module 'fastify'
{
    interface FastifyInstance
    {
        /**
         * Check the role of a user.
         * 
         * This function will check the role of a user,
         * and if it's not the expected one, it will throw
         * a forbidden http error.
         * 
         * @param role The role to be checked.
         */
        eceAuthRequireRoles(roles: ("ADMIN" | "PROFESSOR" | "STUDENT")[] | "ADMIN" | "PROFESSOR" | "STUDENT"):
            (req: FastifyRequest, res: FastifyReply) => Promise<void>;
    }
}

export default eceAuthPlugin;
