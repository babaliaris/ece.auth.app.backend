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
    }
} as const;
