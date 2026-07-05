const test = require('node:test');
const assert = require('node:assert/strict');
const userService = require('../src/services/user.service');
const cloudinaryConfig = require('../src/config/cloudinary');

process.env.CLOUDINARY_AVATAR_ALLOWED_FORMATS = 'jpg,jpeg,png,webp';
process.env.CLOUDINARY_AVATAR_MAX_UPLOAD_BYTES = String(5 * 1024 * 1024);

test('UC-SYS-01: Avatar upload request accepts only small image files', () => {
  assert.doesNotThrow(() => userService.__testing.validateAvatarUploadRequest({
    fileName: 'avatar.webp',
    fileSize: 1024,
    contentType: 'image/webp'
  }));
  assert.throws(
    () => userService.__testing.validateAvatarUploadRequest({
      fileName: 'avatar.pdf',
      fileSize: 1024,
      contentType: 'application/pdf'
    }),
    /JPG, PNG, or WEBP/
  );
  assert.throws(
    () => userService.__testing.validateAvatarUploadRequest({
      fileName: 'avatar.png',
      fileSize: 5 * 1024 * 1024 + 1,
      contentType: 'image/png'
    }),
    /too large/
  );
});

test('UC-SYS-01: Avatar Cloudinary signature is scoped by role and email', () => {
  const signature = cloudinaryConfig.createAvatarUploadSignature({
    user: {
      role: 'TEACHER',
      email: 'Teacher.One+Test@Example.edu'
    },
    env: {
      CLOUDINARY_CLOUD_NAME: 'demo',
      CLOUDINARY_API_KEY: 'public-key',
      CLOUDINARY_API_SECRET: 'secret-key'
    },
    now: () => 1780000000000
  });

  assert.equal(signature.uploadUrl, 'https://api.cloudinary.com/v1_1/demo/image/upload');
  assert.equal(signature.publicIdPrefix, 'slms/avatars/teacher/teacher.one-test-at-example.edu/');
  assert.equal(signature.params.folder, 'slms/avatars/teacher/teacher.one-test-at-example.edu');
  assert.equal(signature.params.public_id, 'avatar');
  assert.equal(signature.params.overwrite, true);
  assert.equal(signature.params.type, 'upload');
  assert.ok(signature.signature);
  assert.equal(JSON.stringify(signature).includes('secret-key'), false);
});
