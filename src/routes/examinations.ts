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
      type T = Static<typeof ExaminationPaginationRepSchema>;

      const {data, meta} = await crudPaginationService<T>(
        fastify,
        t_subjects_exams,
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
      await crudUpdateService(fastify, t_subjects_exams, req.body, req.params.examination_uuid);
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
      await crudDeleteService(fastify, t_subjects_exams, req.params.examination_uuid);
      return res.status(204).send(null);
  });
};

export default examinations;

