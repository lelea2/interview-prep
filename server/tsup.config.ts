import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  // @interview-prep/shared is a workspace package, not a real npm
  // dependency — without this, tsup externalizes it (its default for
  // anything listed in package.json `dependencies`), which only "worked" in
  // local dev because a real node_modules symlink happened to resolve it at
  // runtime. In a real deployment there's no such symlink, so any file that
  // imports a *value* (not just a type) from shared — schemas/tracker.ts,
  // services/openaiClient.ts — would crash on boot with ERR_MODULE_NOT_FOUND.
  // Caught by an actual `docker run` smoke test, not just a build success.
  noExternal: ['@interview-prep/shared'],
});
