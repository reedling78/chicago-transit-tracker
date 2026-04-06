/**
 * Custom Jest resolver that forces firebase-admin and firebase-functions
 * to always resolve from the root node_modules, even when source files
 * are physically located in functions/src/ (via the @functions/ alias).
 *
 * Without this, jest.mock('firebase-admin/firestore') mocks the root copy
 * but functions/src/ code imports from functions/node_modules/ — two
 * different module instances, so the mock never applies.
 */
module.exports = (path, options) => {
  if (path.startsWith('firebase-admin') || path.startsWith('firebase-functions')) {
    return options.defaultResolver(path, {
      ...options,
      rootDir: undefined,
      basedir: options.rootDir || process.cwd(),
    })
  }
  return options.defaultResolver(path, options)
}
