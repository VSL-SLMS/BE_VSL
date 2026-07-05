const crypto = require('crypto');

const DEFAULT_FOLDER_ROOT = 'slms/submissions';
const DEFAULT_AVATAR_FOLDER_ROOT = 'slms/avatars';
const DEFAULT_MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const DEFAULT_MAX_AVATAR_UPLOAD_BYTES = 5 * 1024 * 1024;
const DEFAULT_MAX_VIDEO_DURATION_SECONDS = 10 * 60;
const DEFAULT_ALLOWED_FORMATS = ['mp4', 'mov', 'webm'];
const DEFAULT_ALLOWED_AVATAR_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];

function splitFormats(value, fallback = DEFAULT_ALLOWED_FORMATS) {
  const formats = String(value || '')
    .split(',')
    .map((item) => item.trim().replace(/^\./, '').toLowerCase())
    .filter(Boolean);
  return formats.length ? formats : fallback;
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function getUploadLimits(env = process.env) {
  return {
    allowedFormats: splitFormats(env.CLOUDINARY_ALLOWED_FORMATS),
    maxBytes: positiveNumber(env.CLOUDINARY_MAX_UPLOAD_BYTES, DEFAULT_MAX_UPLOAD_BYTES),
    maxDurationSeconds: positiveNumber(
      env.CLOUDINARY_MAX_VIDEO_DURATION_SECONDS,
      DEFAULT_MAX_VIDEO_DURATION_SECONDS
    )
  };
}

function getAvatarUploadLimits(env = process.env) {
  return {
    allowedFormats: splitFormats(env.CLOUDINARY_AVATAR_ALLOWED_FORMATS, DEFAULT_ALLOWED_AVATAR_FORMATS),
    maxBytes: positiveNumber(env.CLOUDINARY_AVATAR_MAX_UPLOAD_BYTES, DEFAULT_MAX_AVATAR_UPLOAD_BYTES)
  };
}

function getCloudinaryConfig(env = process.env) {
  const cloudName = String(env.CLOUDINARY_CLOUD_NAME || '').trim();
  const apiKey = String(env.CLOUDINARY_API_KEY || '').trim();
  const apiSecret = String(env.CLOUDINARY_API_SECRET || '').trim();

  if (!cloudName || !apiKey || !apiSecret) {
    const error = new Error('Cloudinary configuration is missing.');
    error.status = 500;
    error.code = 'CLOUDINARY_CONFIG_MISSING';
    throw error;
  }

  return {
    cloudName,
    apiKey,
    apiSecret,
    folderRoot: String(env.CLOUDINARY_SUBMISSION_FOLDER || DEFAULT_FOLDER_ROOT).replace(/\/+$/, ''),
    uploadType: String(env.CLOUDINARY_UPLOAD_TYPE || 'authenticated').trim() || 'authenticated',
    ...getUploadLimits(env)
  };
}

function cleanPathPart(value, label) {
  const cleaned = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/@/g, '-at-')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!cleaned) {
    const error = new Error(`${label} is required.`);
    error.status = 400;
    error.code = 'INVALID_CLOUDINARY_UPLOAD_SCOPE';
    throw error;
  }

  return cleaned;
}

function getAvatarFolder(user, folderRoot = process.env.CLOUDINARY_AVATAR_FOLDER || DEFAULT_AVATAR_FOLDER_ROOT) {
  const role = cleanPathPart(user?.role, 'Role');
  if (!['student', 'teacher'].includes(role)) {
    const error = new Error('Avatar upload is only available for Students and Teachers.');
    error.status = 403;
    error.code = 'AVATAR_UPLOAD_FORBIDDEN';
    throw error;
  }
  return `${String(folderRoot).replace(/\/+$/, '')}/${role}/${cleanPathPart(user?.email, 'Email')}`;
}

function signParams(params, apiSecret) {
  const serialized = Object.entries(params)
    .filter(([key, value]) => {
      if (['api_key', 'cloud_name', 'file', 'resource_type', 'signature'].includes(key)) return false;
      return value !== undefined && value !== null && value !== '';
    })
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join(',') : value}`)
    .join('&');

  return crypto.createHash('sha1').update(`${serialized}${apiSecret}`).digest('hex');
}

function cleanId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error(`${label} must be a positive integer.`);
    error.status = 400;
    error.code = 'INVALID_CLOUDINARY_UPLOAD_SCOPE';
    throw error;
  }
  return id;
}

function getSubmissionFolder(assignmentId, studentId, folderRoot = process.env.CLOUDINARY_SUBMISSION_FOLDER || DEFAULT_FOLDER_ROOT) {
  return `${String(folderRoot).replace(/\/+$/, '')}/${cleanId(assignmentId, 'Assignment ID')}/${cleanId(studentId, 'Student ID')}`;
}

function createUploadSignature({
  assignmentId,
  studentId,
  env = process.env,
  now = Date.now,
  randomBytes = crypto.randomBytes
}) {
  const config = getCloudinaryConfig(env);
  const timestamp = Math.floor((typeof now === 'function' ? now() : now) / 1000);
  const folder = getSubmissionFolder(assignmentId, studentId, config.folderRoot);
  const publicId = `${timestamp}-${randomBytes(6).toString('hex')}`;
  const params = {
    folder,
    overwrite: false,
    public_id: publicId,
    timestamp,
    type: config.uploadType
  };

  return {
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    signature: signParams(params, config.apiSecret),
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/video/upload`,
    resourceType: 'video',
    deliveryType: config.uploadType,
    publicIdPrefix: `${folder}/`,
    params,
    allowedFormats: config.allowedFormats,
    maxBytes: config.maxBytes,
    maxDurationSeconds: config.maxDurationSeconds
  };
}

function createAvatarUploadSignature({
  user,
  env = process.env,
  now = Date.now
}) {
  const config = getCloudinaryConfig(env);
  const timestamp = Math.floor((typeof now === 'function' ? now() : now) / 1000);
  const folder = getAvatarFolder(user, env.CLOUDINARY_AVATAR_FOLDER || DEFAULT_AVATAR_FOLDER_ROOT);
  const params = {
    folder,
    invalidate: true,
    overwrite: true,
    public_id: 'avatar',
    timestamp,
    type: String(env.CLOUDINARY_AVATAR_UPLOAD_TYPE || 'upload').trim() || 'upload'
  };

  return {
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    signature: signParams(params, config.apiSecret),
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    resourceType: 'image',
    deliveryType: params.type,
    publicIdPrefix: `${folder}/`,
    params,
    ...getAvatarUploadLimits(env)
  };
}

module.exports = {
  createAvatarUploadSignature,
  createUploadSignature,
  getAvatarFolder,
  getAvatarUploadLimits,
  getCloudinaryConfig,
  getSubmissionFolder,
  getUploadLimits,
  signParams,
  __testing: {
    splitFormats
  }
};
