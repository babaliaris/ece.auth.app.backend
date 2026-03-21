import { Type } from "@sinclair/typebox";

const email = Type.String(
{
    description : "The user's unique email address.",
    format      : "email",
    maxLength   : 124
});


export const RequestUserSchema = Type.Object(
{
    m_email: email,

    m_pass: Type.String(
    {
        description : "The user's password. Must contain 1 uppercase, 1 symbol (!@#$%^&*), and 1 number.",
        minLength   : 8,
        maxLength   : 72,
        pattern     : "^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.*[0-9]).*$"
    })
});


export const ResponseUserSchema = Type.Object(
{
    m_uuid: Type.String(
    {
        description : "The unique identifier of this object.",
        format      : "uuid",
        minLength   : 36,
        maxLength   : 36
    }),

    m_email: email
});
