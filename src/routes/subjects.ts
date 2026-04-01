import { FastifyPluginAsync } from "fastify";
import { ROUTE_ENDPOINTS } from "../literals.js"
import { sql, InferInsertModel, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { Type } from "@sinclair/typebox";
import {
    VampifyInstance,
    VampifyStandardResponseErrors
} from "@vampify/literals";

import {
    SubjectCreateReqSchema, SubjectCreateRepSchema,
    SubjectUpdateReqSchema
} from "@/typescript/schemas/subjects.schema.js";

import {
    t_subjects
} from "@/db/schema.js";

import {
    std_schema_uuid,
  StdPaginationQuerySchema,
  stdPaginationReplySchema
} from "@/typescript/schemas/standard.schema.js";



const subjects: FastifyPluginAsync = async (fastify: VampifyInstance): Promise<void>=>
{
    /**
     * Create new Subjects.
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
          body        : Type.Array(SubjectCreateReqSchema,
          {
            description : "An array of subject objects to be inserted",
            maxItems    : 100,
            minItems    : 1
          }),
          response:
          {
              201: Type.Array(SubjectCreateRepSchema),
              400: VampifyStandardResponseErrors[400],
              401: VampifyStandardResponseErrors[401],
              403: VampifyStandardResponseErrors[403],
              409: VampifyStandardResponseErrors[409]
          }
      }
    },
    async (req, res)=>
    {
      // Prepare the data in one pass
      const batched_items = req.body.map<InferInsertModel<typeof t_subjects>>((subj) =>
      {
          const m_uuid = uuidv7();
          return {
              m_uuid,
              m_name: subj.m_name,
              m_school: subj.m_school
          };
      });

      // Perform the Batch Insert
      await fastify.db
      .insert(t_subjects)
      .values(batched_items);

      // Return the list.
      return res.status(201).send(batched_items);
    });



    /**
     * Get MANY subjects by pagination.
     * Anyone can get the subjects even guests.
     */
    fastify.get(ROUTE_ENDPOINTS.SUBJECTS.ROOT,
    {
      schema:
      {
          tags        : ['Subjects'],
          summary     : "Get all the subjects",
          description : "Get all the subjects",
          querystring : StdPaginationQuerySchema,
          response    :
          {
              200: stdPaginationReplySchema(SubjectCreateRepSchema),
              400: VampifyStandardResponseErrors[400],
          }
      }
    },
    async (req, res)=>
    {
      const offset = req.query.m_page * req.query.m_limit;

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



    /**
     * Update a single subject.
     */
    fastify.patch(ROUTE_ENDPOINTS.SUBJECTS.patchSingle(),
    {
      preHandler  :
      [
          fastify.vampifyAuth,
          fastify.eceAuthRequireRoles("ADMIN")
      ],
      schema      :
      {
        tags        : ['Subjects'],
        summary     : "Update a subject",
        description : "Update a subject",
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
        params: Type.Object(
        {
            subject_uuid: std_schema_uuid
        }),
        body: SubjectUpdateReqSchema,
        response:
        {
            204: Type.Null(),
            400: VampifyStandardResponseErrors[400],
            401: VampifyStandardResponseErrors[401],
            403: VampifyStandardResponseErrors[403],
            404: VampifyStandardResponseErrors[404]
        }
      }
    },
    async (req, res)=>
    {
      // Execute the update.
      const [updateRes] = await fastify.db
      .update(t_subjects)
      .set(
      {
            m_name: req.body.m_name,
            m_school: req.body.m_school
      })
      .where(
          eq(t_subjects.m_uuid, req.params.subject_uuid)
      );

      // We should at least update one row.
      // If not, then inform the caller with 
      // a NOT FOUND error, so they will know.
      fastify.vampifyAbort(
        updateRes.affectedRows > 0,
        404,
        `Subject uuid=${req.params.subject_uuid} was not found`,
        {
          subject_uuid: req.params.subject_uuid,
          subject: req.body
        }
      );

      return res.status(204).send(null);
    });


    /**
     * delete a single subject.
     */
    fastify.delete(ROUTE_ENDPOINTS.SUBJECTS.delete(),
    {
      preHandler  :
      [
          fastify.vampifyAuth,
          fastify.eceAuthRequireRoles("ADMIN")
      ],
      schema      :
      {
        tags        : ['Subjects'],
        summary     : "Delete a subject",
        description : "Delete a subject",
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
        params: Type.Object(
        {
            subject_uuid: std_schema_uuid
        }),
        response:
        {
            204: Type.Null(),
            400: VampifyStandardResponseErrors[400],
            401: VampifyStandardResponseErrors[401],
            403: VampifyStandardResponseErrors[403],
            404: VampifyStandardResponseErrors[404]
        }
      }
    },
    async (req, res)=>
    {
      // Execute the update.
      const [updateRes] = await fastify.db
      .delete(t_subjects)
      .where(
          eq(t_subjects.m_uuid, req.params.subject_uuid)
      );

      // Not found.
      fastify.vampifyAbort(
        updateRes.affectedRows === 1,
        404,
        `Subject uuid=${req.params.subject_uuid} was not found`,
        {
          subject_uuid: req.params.subject_uuid
        }
      );

      return res.status(204).send(null);
    });
};

export default subjects;
