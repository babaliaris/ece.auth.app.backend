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
          `/subjects/:subject_uuid`,
      patchSingle: (subject_uuid?: string)=>subject_uuid ?
          `/subjects/${subject_uuid}`:
          `/subjects/:subject_uuid`,

    },

    EXAMS:
    {
      ROOT    : "/exams",
      get     : (exam_uuid?: string)=>exam_uuid ?
          `/exams/${exam_uuid}`:
          `/exams/:exam_uuid`,
      deleteSingle  : (exam_uuid?: string)=>exam_uuid ?
          `/exams/${exam_uuid}`:
          `/exams/:exam_uuid`,
      patchSingle: (exam_uuid?: string)=>exam_uuid ?
          `/exams/${exam_uuid}`:
          `/exams/:exam_uuid`,

    }
} as const;
