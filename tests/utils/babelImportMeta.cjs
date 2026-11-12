/**
 * Babel plugin for Jest only: replaces `import.meta` with an empty object.
 *
 * React Router 8 ships ESM only and reads `import.meta.hot` (Vite's hot reload) in code the tests
 * never reach. Jest runs CommonJS, where `import.meta` is a syntax error, so Babel has to remove it
 * when it compiles react-router for the tests. Written here rather than added as a dependency.
 */
module.exports = function importMetaToObject({ types: t }) {
  return {
    name: 'import-meta-to-object',
    visitor: {
      MetaProperty(path) {
        if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
          path.replaceWith(t.objectExpression([]));
        }
      },
    },
  };
};
