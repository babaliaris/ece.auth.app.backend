import { Type } from "@sinclair/typebox";
import { std_schema_uuid } from "./standard.schema.js";


const name = Type.String(
{
    description : "The name of the subject.",
    maxLength   : 255
});

const school = Type.String(
{
    description : "The name of the school this subject belongs to.",
    maxLength   : 255
});



export const SubjectCreateReqSchema = Type.Object(
{
    m_name  : name,
    m_school: school
});


export const SubjectCreateRepSchema = Type.Object(
{
    m_uuid      : std_schema_uuid,
    m_name      : name,
    m_school    : school
});



export const SubjectUpdateReqSchema = Type.Object(
{
    m_name      : name,
    m_school    : school
});

