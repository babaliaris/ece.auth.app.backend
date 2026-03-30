import { FastifyPluginAsync } from "fastify";
import { ROUTE_ENDPOINTS } from "../literals.js"
import { sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { Type } from "@sinclair/typebox";
import {
    VampifyInstance,
    VampifyStandardResponseErrors
} from "@vampify/literals";

import {
    SubjectCreateReqSchema, SubjectCreateRepSchema
} from "@/typescript/schemas/subjects.schema.js";

import {
    t_subjects
} from "@/db/schema.js";
import { PaginationMetaDataSchema, PaginationQuerySchema } from "@/typescript/schemas/standard.schema.js";



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
     * Get MANY subjects by pagination.
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
          querystring : PaginationQuerySchema,
          response    :
          {
              200: Type.Object(
              {
                  m_data: Type.Array(SubjectCreateRepSchema),
                  m_meta: PaginationMetaDataSchema
              }),
              400: VampifyStandardResponseErrors[400],
              401: VampifyStandardResponseErrors[401]
          }
      }
    },
    async (req, res)=>
    {
      const offset = (req.query.m_page - 1) * req.query.m_limit;

      // Get the slice of data
      const subjects = await fastify.db
          .select()
          .from(t_subjects)
          .limit(req.query.m_limit)
          .offset(offset)
          .orderBy(t_subjects.m_uuid);

      // Get the total count.
      const [countResult] = await fastify.db
      .select({ count: sql<number>`count(*)` })
      .from(t_subjects);

      // Return the reply.
      const totalPages = Math.ceil(countResult.count / req.query.m_limit);
      return res.status(200).send(
      {
          m_data: subjects,
          m_meta:
          {
            m_total_pages : totalPages || 1,  // How many pages are in the DB.
            m_current_page: req.query.m_page, // Current page the user requested.
            m_limit       : req.query.m_limit // Actuall rows returned.
          }
      });
    });
};

export default subjects;
