import { FastifyPluginAsync } from "fastify";
import { ROUTE_ENDPOINTS } from "../literals.js"
import { InferInsertModel, eq, asc, sql} from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { Type, Static } from "@sinclair/typebox";
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
  const tags = ["Subjects"];

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
        tags        : tags,
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
        tags        : tags,
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
      const table   = t_subjects;
      const offset  = req.query.m_page * req.query.m_limit;

      // Get the Data
      const data = await fastify.db
      .select()
      .from(table)
      .limit(req.query.m_limit)
      .offset(offset)
      .orderBy(asc(table.m_uuid));

      // Get Count
      const [countResult] = await fastify.db
      .select({ count: sql<number>`count(*)` })
      .from(table);

      // Prepare and return the response.
      const totalRows   = countResult.count;
      const totalPages  = Math.ceil(totalRows / req.query.m_limit) || 1;
      return res.status(200).send({
        m_data: data,
        m_meta:
        {
            m_total_pages : totalPages,
            m_current_page: req.query.m_page,
            m_limit       : req.query.m_limit
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
      tags        : tags,
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
      const table = t_subjects;

      // Execute the update.
      const [updateRes] = await fastify.db
      .update(table)
      .set(req.body)
      .where(
          eq(table.m_uuid, req.params.subject_uuid)
      );


      // Using UUID to update a row MUST 
      // result in only ONE affected row!!!
      req.vampifyAbort(
        updateRes.affectedRows <= 1,
        500,
        `Update uuid=${req.params.subject_uuid} affected more than one row!`,
        {
          uuid                : req.params.subject_uuid,
          data                : req.body,
          table               : table,
          num_of_rows_affected: updateRes.affectedRows
        }
      );

      // We should at least update one row!
      req.vampifyAbort(
        updateRes.affectedRows === 1,
        404,
        `Update uuid=${req.params.subject_uuid} was not found`,
        {
          uuid  : req.params.subject_uuid,
          data  : req.body,
          table : table
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
      tags        : tags,
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
      const table = t_subjects;

      // Execute the deletion query.
      const [deleteRes] = await fastify.db
      .delete(table)
      .where(
          eq((table as any).m_uuid, req.params.subject_uuid)
      );

      // Using UUID to delete a row MUST 
      // result in only ONE affected row!!!
      req.vampifyAbort(
        deleteRes.affectedRows <= 1,
        500,
        `Update uuid=${req.params.subject_uuid} affected more than one row!`,
        {
          uuid                : req.params.subject_uuid,
          table               : table,
          num_of_rows_affected: deleteRes.affectedRows
        }
      );

      // We should at least update one row!
      req.vampifyAbort(
        deleteRes.affectedRows === 1,
        404,
        `Update uuid=${req.params.subject_uuid} was not found`,
        {
          uuid  : req.params.subject_uuid,
          table : table
        }
      );
      return res.status(204).send(null);
  });
};

export default subjects;
