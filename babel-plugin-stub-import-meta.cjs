"use strict";
// Babel plugin (Jest "convex" project only): rewrite every `import.meta`
// meta-property to an empty object literal so files can be downlevelled to
// CommonJS. convex-test ships an `import.meta.glob(...)` fallback that is never
// taken under Jest (we always pass an explicit modules map), but it must still
// parse and transform. No backend source uses `import.meta` directly.
module.exports = function stubImportMeta({ types: t }) {
  return {
    name: "stub-import-meta",
    visitor: {
      MetaProperty(path) {
        if (
          path.node.meta.name === "import" &&
          path.node.property.name === "meta"
        ) {
          path.replaceWith(t.objectExpression([]));
        }
      },
    },
  };
};
