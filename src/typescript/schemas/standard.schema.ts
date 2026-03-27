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
