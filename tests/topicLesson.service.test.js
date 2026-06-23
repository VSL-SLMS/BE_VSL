const test = require('node:test');
const assert = require('node:assert/strict');
const topicLessonService = require('../src/services/topicLesson.service');

test('UC-STU-09: Cloudinary topic lesson data is grouped with vocabulary metadata', () => {
  const topics = topicLessonService.__testing.groupDatasetByTopic();
  const totalItems = topics.reduce((sum, topic) => sum + topic.items.length, 0);

  assert.equal(topics.length, 8);
  assert.equal(totalItems, 150);
  assert.ok(topics.every((topic) => topic.topic_slug && topic.title && topic.description));
  assert.ok(topics.every((topic) => topic.items.every((item) => (
    item.label &&
    item.topic_slug &&
    item.cloudinary_public_id &&
    item.secure_url &&
    item.resource_type === 'video'
  ))));
});

test('UC-STU-09: Topic video keys and descriptions use word-level content', () => {
  assert.equal(topicLessonService.__testing.normalizeVideoKey('D0001B.mp4'), 'D0001B');

  const description = topicLessonService.__testing.buildItemDescription({
    label: 'dia chi',
    topic: 'Dia ly'
  });

  assert.match(description, /dia chi/);
  assert.match(description, /Dia ly/);
});
