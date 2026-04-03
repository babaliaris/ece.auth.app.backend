import { FastifyPluginAsync } from "fastify";
import { ROUTE_ENDPOINTS } from "../literals.js"
import { InferInsertModel } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { asc, sql, eq, and } from "drizzle-orm";
import { Type } from "@sinclair/typebox";
import {
    VampifyInstance,
    VampifyStandardResponseErrors
} from "@vampify/literals";

import {
    t_users_subjects_exams,
} from "@/db/schema.js";

import {
  std_schema_uuid,
  StdPaginationQuerySchema,
  stdPaginationReplySchema
} from "@/typescript/schemas/standard.schema.js";

import {
  StudentExaminationCreateRepSchema,
  StudentExaminationCreateReqSchema,
  StudentExaminationPaginationRepSchema,
  StudentExaminationUpdateReqSchema
} from "@/typescript/schemas/student-examinations.schema.js";



const student_examinations: FastifyPluginAsync = async (fastify: VampifyInstance): Promise<void>=>
{
  const tags = ["Student Examinations"];

  /**
    * Create.
    */
  fastify.post(ROUTE_ENDPOINTS.STUDENT_EXAMINATIONS.ROOT,
  {
      preHandler  :
      [
          fastify.vampifyAuth
      ],
      schema      :
      {
          tags        : tags,
          summary     : "Creates a new student examination",
          description : "Creates a new student examination",
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
          body        : Type.Array(StudentExaminationCreateReqSchema,
          {
            description : "An array of all the objects you wish to insert.",
            minItems    : 1,
            maxItems    : 20
          }),
          response:
          {
              201: Type.Array(StudentExaminationCreateRepSchema),
              400: VampifyStandardResponseErrors[400],
              401: VampifyStandardResponseErrors[401],
              403: VampifyStandardResponseErrors[403],
              409: VampifyStandardResponseErrors[409]
          }
      }
  },
  async (req, res)=>
  {
      const table = t_users_subjects_exams;
      const batched_items: InferInsertModel<typeof table>[] = [];

      // Prepare the data in one pass
      req.body.forEach((val) =>
      {
          const uuid = uuidv7();
          batched_items.push(
          {
              ...val,
              m_uuid      : uuid,
              m_user_uuid : req.vampify_payload!.user_id
          });
      });

      // Perform the Batch Insert
      await fastify.db
      .insert(table)
      .values(batched_items);

      // Return the list.
      return res.status(201).send(batched_items);
  });



  /**
    * GET many by pagination.
    */
  fastify.get(ROUTE_ENDPOINTS.STUDENT_EXAMINATIONS.ROOT,
  {
      preHandler  :
      [
          fastify.vampifyAuth
      ],
      schema:
      {
          tags        : tags,
          summary     : "Get a page of student examination objects",
          description : "Get a page of student examination objects",
          querystring : StdPaginationQuerySchema,
          response    :
          {
              200: stdPaginationReplySchema(StudentExaminationPaginationRepSchema),
              400: VampifyStandardResponseErrors[400],
          }
      }
  },
  async (req, res)=>
  {
      const table   = t_users_subjects_exams;
      const offset  = req.query.m_page * req.query.m_limit;

      // Get the Data
      const data = await fastify.db
      .select()
      .from(table)
      .where(
          eq(table.m_user_uuid, req.vampify_payload!.user_id)
      )
      .limit(req.query.m_limit)
      .offset(offset)
      .orderBy(asc(table.m_uuid));

      // Get Count
      const [countResult] = await fastify.db
      .select({ count: sql<number>`count(*)` })
      .from(table)
      .where(
          eq(table.m_user_uuid, req.vampify_payload!.user_id)
      );

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
  fastify.patch(ROUTE_ENDPOINTS.STUDENT_EXAMINATIONS.patchSingle(),
  {
      preHandler  :
      [
          fastify.vampifyAuth,
      ],
      schema      :
      {
        tags        : tags,
        summary     : "Update a student examination",
        description : "Update a student examination",
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
            student_examination_uuid: std_schema_uuid
        }),
        body: StudentExaminationUpdateReqSchema,
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
      const table = t_users_subjects_exams;

      // Execute the update.
      const [updateRes] = await fastify.db
      .update(table)
      .set(req.body)
      .where(
          and(
            eq(table.m_uuid, req.params.student_examination_uuid),
            eq(table.m_user_uuid, req.vampify_payload!.user_id)
          )
      );


      // Using UUID to update a row MUST 
      // result in only ONE affected row!!!
      req.vampifyAbort(
        updateRes.affectedRows <= 1,
        500,
        `Update uuid=${req.params.student_examination_uuid} affected more than one row!`,
        {
          uuid                : req.params.student_examination_uuid,
          data                : req.body,
          table               : table,
          num_of_rows_affected: updateRes.affectedRows
        }
      );

      // We should at least update one row!
      req.vampifyAbort(
        updateRes.affectedRows === 1,
        404,
        `Update uuid=${req.params.student_examination_uuid} was not found`,
        {
          uuid  : req.params.student_examination_uuid,
          data  : req.body,
          table : table
        }
      );
      return res.status(204).send(null);
  });


  /**
    * DELETE single.
    */
  fastify.delete(ROUTE_ENDPOINTS.STUDENT_EXAMINATIONS.deleteSingle(),
  {
      preHandler  :
      [
          fastify.vampifyAuth,
      ],
      schema      :
      {
        tags        : tags,
        summary     : "Delete a student examination",
        description : "Delete a student examination",
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
            student_examination_uuid: std_schema_uuid
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
      const table = t_users_subjects_exams;

      // Execute the deletion query.
      const [deleteRes] = await fastify.db
      .delete(table)
      .where(
          and(
            eq(table.m_uuid, req.params.student_examination_uuid),
            eq(table.m_user_uuid, req.vampify_payload!.user_id)
          )
      );

      // Using UUID to delete a row MUST 
      // result in only ONE affected row!!!
      req.vampifyAbort(
        deleteRes.affectedRows <= 1,
        500,
        `Update uuid=${req.params.student_examination_uuid} affected more than one row!`,
        {
          uuid                : req.params.student_examination_uuid,
          table               : table,
          num_of_rows_affected: deleteRes.affectedRows
        }
      );

      // We should at least update one row!
      req.vampifyAbort(
        deleteRes.affectedRows === 1,
        404,
        `Update uuid=${req.params.student_examination_uuid} was not found`,
        {
          uuid  : req.params.student_examination_uuid,
          table : table
        }
      );
      return res.status(204).send(null);
  });
};

export default student_examinations;

