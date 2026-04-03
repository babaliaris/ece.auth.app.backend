import { Type } from "@sinclair/typebox";
import { std_schema_uuid } from "./standard.schema.js";


const note = Type.Optional(Type.Union(
[
    Type.String(
    {
        description : "A note for this examination course.",
        maxLength   : 4096
    }),

    Type.Null()
]));



export const StudentExaminationCreateReqSchema = Type.Object(
{
    m_note                : note,
    m_subjects_exams_uuid : std_schema_uuid
});


export const StudentExaminationCreateRepSchema = Type.Object(
{
    m_uuid                : std_schema_uuid,
    m_note                : note,
    m_user_uuid           : std_schema_uuid,
    m_subjects_exams_uuid : std_schema_uuid
});



export const StudentExaminationPaginationRepSchema = Type.Object(
{
    m_uuid                : std_schema_uuid,
    m_note                : note,
    m_user_uuid           : std_schema_uuid,
    m_subjects_exams_uuid : std_schema_uuid
});



export const StudentExaminationUpdateReqSchema = Type.Object(
{
    m_note: note,
});


export const StudentExaminationUpdateRepSchema = Type.Object(
{
    m_uuid                : std_schema_uuid,
    m_note                : note,
    m_user_uuid           : std_schema_uuid,
    m_subjects_exams_uuid : std_schema_uuid
});

