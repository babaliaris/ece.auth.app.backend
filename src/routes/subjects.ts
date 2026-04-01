import { FastifyPluginAsync } from "fastify";
import { ROUTE_ENDPOINTS } from "../literals.js"
import { InferInsertModel} from "drizzle-orm";
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

import {
  crudDeleteService,
  crudPaginationService,
  crudUpdateService }
from "@/services/crud-operations.service.js";


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
    type T              = Static<typeof SubjectCreateRepSchema>;
    const {data, meta}  = await crudPaginationService<T>(fastify, t_subjects, req.query);

    return res.status(200).send(
    {
        m_data: data,
        m_meta: meta
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
    await crudUpdateService(fastify, t_subjects, req.body, req.params.subject_uuid);
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
      await crudDeleteService(fastify, t_subjects, req.params.subject_uuid)
      return res.status(204).send(null);
  });
};

export default subjects;
