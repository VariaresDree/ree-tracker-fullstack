// @ree/shared — business rules that MUST agree between the web client and the API.
//
// A production audit found the same rule implemented in up to EIGHT places, with
// no mechanism keeping the copies honest: the two packages declare no workspace
// relationship in npm terms beyond this one, the client is ESM and the server is
// CommonJS, and no CI step compared them. The verdict thresholds had already
// drifted (server stored CONDITIONAL PASS at >= 50, client rendered FAILED below
// 60), so a 55% board sim showed one result on the results screen and a
// different one in history.
//
// Authored in CommonJS on purpose:
//   • the API is CommonJS and can require() this directly, with no build step;
//   • Vite pre-bundles it for the browser (ree-tracker/vite.config.js lists it
//     in optimizeDeps.include so esbuild converts it to ESM), and named imports
//     resolve through cjs-module-lexer against the `module.exports = { … }`
//     object literals below.
//
// Deliberately a SINGLE entry point rather than subpath exports: one specifier
// for Vite to pre-bundle keeps the bundler configuration to one line and removes
// a class of resolution failure that only shows up in a production build.

'use strict';

module.exports = {
    ...require('./numeric'),
    ...require('./verdict'),
    ...require('./subject'),
    ...require('./syllabusWeights'),
    ...require('./manilaDate'),
    ...require('./text'),
    ...require('./thresholds'),
};
