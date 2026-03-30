import { Type } from "@sinclair/typebox";

export const uuid = Type.String(
{
    description : "The unique identifier of this object.",
    format      : "uuid",
    minLength   : 36,
    maxLength   : 36
});

export const created_at = Type.String(
{
    description : "The datetime this object was created at",
    format      : "date-time"
});


export const PaginationQuerySchema = Type.Object(
{
  m_page  : Type.Integer(
  {
        description: "The page number to be fetched",
        minimum: 1,
        default: 1
  }),

  m_limit : Type.Integer(
  {
        description: "The number of rows to be fetched",
        minimum: 1,
        maximum: 100,
        default: 100
  })
});


export const PaginationMetaDataSchema = Type.Object(
{
  m_total_pages:  Type.Number(
  {
        description : "The total number of pages",
        minimum     : 1
  }),

  m_current_page: Type.Number(
  {
        description: "The current page you're looking at",
        minimum: 1
  }),

  m_limit: Type.Integer(
  {
        description: "The number of rows you requested",
        minimum: 1,
        maximum: 100
  })
});

