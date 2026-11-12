// The prompt and the reply for Tag subtopics live in @ree/shared, where the
// server's background run (services/subtopicAutoTag.js) reads them too.
export { TAG_BATCH, TAG_SYSTEM, buildTagPrompt, readTagReply, splitTags } from '@ree/shared/subtopicTagPrompt';
