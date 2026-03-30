export enum UserRolesE
{
  ADMIN="ADMIN",
  PROFESSOR="PROFESSOR",
  STUDENT="STUDENT"
};

export type EceJwtPayload =
{
    m_email : string,
    m_role  : "ADMIN" | "PROFESSOR" | "STUDENT"
};
