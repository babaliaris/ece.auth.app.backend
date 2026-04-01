import { Type } from "@sinclair/typebox";
import { std_schema_uuid } from "./standard.schema.js";


const note = Type.Optional(Type.Union(
[
    Type.String(
    {
        description : "A note for this examination.",
        maxLength   : 4096
    }),

    Type.Null()
]));


const datetime = Type.String(
{
    description : "The date and time of the examination",
    format      : "date-time"
});



export const ExaminationCreateReqSchema = Type.Object(
{
    m_note        : note,
    m_datetime    : datetime,
    m_subject_uuid: std_schema_uuid,
    m_exam_uuid   : std_schema_uuid
});


export const ExaminationCreateRepSchema = Type.Object(
{
    m_uuid        : std_schema_uuid,
    m_note        : note,
    m_datetime    : datetime,
    m_subject_uuid: std_schema_uuid,
    m_exam_uuid   : std_schema_uuid
});



export const ExaminationPaginationRepSchema = Type.Object(
{
    m_uuid        : std_schema_uuid,
    m_note        : note,
    m_datetime    : datetime,
    m_subject_uuid: std_schema_uuid,
    m_exam_uuid   : std_schema_uuid
});



export const ExaminationUpdateReqSchema = Type.Object(
{
    m_note        : note,
    m_datetime    : datetime,
});



export const ExaminationUpdateRepSchema = Type.Object(
{
    m_uuid        : std_schema_uuid,
    m_note        : note,
    m_datetime    : datetime,
    m_subject_uuid: std_schema_uuid,
    m_exam_uuid   : std_schema_uuid
});

