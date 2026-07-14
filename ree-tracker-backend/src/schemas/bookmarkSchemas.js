const { z } = require('zod');

// POST /api/bookmarks — only questionId is written. Validating it here keeps a
// non-string body from reaching Prisma; a non-existent id still hits a P2003
// FK error, which the route now maps to 404 (previously only P2002 was handled,
// so a bad id 500'd).
const bookmarkCreateSchema = z.object({
    questionId: z.string().min(1),
}).strip();

module.exports = { bookmarkCreateSchema };
