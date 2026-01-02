const esbuild = require('esbuild');
const path = require('path');

const buildUMD = async () => {
  // Build non-minified UMD
  await esbuild.build({
    entryPoints: ['build/esm5/index.js'],
    bundle: true,
    format: 'iife',
    globalName: 'ClassTransformer',
    outfile: 'build/bundles/typedi.umd.js',
    sourcemap: true,
    platform: 'browser',
  });

  // Build minified UMD
  await esbuild.build({
    entryPoints: ['build/esm5/index.js'],
    bundle: true,
    format: 'iife',
    globalName: 'ClassTransformer',
    outfile: 'build/bundles/typedi.umd.min.js',
    sourcemap: true,
    minify: true,
    platform: 'browser',
  });

  console.log('UMD bundles built successfully!');
};

buildUMD().catch(() => process.exit(1));