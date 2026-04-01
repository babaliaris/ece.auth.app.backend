import { Type } from "@sinclair/typebox";
import { std_schema_uuid } from "./standard.schema.js";


const semester = Type.Union(
[
    Type.Literal("FALL"),
    Type.Literal("SPRING")
],
{
    description: "The semester of the examination period."
});

const year = Type.Number(
{
    description : "The year of the examination period.",
});



export const ExamCreateReqSchema = Type.Object(
{
    m_semester: semester,
    m_year    : year
});


export const ExamCreateRepSchema = Type.Object(
{
    m_uuid    : std_schema_uuid,
    m_semester: semester,
    m_year    : year
});



export const ExamPaginationRepSchema = Type.Object(
{
    m_uuid    : std_schema_uuid,
    m_semester: semester,
    m_year    : year
});



export const ExamUpdateReqSchema = Type.Object(
{
    m_semester: semester,
    m_year    : year
});



export const ExamUpdateRepSchema = Type.Object(
{
    m_uuid    : std_schema_uuid,
    m_semester: semester,
    m_year    : year
});

