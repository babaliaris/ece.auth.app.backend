import { Type } from "@sinclair/typebox";
import * as std_schemas from "./standard.schema.js";

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
    m_uuid      : std_schemas.uuid,
    m_name      : name,
    m_school    : school
});
