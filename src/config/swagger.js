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
    { name: 'Teachers' },
    { name: 'Teacher Assignments' },
    { name: 'Student Assignments' },
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
        summary: 'List active teachers for student teacher selection',
        responses: {
          200: {
            description: 'Teacher list'
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
