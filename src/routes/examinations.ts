import { FastifyPluginAsync } from "fastify";
import { ROUTE_ENDPOINTS } from "../literals.js"
import { InferInsertModel } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { asc, sql, eq } from "drizzle-orm";
import { Static, Type } from "@sinclair/typebox";
import {
    VampifyInstance,
    VampifyStandardResponseErrors
} from "@vampify/literals";

import {
    t_subjects_exams,
} from "@/db/schema.js";

import {
  std_schema_uuid,
  StdPaginationQuerySchema,
  stdPaginationReplySchema
} from "@/typescript/schemas/standard.schema.js";

import {
  crudDeleteService,
  crudPaginationService,
  crudUpdateService
} from "@/services/crud-operations.service.js";

import {
  ExaminationCreateRepSchema,
  ExaminationCreateReqSchema,
  ExaminationPaginationRepSchema,
  ExaminationUpdateReqSchema
} from "@/typescript/schemas/examinations.schema.js";



const examinations: FastifyPluginAsync = async (fastify: VampifyInstance): Promise<void>=>
{
  const tags = ["Examinations"];

  /**
    * Create.
    */
  fastify.post(ROUTE_ENDPOINTS.EXAMINATIONS.ROOT,
  {
      preHandler  :
      [
          fastify.vampifyAuth,
          fastify.eceAuthRequireRoles("ADMIN")
      ],
      schema      :
      {
          tags        : tags,
          summary     : "Creates a new examination",
          description : "Creates a new examination",
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
          body        : Type.Array(ExaminationCreateReqSchema,
          {
            description : "An array of all the objects you wish to insert.",
            minItems    : 1,
            maxItems    : 20
          }),
          response:
          {
              201: Type.Array(ExaminationCreateRepSchema),
              400: VampifyStandardResponseErrors[400],
              401: VampifyStandardResponseErrors[401],
              403: VampifyStandardResponseErrors[403],
              409: VampifyStandardResponseErrors[409]
          }
      }
  },
  async (req, res)=>
  {
      const batched_items : InferInsertModel<typeof t_subjects_exams>[] = [];
      const reply_items   : Static<typeof ExaminationCreateRepSchema>[] = [];

      // Prepare the data in one pass
      req.body.forEach((val) =>
      {
          const uuid = uuidv7();
          batched_items.push({...val, m_datetime: new Date(val.m_datetime), m_uuid: uuid});
          reply_items.push({...val, m_uuid: uuid});
      });

      // Perform the Batch Insert
      await fastify.db
      .insert(t_subjects_exams)
      .values(batched_items);

      // Return the list.
      return res.status(201).send(reply_items);
  });



  /**
    * GET many by pagination.
    */
  fastify.get(ROUTE_ENDPOINTS.EXAMINATIONS.ROOT,
  {
      schema:
      {
          tags        : tags,
          summary     : "Get a page of examination objects",
          description : "Get a page of examination objects",
          querystring : StdPaginationQuerySchema,
          response    :
          {
              200: stdPaginationReplySchema(ExaminationPaginationRepSchema),
              400: VampifyStandardResponseErrors[400],
          }
      }
  },
  async (req, res)=>
  {
      const table   = t_subjects_exams;
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
        m_data: data.map((val)=>({...val, m_datetime: val.m_datetime.toISOString()})),
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
  fastify.patch(ROUTE_ENDPOINTS.EXAMINATIONS.patchSingle(),
  {
      preHandler  :
      [
          fastify.vampifyAuth,
          fastify.eceAuthRequireRoles("ADMIN")
      ],
      schema      :
      {
        tags        : tags,
        summary     : "Update an examination",
        description : "Update an examination",
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
            examination_uuid: std_schema_uuid
        }),
        body: ExaminationUpdateReqSchema,
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
      const table = t_subjects_exams;

      // Execute the update.
      const [updateRes] = await fastify.db
      .update(table)
      .set(
      {
            ...req.body,
            m_datetime: req.body.m_datetime ? new Date(req.body.m_datetime): undefined
      })
      .where(
          eq(table.m_uuid, req.params.examination_uuid)
      );


      // Using UUID to update a row MUST 
      // result in only ONE affected row!!!
      fastify.vampifyAbort(
        updateRes.affectedRows <= 1,
        500,
        `Update uuid=${req.params.examination_uuid} affected more than one row!`,
        {
          uuid                : req.params.examination_uuid,
          data                : req.body,
          table               : table,
          num_of_rows_affected: updateRes.affectedRows
        }
      );

      // We should at least update one row!
      fastify.vampifyAbort(
        updateRes.affectedRows === 1,
        404,
        `Update uuid=${req.params.examination_uuid} was not found`,
        {
          uuid  : req.params.examination_uuid,
          data  : req.body,
          table : table
        }
      );
      return res.status(204).send(null);
  });


  /**
    * DELETE single.
    */
  fastify.delete(ROUTE_ENDPOINTS.EXAMINATIONS.deleteSingle(),
  {
      preHandler  :
      [
          fastify.vampifyAuth,
          fastify.eceAuthRequireRoles("ADMIN")
      ],
      schema      :
      {
        tags        : tags,
        summary     : "Delete an examination",
        description : "Delete an examination",
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
            examination_uuid: std_schema_uuid
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
      const table = t_subjects_exams;

      // Execute the deletion query.
      const [deleteRes] = await fastify.db
      .delete(table)
      .where(
          eq((table as any).m_uuid, req.params.examination_uuid)
      );

      // Using UUID to delete a row MUST 
      // result in only ONE affected row!!!
      fastify.vampifyAbort(
        deleteRes.affectedRows <= 1,
        500,
        `Update uuid=${req.params.examination_uuid} affected more than one row!`,
        {
          uuid                : req.params.examination_uuid,
          table               : table,
          num_of_rows_affected: deleteRes.affectedRows
        }
      );

      // We should at least update one row!
      fastify.vampifyAbort(
        deleteRes.affectedRows === 1,
        404,
        `Update uuid=${req.params.examination_uuid} was not found`,
        {
          uuid  : req.params.examination_uuid,
          table : table
        }
      );
      return res.status(204).send(null);
  });
};

export default examinations;

