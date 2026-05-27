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
    { name: 'Admin' }
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
        summary: 'Register a student account',
        description: 'Public registration is only available for students. Teacher accounts must be created by an Admin.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Nguyen Van A' },
                  email: { type: 'string', example: 'student@example.com' },
                  password: { type: 'string', example: 'password123' }
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
          403: {
            description: 'Teacher self-registration is blocked'
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
    '/api/auth/change-password': {
      post: {
        tags: ['Auth'],
        summary: 'Change password for the current authenticated user',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  currentPassword: { type: 'string', example: 'Temp@12345' },
                  newPassword: { type: 'string', example: 'NewPassword@123' }
                },
                required: ['currentPassword', 'newPassword']
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Password changed'
          },
          401: {
            description: 'Invalid current password or token'
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
    '/api/admin/teachers': {
      post: {
        tags: ['Admin'],
        summary: 'Create a teacher account',
        description: 'Admin-only endpoint. The created teacher must change the temporary password at first login.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Tran Thi B' },
                  email: { type: 'string', example: 'teacher@example.com' },
                  temporaryPassword: { type: 'string', example: 'Temp@12345' },
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
          403: {
            description: 'Admin role required'
          },
          409: {
            description: 'Duplicate account'
          }
        }
      }
    },
    '/api/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List users for admin management',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'User list'
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  }
};

module.exports = swaggerSpec;
