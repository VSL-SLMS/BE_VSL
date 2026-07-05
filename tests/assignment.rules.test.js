const test = require('node:test');
const assert = require('node:assert/strict');
const { __testing } = require('../src/services/assignment.service');
const cloudinaryConfig = require('../src/config/cloudinary');

process.env.CLOUDINARY_SUBMISSION_FOLDER = 'slms/submissions';
process.env.CLOUDINARY_ALLOWED_FORMATS = 'mp4,mov,webm';
process.env.CLOUDINARY_MAX_UPLOAD_BYTES = String(100 * 1024 * 1024);
process.env.CLOUDINARY_MAX_VIDEO_DURATION_SECONDS = '600';

test('UC-STU-07: Student-facing submission status hides internal lifecycle details', () => {
  assert.equal(__testing.getWorkflowStatus(undefined), 'ASSIGNED');
  assert.equal(__testing.getStudentFacingStatus(undefined), 'To Do');
  assert.equal(__testing.getStudentFacingStatus('SUBMITTED'), 'Submitted');
  assert.equal(__testing.getWorkflowStatus('NEEDS_REVISION'), 'NEEDS_REVISION');
  assert.equal(__testing.getStudentFacingStatus('NEEDS_REVISION'), 'Needs revision');
  assert.equal(__testing.getTeacherFacingStatus('NEEDS_REVISION'), 'Returned for revision');
  assert.equal(__testing.getStudentFacingStatus('GRADED'), 'Graded');
  assert.equal(__testing.getStudentFacingStatus('RECHECKING'), 'Rechecking');
  assert.equal(__testing.getStudentFacingStatus('ESCALATED'), 'Final Result');
  assert.equal(__testing.getStudentFacingStatus('FINALIZED'), 'Final Result');
});

test('UC-TEA-04: Assignment student IDs are normalized and deduplicated', () => {
  assert.deepEqual(__testing.normalizeStudentIds(['1', 2, '2', 'abc', 3]), [1, 2, 3]);
  assert.deepEqual(__testing.normalizeStudentIds('1, 2, 2, 3'), [1, 2, 3]);
});

test('UC-TEA-04: Assignment must target at least one Student', () => {
  assert.throws(
    () => __testing.normalizeStudentIds([]),
    /Select at least one assigned student/
  );
});

test('UC-STU-08: Student can submit before deadline or when late submission is allowed', () => {
  assert.equal(__testing.canSubmit({ submission_status: null }), true);
  assert.equal(__testing.canSubmit({
    submission_status: 'DRAFT',
    deadline: new Date(Date.now() + 60_000),
    allow_late_submission: false
  }), true);
  assert.equal(__testing.canSubmit({
    submission_status: 'DRAFT',
    deadline: new Date(Date.now() - 60_000),
    allow_late_submission: true
  }), true);
  assert.equal(__testing.canSubmit({
    submission_status: 'NEEDS_REVISION',
    deadline: new Date(Date.now() - 60_000),
    allow_late_submission: false
  }), true);
});

test('UC-STU-08: Student cannot resubmit locked, graded, or late assignments', () => {
  assert.equal(__testing.canSubmit({ submission_status: 'SUBMITTED' }), false);
  assert.equal(__testing.canSubmit({ submission_status: 'GRADED' }), false);
  assert.equal(__testing.canSubmit({ submission_status: 'DRAFT', is_locked: true }), false);
  assert.equal(__testing.canSubmit({
    submission_status: 'DRAFT',
    deadline: new Date(Date.now() - 60_000),
    allow_late_submission: false
  }), false);
});

test('UC-STU-08: Submission file format is validated', () => {
  assert.doesNotThrow(() => __testing.validateSubmissionFile('https://cdn.test/sign-practice.mp4'));
  assert.throws(
    () => __testing.validateSubmissionFile('/uploads/answer.pdf'),
    /Unsupported submission video format/
  );
});

test('UC-TEA-04: Invalid deadline is rejected', () => {
  assert.throws(
    () => __testing.normalizeDeadline('not-a-date'),
    /Deadline must be a valid date/
  );
});

test('UC-STU-08: Cloudinary signature is scoped to one assigned submission folder', () => {
  const signature = cloudinaryConfig.createUploadSignature({
    assignmentId: 7,
    studentId: 3,
    env: {
      CLOUDINARY_CLOUD_NAME: 'demo',
      CLOUDINARY_API_KEY: 'public-key',
      CLOUDINARY_API_SECRET: 'secret-key'
    },
    now: () => 1780000000000,
    randomBytes: () => Buffer.from('abcdef123456', 'hex')
  });

  assert.equal(signature.cloudName, 'demo');
  assert.equal(signature.apiKey, 'public-key');
  assert.equal(signature.uploadUrl, 'https://api.cloudinary.com/v1_1/demo/video/upload');
  assert.equal(signature.publicIdPrefix, 'slms/submissions/7/3/');
  assert.equal(signature.params.folder, 'slms/submissions/7/3');
  assert.equal(signature.params.public_id, '1780000000-abcdef123456');
  assert.equal(signature.params.type, 'authenticated');
  assert.ok(signature.signature);
  assert.equal(JSON.stringify(signature).includes('secret-key'), false);
});

test('UC-STU-08: Upload signature request rejects unsupported type or size', () => {
  assert.doesNotThrow(() => __testing.validateUploadRequest({
    fileName: 'practice.webm',
    fileSize: 1024,
    contentType: 'video/webm'
  }));
  assert.throws(
    () => __testing.validateUploadRequest({ fileName: 'answer.pdf', fileSize: 1024, contentType: 'application/pdf' }),
    /Unsupported submission video format/
  );
  assert.throws(
    () => __testing.validateUploadRequest({ fileName: 'practice.mp4', fileSize: 100 * 1024 * 1024 + 1 }),
    /Submission video is too large/
  );
});

test('UC-STU-08: Final submit requires complete Cloudinary video metadata', () => {
  assert.throws(
    () => __testing.validateCloudinarySubmissionMetadata({}, { assignmentId: 9, studentId: 4 }),
    /Cloudinary submission metadata is incomplete/
  );
  assert.throws(
    () => __testing.validateCloudinarySubmissionMetadata({
      public_id: 'slms/submissions/9/4/practice',
      secure_url: 'https://res.cloudinary.com/demo/video/authenticated/practice.mp4',
      resource_type: 'image',
      format: 'mp4',
      bytes: 1200,
      duration: 2
    }, { assignmentId: 9, studentId: 4 }),
    /Cloudinary video/
  );
});

test('UC-STU-08: Final submit rejects public IDs outside the Student assignment folder', () => {
  assert.throws(
    () => __testing.validateCloudinarySubmissionMetadata({
      public_id: 'slms/submissions/9/5/practice',
      secure_url: 'https://res.cloudinary.com/demo/video/authenticated/practice.mp4',
      resource_type: 'video',
      format: 'mp4',
      bytes: 1200,
      duration: 2
    }, { assignmentId: 9, studentId: 4 }),
    /outside the assigned upload folder/
  );
});

test('UC-STU-08: Valid Cloudinary metadata is normalized for storage', () => {
  const media = __testing.validateCloudinarySubmissionMetadata({
    public_id: 'slms/submissions/9/4/practice',
    asset_id: 'asset-1',
    secure_url: 'https://res.cloudinary.com/demo/video/authenticated/practice.mp4',
    resource_type: 'video',
    format: 'MP4',
    bytes: 1200,
    duration: 2.5,
    original_filename: 'practice.mp4',
    type: 'authenticated'
  }, { assignmentId: 9, studentId: 4 });

  assert.deepEqual(media, {
    publicId: 'slms/submissions/9/4/practice',
    assetId: 'asset-1',
    secureUrl: 'https://res.cloudinary.com/demo/video/authenticated/practice.mp4',
    resourceType: 'video',
    format: 'mp4',
    bytes: 1200,
    durationSeconds: 2.5,
    originalFilename: 'practice.mp4',
    deliveryType: 'authenticated'
  });
});

test('UC-TEA-04: Abandoned uploads have no visible submission media', () => {
  assert.equal(__testing.submissionMediaFromRow({ cloudinary_public_id: null }), null);
  assert.equal(__testing.isSubmittedStatus('DRAFT'), false);
  assert.equal(__testing.isSubmittedStatus('SUBMITTED'), true);
  assert.equal(__testing.isSubmittedStatus('NEEDS_REVISION'), true);
});

test('UC-STU-08: Submission comments require bounded plain text', () => {
  assert.equal(__testing.normalizeCommentContent('  Please try again  '), 'Please try again');
  assert.throws(
    () => __testing.normalizeCommentContent(''),
    /Comment is required/
  );
  assert.throws(
    () => __testing.normalizeCommentContent('a'.repeat(1001)),
    /1000 characters/
  );
});
