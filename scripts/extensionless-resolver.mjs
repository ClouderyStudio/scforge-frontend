/**
 * Node ESM loader hook that resolves extensionless relative specifiers.
 *
 * @material/material-color-utilities ships ESM whose internal imports omit the
 * ".js" suffix (e.g. './dynamiccolor/dynamic_color'). Node refuses those, so
 * "pnpm theme" registers this hook before importing it.
 */
const EXTENSIONS = ['.js', '.mjs', '.cjs', '.json']

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context)
  } catch (error) {
    if (!specifier.startsWith('.') && !specifier.startsWith('/')) throw error
    for (const extension of EXTENSIONS) {
      try {
        return await nextResolve(specifier + extension, context)
      } catch {
        /* try the next extension */
      }
    }
    throw error
  }
}
