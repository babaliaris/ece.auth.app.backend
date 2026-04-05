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
        LOGOUT  : "/users/logout",
        ME      : "/users/me"
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

    },


    EXAMINATIONS:
    {
      ROOT    : "/examinations",
      get     : (examination_uuid?: string)=>examination_uuid ?
          `/examinations/${examination_uuid}`:
          `/examinations/:examination_uuid`,
      deleteSingle  : (examination_uuid?: string)=>examination_uuid ?
          `/examinations/${examination_uuid}`:
          `/examinations/:examination_uuid`,
      patchSingle: (examination_uuid?: string)=>examination_uuid ?
          `/examinations/${examination_uuid}`:
          `/examinations/:examination_uuid`,

    },


    STUDENT_EXAMINATIONS:
    {
      ROOT    : "/student_examinations",
      get     : (student_examination_uuid?: string)=>student_examination_uuid ?
          `/student_examinations/${student_examination_uuid}`:
          `/student_examinations/:student_examination_uuid`,
      deleteSingle  : (student_examination_uuid?: string)=>student_examination_uuid ?
          `/student_examinations/${student_examination_uuid}`:
          `/student_examinations/:student_examination_uuid`,
      patchSingle: (student_examination_uuid?: string)=>student_examination_uuid ?
          `/student_examinations/${student_examination_uuid}`:
          `/student_examinations/:student_examination_uuid`,

    }
} as const;
