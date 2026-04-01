import { MySqlTable } from "drizzle-orm/mysql-core";
import { sql, asc, eq } from "drizzle-orm";
import { VampifyInstance } from "@vampify/literals";
import { Static } from "@sinclair/typebox";
import { StdPaginationQuerySchema} from "@/typescript/schemas/standard.schema.js";


/**
 * Execute a pagination select query.
 *
 * This function selects a "page" from the provided table
 * based on a pagination selection technique.
 *
 * @param fastify The fastify instance.
 * @param table The table object.
 * @param options The pagination options.
 *
 * @returns A promise with the data and meta properties.
 */
export async function crudPaginationService<TrepSchema, Ttable extends MySqlTable = any>(
    fastify : VampifyInstance,
    table   : Ttable,
    options : Static<typeof StdPaginationQuerySchema>
)
{
  // Calculate the page offset.
  const offset = options.m_page * options.m_limit;

  // Get the Data
  const data = await fastify.db
  .select()
  .from(table)
  .limit(options.m_limit)
  .offset(offset)
  .orderBy(asc((table as any).m_uuid));

  // Get Count
  const [countResult] = await fastify.db
  .select({ count: sql<number>`count(*)` })
  .from(table);

  const totalRows   = countResult.count;
  const totalPages  = Math.ceil(totalRows / options.m_limit) || 1;

  return {
      data: data as TrepSchema[],
      meta: {
          m_total_pages : totalPages,
          m_current_page: options.m_page,
          m_limit       : options.m_limit
      }
  };
}



export async function crudUpdateService<Tdata = any, Ttable extends MySqlTable = any>(
    fastify : VampifyInstance,
    table   : Ttable,
    data    : Tdata,
    uuid    : string
)
{
  // Execute the update.
  const [updateRes] = await fastify.db
  .update(table)
  .set(data)
  .where(
      eq((table as any).m_uuid, uuid)
  );


  // Using UUID to update a row MUST 
  // result in only ONE affected row!!!
  fastify.vampifyAbort(
    updateRes.affectedRows <= 1,
    500,
    `Update uuid=${uuid} affected more than one row!`,
    {
      uuid                : uuid,
      data                : data,
      table               : table,
      num_of_rows_affected: updateRes.affectedRows
    }
  );

  // We should at least update one row!
  fastify.vampifyAbort(
    updateRes.affectedRows === 1,
    404,
    `Update uuid=${uuid} was not found`,
    {
      uuid  : uuid,
      data  : data,
      table : table
    }
  );
}



export async function crudDeleteService<Ttable extends MySqlTable = any>(
    fastify : VampifyInstance,
    table   : Ttable,
    uuid    : string
)
{
  // Execute the deletion query.
  const [deleteRes] = await fastify.db
  .delete(table)
  .where(
      eq((table as any).m_uuid, uuid)
  );

  // Using UUID to delete a row MUST 
  // result in only ONE affected row!!!
  fastify.vampifyAbort(
    deleteRes.affectedRows <= 1,
    500,
    `Update uuid=${uuid} affected more than one row!`,
    {
      uuid                : uuid,
      table               : table,
      num_of_rows_affected: deleteRes.affectedRows
    }
  );

  // We should at least update one row!
  fastify.vampifyAbort(
    deleteRes.affectedRows === 1,
    404,
    `Update uuid=${uuid} was not found`,
    {
      uuid  : uuid,
      table : table
    }
  );
}

