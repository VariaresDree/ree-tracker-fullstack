// Shared quiz files: what both route files need. The bytes stay out of every list.
const crypto = require('node:crypto');

const MAX_QUIZ_FILE_BYTES = 5 * 1024 * 1024;

const LIST_SELECT = {
    id: true,
    name: true,
    fileName: true,
    subject: true,
    description: true,
    sizeBytes: true,
    questionCount: true,
    skippedCount: true,
    checksum: true,
    createdAt: true,
    updatedAt: true,
};

// Quiz files are ZIP archives. The server doesn't read further: only an admin
// can upload, the admin's browser has already parsed the file, and each learner's
// browser parses it again and handles a bad one.
const looksLikeZip = (buf) => buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;

const checksumOf = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

module.exports = { MAX_QUIZ_FILE_BYTES, LIST_SELECT, looksLikeZip, checksumOf };
