import { FastifyPluginAsync } from "fastify";
import { ROUTE_ENDPOINTS } from "../literals.js"
import { InferInsertModel } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { Static, Type } from "@sinclair/typebox";
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

import {
  crudDeleteService,
  crudPaginationService,
  crudUpdateService
} from "@/services/crud-operations.service.js";



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
      const {data, meta} = await crudPaginationService< Static<typeof ExamPaginationRepSchema> >(
        fastify,
        t_exams,
        req.query
      );

      res.status(200).send(
      {
          m_data: data,
          m_meta: meta
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
      await crudUpdateService(fastify, t_exams, req.body, req.params.exam_uuid);
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
      await crudDeleteService(fastify, t_exams, req.params.exam_uuid);
      return res.status(204).send(null);
  });
};

export default exams;

