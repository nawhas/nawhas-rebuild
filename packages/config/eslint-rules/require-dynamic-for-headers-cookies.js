/**
 * ESLint rule: require-dynamic-for-headers-cookies
 *
 * Warns when a file imports headers() or cookies() from 'next/headers'
 * without exporting 'const dynamic = "force-dynamic"'
 *
 * These APIs are async dynamic APIs in Next.js 16 and require the enclosing
 * route to opt out of static rendering; otherwise Next raises a
 * DYNAMIC_SERVER_USAGE error at build/request time.
 * https://nextjs.org/docs/app/building-your-application/rendering/dynamic-rendering#dynamic-apis
 *
 * Only applies to:
 * - Route components (page.tsx and layout.tsx files in app directories)
 * - Server actions that actually call headers() or cookies()
 */

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require export const dynamic = "force-dynamic" when using headers() or cookies() from next/headers',
      category: 'Best Practices',
      recommended: true,
      url: 'https://nextjs.org/docs/app/building-your-application/rendering/dynamic-rendering',
    },
    fixable: null,
    schema: [],
  },

  create(context) {
    const filename = context.filename;

    // Only check route components (pages and layouts)
    const isRouteComponent = /app\/.*\/(page|layout)\.(tsx|ts|jsx|js)$/.test(filename);

    if (!isRouteComponent) {
      return {};
    }

    let hasHeadersOrCookiesImportUsed = false;
    let hasDynamicExport = false;

    return {
      // Check for imports of headers or cookies from next/headers
      ImportDeclaration(node) {
        if (node.source.value === 'next/headers') {
          node.specifiers.forEach((specifier) => {
            if (
              specifier.type === 'ImportSpecifier' &&
              (specifier.imported.name === 'headers' ||
                specifier.imported.name === 'cookies')
            ) {
              hasHeadersOrCookiesImportUsed = true;
            }
          });
        }
      },

      // Check for export const dynamic = 'force-dynamic'
      ExportNamedDeclaration(node) {
        if (
          node.declaration &&
          node.declaration.type === 'VariableDeclaration'
        ) {
          node.declaration.declarations.forEach((decl) => {
            if (
              decl.id.name === 'dynamic' &&
              decl.init &&
              decl.init.value === 'force-dynamic'
            ) {
              hasDynamicExport = true;
            }
          });
        }
      },

      // Check for searchParams prop in route component parameters
      FunctionDeclaration(node) {
        if (node.params.length > 0) {
          node.params.forEach((param) => {
            if (param.type === 'ObjectPattern') {
              param.properties.forEach((prop) => {
                if (prop.type === 'Property' && prop.key.name === 'searchParams') {
                  hasHeadersOrCookiesImportUsed = true;
                }
              });
            }
          });
        }
      },

      // Program end - check if warning is needed
      'Program:exit'() {
        if (hasHeadersOrCookiesImportUsed && !hasDynamicExport) {
          context.report({
            node: context.sourceCode.ast,
            message:
              'Route components using headers(), cookies() from next/headers or searchParams must export "const dynamic = \'force-dynamic\'" to avoid DYNAMIC_SERVER_USAGE errors under Next.js 16 async dynamic APIs',
            loc: {
              line: 1,
              column: 0,
            },
          });
        }
      },
    };
  },
};
