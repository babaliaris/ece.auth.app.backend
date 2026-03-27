import { Type } from "@sinclair/typebox";

const email = Type.String(
{
    description : "The user's unique email address.",
    format      : "email",
    maxLength   : 124
});


const pass = Type.String(
{
    description : "The user's password. Must contain 1 uppercase, 1 symbol (!@#$%^&*), and 1 number.",
    minLength   : 8,
    maxLength   : 72,
    pattern     : "^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.*[0-9]).*$"
});


export const UserCreateSchema = Type.Object(
{
    m_email : email,
    m_pass  : pass
});


export const UserLoginSchema = Type.Object(
{
    m_email     : email,
    m_pass      : pass,
    m_platform  : Type.Optional(Type.Union(
    [
        Type.Literal("ANDROID"),
        Type.Literal("IOS"),
        Type.Literal("BROWSER")
    ],
    {
        description: "The device platform. Required only for native apps"
    })),
    m_device_id : Type.Optional(Type.String(
    {
        description : "The device id. Required only for native apps",
        maxLength   : 255
    })),
    m_device_token: Type.Optional(Type.String(
    {
        description : "The device token. Required only for native apps",
        maxLength   : 255
    }))
});


export const UserDataSchema = Type.Object(
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
