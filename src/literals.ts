export const ROUTE_ENDPOINTS =
{
    ROOT:
    {
        ROOT    : "/",
    },

    HEALTH:
    {
        ROOT : '/health'
    },

    SWAGGER:
    {
        ROOT: "/docs"
    },

    USERS:
    {
        ROOT    : "/users",
        LOGIN   : "/users/login",
        LOGOUT  : "/users/logout"
    },

    SUBJECTS:
    {
        ROOT    : "/subjects",
        get     : (subject_uuid?: string)=>subject_uuid ?
            `/subjects/${subject_uuid}`:
            `/subjects/:subject_uuid`,
        delete  : (subject_uuid?: string)=>subject_uuid ?
            `/subjects/${subject_uuid}`:
            `/subjects/:subject_uuid`
    }
} as const;
