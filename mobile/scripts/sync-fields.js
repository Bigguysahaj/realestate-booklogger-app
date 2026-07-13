/* Copies the shared fields config into the app source tree.
 * shared/fields.json is the source of truth — never edit src/fields.json directly.
 * Runs automatically on `npm install` and `npm start` (see package.json). */
const fs = require("fs");
const path = require("path");

const src = path.resolve(__dirname, "..", "..", "shared", "fields.json");
const dest = path.resolve(__dirname, "..", "src", "fields.json");

fs.copyFileSync(src, dest);
console.log(`Synced ${path.relative(process.cwd(), src)} -> ${path.relative(process.cwd(), dest)}`);
