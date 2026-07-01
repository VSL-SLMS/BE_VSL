const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'SLMS Backend API',
    version: '0.1.0',
    description: 'ExpressJS + MySQL raw SQL API for the Sign Language Learning Management System.'
  },
  servers: [
    {
      url: 'http://localhost:5050',
      description: 'Local backend'
    }
  ],
  tags: [
    { name: 'Health' },
    { name: 'Lessons' },
    { name: 'Search' },
    { name: 'Auth' },
    { name: 'Profile' },
    { name: 'Teachers' },
    { name: 'Teacher Assignments' },
    { name: 'Student Assignments' },
    { name: 'Student Topic Lessons' },
    { name: 'Admin Teachers' },
    { name: 'Admin' },
    { name: 'Payments' }
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Backend health check',
        responses: {
          200: {
            description: 'Backend is running'
          }
        }
      }
    },
    '/api/course-overview': {
      get: {
        tags: ['Lessons'],
        summary: 'Get VSL course overview grouped by parts, chapters, and lessons',
        responses: {
          200: {
            description: 'Course overview'
          }
        }
      }
    },
    '/api/lessons': {
      get: {
        tags: ['Lessons'],
        summary: 'List all VSL lessons grouped by course structure',
        responses: {
          200: {
            description: 'Grouped lessons'
          }
        }
      }
    },
    '/api/lessons/{slug}': {
      get: {
        tags: ['Lessons'],
        summary: 'Get one lesson with learn-mode content, book pages, and navigation',
        parameters: [
          {
            name: 'slug',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: 'bang-chu-cai-ngon-tay'
          }
        ],
        responses: {
          200: {
            description: 'Lesson detail'
          },
          404: {
            description: 'Lesson not found'
          }
        }
      }
    },
    '/api/search': {
      get: {
        tags: ['Search'],
        summary: 'Search chapters, lessons, and sign vocabulary',
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            example: 'gia đình'
          }
        ],
        responses: {
          200: {
            description: 'Search results'
          }
        }
      }
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a student account. Public teacher registration is not allowed.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Nguyen Van A' },
                  email: { type: 'string', example: 'student@example.com' },
                  password: { type: 'string', example: 'password123' },
                  role: { type: 'string', enum: ['STUDENT'], example: 'STUDENT' }
                },
                required: ['email', 'password']
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Registered user'
          },
          409: {
            description: 'Duplicate account'
          }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', example: 'student@example.com' },
                  password: { type: 'string', example: 'password123' }
                },
                required: ['email', 'password']
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Logged-in user'
          },
          401: {
            description: 'Invalid credentials'
          }
        }
      }
    },
    '/api/teachers': {
      get: {
        tags: ['Teachers'],
        summary: 'List active teachers for Student selection',
        description: 'Returns practical Teacher profile data for Student selection. Accuracy is simplified and only exposed when the Teacher has verification history.',
        parameters: [
          {
            name: 'recommend',
            in: 'query',
            required: false,
            schema: { type: 'boolean' },
            example: true,
            description: 'When true, returns only Teachers accepting Students, sorted by capacity first and reliability second.'
          }
        ],
        responses: {
          200: {
            description: 'Teacher list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        teachers: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'integer', example: 1 },
                              full_name: { type: 'string', example: 'Tran Thi B' },
                              display_name: { type: 'string', example: 'Tran Thi B' },
                              email: { type: 'string', example: 'teacher@example.com' },
                              avatar_url: { type: 'string', nullable: true },
                              bio: { type: 'string', example: 'Supports beginners learning Vietnamese Sign Language.' },
                              specialization: { type: 'string', example: 'Beginner VSL, alphabet, daily conversation' },
                              current_student_count: { type: 'integer', example: 8 },
                              max_students: { type: 'integer', example: 30 },
                              availability_status: {
                                type: 'string',
                                enum: ['OPEN', 'LIMITED', 'FULL'],
                                example: 'OPEN'
                              },
                              reliability_label: {
                                type: 'string',
                                enum: ['NEW', 'RELIABLE', 'HIGHLY_RELIABLE'],
                                example: 'NEW'
                              },
                              accuracy: {
                                type: 'number',
                                nullable: true,
                                example: null,
                                description: 'Null when the Teacher has no verified grading history.'
                              },
                              accuracy_verified: { type: 'boolean', example: false },
                              is_accepting_students: { type: 'boolean', example: true },
                              is_recommended: { type: 'boolean', example: true }
                            }
                          }
                        },
                        recommendedTeacher: {
                          type: 'object',
                          nullable: true,
                          description: 'First recommended Teacher when recommend=true.'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/users/me/profile': {
      patch: {
        tags: ['Profile'],
        summary: 'Current Student or Teacher updates their own profile',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Nguyen Van A' },
                  email: { type: 'string', example: 'student@example.com' },
                  avatarUrl: { type: 'string', example: 'https://example.com/avatar.png' },
                  dateOfBirth: {
                    type: 'string',
                    format: 'date',
                    example: '2004-12-21',
                    description: 'Student only. Use YYYY-MM-DD.'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Profile updated'
          },
          403: {
            description: 'User cannot update this profile'
          }
        }
      }
    },
    '/api/users/me/avatar': {
      delete: {
        tags: ['Profile'],
        summary: 'Current Student or Teacher removes their avatar URL',
        responses: {
          200: {
            description: 'Avatar removed'
          }
        }
      }
    },
    '/api/teacher/students': {
      get: {
        tags: ['Teacher Assignments'],
        summary: 'Teacher lists assigned Students',
        responses: {
          200: {
            description: 'Assigned student list'
          }
        }
      }
    },
    '/api/teacher/assignments': {
      get: {
        tags: ['Teacher Assignments'],
        summary: 'Teacher lists their assignments',
        responses: {
          200: {
            description: 'Teacher assignment list'
          }
        }
      },
      post: {
        tags: ['Teacher Assignments'],
        summary: 'Teacher creates an assignment for assigned Students only',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', example: 'Practice greeting signs' },
                  instructions: { type: 'string', example: 'Record a short greeting using signs learned in lesson 1.' },
                  studentIds: { type: 'array', items: { type: 'integer' }, example: [1, 2] },
                  deadline: { type: 'string', format: 'date-time', nullable: true },
                  allowLateSubmission: { type: 'boolean', example: false }
                },
                required: ['title', 'instructions', 'studentIds']
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Assignment created'
          },
          403: {
            description: 'Student does not belong to Teacher'
          }
        }
      }
    },
    '/api/teacher/submissions': {
      get: {
        tags: ['Teacher Assignments'],
        summary: 'Teacher lists submissions for their assignments',
        responses: {
          200: {
            description: 'Submission list'
          }
        }
      }
    },
    '/api/teacher/submissions/{id}/grade': {
      post: {
        tags: ['Teacher Assignments'],
        summary: 'Teacher grades a submitted assignment once and locks the submission',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            example: 1
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  score: { type: 'number', example: 85 },
                  feedback: { type: 'string', example: 'Good hand shape. Improve rhythm in the second sentence.' }
                },
                required: ['score', 'feedback']
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Submission graded'
          },
          409: {
            description: 'Submission is locked'
          }
        }
      }
    },
    '/api/student/assignments': {
      get: {
        tags: ['Student Assignments'],
        summary: 'Student lists assignments assigned to them',
        responses: {
          200: {
            description: 'Student assignment list'
          }
        }
      }
    },
    '/api/student/assignments/{id}': {
      get: {
        tags: ['Student Assignments'],
        summary: 'Student gets one assigned assignment with submission status, score, and feedback',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            example: 1
          }
        ],
        responses: {
          200: {
            description: 'Student assignment detail'
          },
          404: {
            description: 'Assignment not assigned to this Student'
          }
        }
      }
    },
    '/api/student/assignments/{id}/submit': {
      post: {
        tags: ['Student Assignments'],
        summary: 'Student submits an assigned assignment',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            example: 1
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  content: { type: 'string', example: 'My answer text or video description.' },
                  fileUrl: { type: 'string', example: 'https://example.com/submission.mp4' }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Assignment submitted'
          },
          409: {
            description: 'Assignment already submitted or locked'
          }
        }
      }
    },
    '/api/student/topic-lessons': {
      get: {
        tags: ['Student Topic Lessons'],
        summary: 'Student lists Cloudinary video topic lessons',
        description: 'Requires Student login, selected Teacher, and purchased course access. Returns topic-level progress and VSL vocabulary topic metadata.',
        responses: {
          200: {
            description: 'Topic lessons grouped by subject'
          },
          403: {
            description: 'Teacher selection or course purchase is required'
          }
        }
      }
    },
    '/api/student/topic-lessons/progress': {
      get: {
        tags: ['Student Topic Lessons'],
        summary: 'Student gets Cloudinary topic lesson progress summary',
        responses: {
          200: {
            description: 'Topic lesson progress summary'
          }
        }
      }
    },
    '/api/student/topic-lessons/{slug}': {
      get: {
        tags: ['Student Topic Lessons'],
        summary: 'Student opens one topic lesson with word-level Cloudinary videos',
        parameters: [
          {
            name: 'slug',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: 'geography'
          }
        ],
        responses: {
          200: {
            description: 'Topic lesson detail with word/video items'
          },
          404: {
            description: 'Topic lesson not found'
          }
        }
      }
    },
    '/api/student/topic-lessons/{slug}/items/{itemId}/complete': {
      post: {
        tags: ['Student Topic Lessons'],
        summary: 'Student marks one topic vocabulary video as learned',
        parameters: [
          {
            name: 'slug',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: 'geography'
          },
          {
            name: 'itemId',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            example: 1
          }
        ],
        responses: {
          200: {
            description: 'Video item progress updated'
          }
        }
      }
    },
    '/api/student/topic-lessons/{slug}/complete': {
      post: {
        tags: ['Student Topic Lessons'],
        summary: 'Student marks an entire Cloudinary topic lesson as completed',
        parameters: [
          {
            name: 'slug',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: 'geography'
          }
        ],
        responses: {
          200: {
            description: 'Topic lesson completed'
          }
        }
      }
    },
    '/api/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List users for admin management',
        responses: {
          200: {
            description: 'User list'
          }
        }
      }
    },
    '/api/admin/teachers': {
      post: {
        tags: ['Admin Teachers'],
        summary: 'Admin creates a Teacher account with a temporary password',
        description: 'Teacher accounts are admin-managed. If SMTP is configured, the temporary password is emailed to the Teacher. The Teacher must change password on first login.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Tran Thi B' },
                  email: { type: 'string', example: 'teacher@example.com' },
                  temporaryPassword: { type: 'string', example: 'Temp@123' },
                  status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED'], example: 'ACTIVE' }
                },
                required: ['email', 'temporaryPassword']
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Teacher account created'
          },
          409: {
            description: 'Duplicate email or username'
          }
        }
      },
      get: {
        tags: ['Admin Teachers'],
        summary: 'Admin lists all Teacher accounts',
        responses: {
          200: {
            description: 'Teacher account list'
          }
        }
      }
    },
    '/api/admin/teachers/{id}': {
      get: {
        tags: ['Admin Teachers'],
        summary: 'Admin gets one Teacher account with assigned students',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            example: 1
          }
        ],
        responses: {
          200: {
            description: 'Teacher detail'
          },
          404: {
            description: 'Teacher not found'
          }
        }
      }
    },
    '/api/admin/teachers/{id}/status': {
      patch: {
        tags: ['Admin Teachers'],
        summary: 'Admin activates or suspends a Teacher account',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            example: 1
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED'], example: 'SUSPENDED' }
                },
                required: ['status']
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Teacher status updated'
          }
        }
      }
    },
    '/api/admin/teachers/{id}/profile': {
      patch: {
        tags: ['Admin Teachers'],
        summary: 'Admin updates Teacher selection profile fields',
        description: 'Updates Teacher public selection information used by Students. Accuracy logs remain internal and are not editable here.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            example: 1
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Tran Thi B' },
                  avatarUrl: { type: 'string', example: 'https://example.com/avatar.png' },
                  bio: { type: 'string', example: 'Supports beginner Students learning daily VSL conversation.' },
                  specialization: { type: 'string', example: 'Beginner VSL, alphabet, family signs' },
                  availabilityStatus: {
                    type: 'string',
                    enum: ['OPEN', 'LIMITED', 'FULL'],
                    example: 'OPEN'
                  },
                  maxStudents: { type: 'integer', example: 30 },
                  reliabilityLabel: {
                    type: 'string',
                    enum: ['NEW', 'RELIABLE', 'HIGHLY_RELIABLE'],
                    example: 'NEW'
                  }
                },
                required: ['name', 'availabilityStatus', 'maxStudents', 'reliabilityLabel']
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Teacher profile updated'
          },
          400: {
            description: 'Invalid profile payload'
          },
          404: {
            description: 'Teacher not found'
          }
        }
      }
    },
    '/api/pricing': {
      get: {
        tags: ['Payments'],
        summary: 'Get active course pricing info',
        responses: {
          200: {
            description: 'Active course pricing'
          }
        }
      }
    },
    '/api/course-access/me': {
      get: {
        tags: ['Payments'],
        summary: 'Check if current student has purchased the course',
        responses: {
          200: {
            description: 'Course access status'
          }
        }
      }
    },
    '/api/payments/vnpay/create': {
      post: {
        tags: ['Payments'],
        summary: 'Create a payment transaction and get VNPay redirect URL',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  pricingId: { type: 'integer', example: 1 }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'VNPay payment redirect URL generated successfully'
          }
        }
      }
    },
    '/api/payments/vnpay/return': {
      get: {
        tags: ['Payments'],
        summary: 'Verify VNPay checksum and return payment status',
        responses: {
          200: {
            description: 'Payment status'
          }
        }
      }
    },
    '/api/payments/vnpay/ipn': {
      get: {
        tags: ['Payments'],
        summary: 'VNPay IPN server-to-server webhook',
        responses: {
          200: {
            description: 'IPN process confirmation code response'
          }
        }
      }
    }
  }
};

module.exports = swaggerSpec;
