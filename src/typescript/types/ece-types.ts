export enum UserRolesE
{
  ADMIN="ADMIN",
  PROFESSOR="PROFESSOR",
  STUDENT="STUDENT"
};


export enum ExamSemesterE
{
  FALL="FALL",
  SPRING="SPRING"
};


export type EceJwtPayload =
{
    m_email : string,
    m_role  : "ADMIN" | "PROFESSOR" | "STUDENT"
};
