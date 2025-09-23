// Debug helper: log stack traces when next/document or next/dist/pages/_document is required
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function (id) {
  if (id === 'next/document' || id === 'next/dist/pages/_document' || id.endsWith('/pages/_document') ) {
    console.error('DEBUG: require called for', id);
    console.error(new Error().stack);
  }
  return originalRequire.apply(this, arguments);
};

// Delegate to npm run build
const { spawnSync } = require('child_process');
const res = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { stdio: 'inherit', env: process.env });
process.exit(res.status);
