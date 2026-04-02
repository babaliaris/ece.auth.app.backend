import { FastifyPluginAsync } from "fastify";
import { ROUTE_ENDPOINTS } from "../literals.js"
import { InferInsertModel, sql, eq, asc } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { Type } from "@sinclair/typebox";
import {
    VampifyInstance,
    VampifyStandardResponseErrors
} from "@vampify/literals";

import {
    t_exams,
} from "@/db/schema.js";

import {
  std_schema_uuid,
  StdPaginationQuerySchema,
  stdPaginationReplySchema
} from "@/typescript/schemas/standard.schema.js";

import {
  ExamCreateRepSchema,
  ExamCreateReqSchema,
  ExamPaginationRepSchema,
  ExamUpdateReqSchema
} from "@/typescript/schemas/exams.schema.js";


const exams: FastifyPluginAsync = async (fastify: VampifyInstance): Promise<void>=>
{
  const tags = ["Exams"];

  /**
    * Create.
    */
  fastify.post(ROUTE_ENDPOINTS.EXAMS.ROOT,
  {
      preHandler  :
      [
          fastify.vampifyAuth,
          fastify.eceAuthRequireRoles("ADMIN")
      ],
      schema      :
      {
          tags        : tags,
          summary     : "Creates a new exam",
          description : "Creates a new exam",
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
          body        : Type.Array(ExamCreateReqSchema,
          {
            description : "An array of all the objects you wish to isnert.",
            minItems    : 1,
            maxItems    : 20
          }),
          response:
          {
              201: Type.Array(ExamCreateRepSchema),
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
      const batched_items = req.body.map<InferInsertModel<typeof t_exams>>((val) =>
      {
          const m_uuid = uuidv7();
          return {
              m_uuid,
              m_semester: val.m_semester,
              m_year    : val.m_year
          };
      });

      // Perform the Batch Insert
      await fastify.db
      .insert(t_exams)
      .values(batched_items);

      // Return the list.
      return res.status(201).send(batched_items);
  });



  /**
    * GET many by pagination.
    */
  fastify.get(ROUTE_ENDPOINTS.EXAMS.ROOT,
  {
      schema:
      {
          tags        : tags,
          summary     : "Get a page of exam objects",
          description : "Get a page of exam objects",
          querystring : StdPaginationQuerySchema,
          response    :
          {
              200: stdPaginationReplySchema(ExamPaginationRepSchema),
              400: VampifyStandardResponseErrors[400],
          }
      }
  },
  async (req, res)=>
  {
      const table   = t_exams;
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
    * UPDATE single.
    */
  fastify.patch(ROUTE_ENDPOINTS.EXAMS.patchSingle(),
  {
      preHandler  :
      [
          fastify.vampifyAuth,
          fastify.eceAuthRequireRoles("ADMIN")
      ],
      schema      :
      {
        tags        : tags,
        summary     : "Update an exam",
        description : "Update an exam",
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
            exam_uuid: std_schema_uuid
        }),
        body: ExamUpdateReqSchema,
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
      const table = t_exams;

      // Execute the update.
      const [updateRes] = await fastify.db
      .update(table)
      .set(req.body)
      .where(
          eq(table.m_uuid, req.params.exam_uuid)
      );


      // Using UUID to update a row MUST 
      // result in only ONE affected row!!!
      req.vampifyAbort(
        updateRes.affectedRows <= 1,
        500,
        `Update uuid=${req.params.exam_uuid} affected more than one row!`,
        {
          uuid                : req.params.exam_uuid,
          data                : req.body,
          table               : table,
          num_of_rows_affected: updateRes.affectedRows
        }
      );

      // We should at least update one row!
      req.vampifyAbort(
        updateRes.affectedRows === 1,
        404,
        `Update uuid=${req.params.exam_uuid} was not found`,
        {
          uuid  : req.params.exam_uuid,
          data  : req.body,
          table : table
        }
      );
      return res.status(204).send(null);
  });


  /**
    * DELETE single.
    */
  fastify.delete(ROUTE_ENDPOINTS.EXAMS.deleteSingle(),
  {
      preHandler  :
      [
          fastify.vampifyAuth,
          fastify.eceAuthRequireRoles("ADMIN")
      ],
      schema      :
      {
        tags        : tags,
        summary     : "Delete an exam",
        description : "Delete an exam",
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
            exam_uuid: std_schema_uuid
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
      const table = t_exams;

      // Execute the deletion query.
      const [deleteRes] = await fastify.db
      .delete(table)
      .where(
          eq((table as any).m_uuid, req.params.exam_uuid)
      );

      // Using UUID to delete a row MUST 
      // result in only ONE affected row!!!
      req.vampifyAbort(
        deleteRes.affectedRows <= 1,
        500,
        `Update uuid=${req.params.exam_uuid} affected more than one row!`,
        {
          uuid                : req.params.exam_uuid,
          table               : table,
          num_of_rows_affected: deleteRes.affectedRows
        }
      );

      // We should at least update one row!
      req.vampifyAbort(
        deleteRes.affectedRows === 1,
        404,
        `Update uuid=${req.params.exam_uuid} was not found`,
        {
          uuid  : req.params.exam_uuid,
          table : table
        }
      );
      return res.status(204).send(null);
  });
};

export default exams;

