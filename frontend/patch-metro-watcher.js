const fs = require('fs');
const path = require('path');

const watcherPath = path.join(__dirname, 'node_modules/metro-file-map/src/watchers/FallbackWatcher.js');

// Read the ORIGINAL file (remove any patches first)
let content = fs.readFileSync(watcherPath, 'utf8');

// Remove ALL previous patches
content = content.replace(/\n  \/\/ INOTIFY_LIMIT_PATCH.*?return true;\n  \}\n/gs, '\n');
content = content.replace(/\n  \/\/ INOTIFY_LIMIT_PATCH_V2.*?return true;\n  \}\n/gs, '\n');

// Replace conditional watchdir call back to original
content = content.replace(
  'if (this._shouldWatch(dir)) this._watchdir(dir);',
  'this._watchdir(dir);'
);

// Now apply clean patch V3
const patchCode = `
  // INOTIFY_LIMIT_PATCH_V3
  _shouldWatch(dir) {
    const nm = '/node_modules/';
    const nmIdx = dir.indexOf(nm);
    if (nmIdx === -1) return true;
    
    const afterNm = dir.substring(nmIdx + nm.length);
    const parts = afterNm.split('/');
    
    // Determine package name (handle scoped packages)
    let pkgName, pkgDepth;
    if (parts[0] && parts[0].startsWith('@')) {
      pkgName = parts[0] + '/' + (parts[1] || '');
      pkgDepth = parts.length - 2;
    } else {
      pkgName = parts[0];
      pkgDepth = parts.length - 1;
    }
    
    // ALWAYS skip: native, test, docs directories at any depth
    const lastPart = parts[parts.length - 1];
    const skipDirs = new Set(['android','ios','windows','macos','ReactCommon','ReactAndroid',
      'Libraries','sdks','template','third-party','apple','cpp','jni','cmake',
      'RNReanimated','fabric','paper','codegen','__tests__','__fixtures__',
      '__mocks__','test','tests','docs','example','examples','fixtures',
      'benchmark','coverage','flow-typed','types_generated']);
    
    for (const part of parts) {
      if (skipDirs.has(part)) return false;
    }
    
    // Skip nested node_modules (depth >= 1 nested)
    const nmCount = (afterNm.match(/node_modules/g) || []).length;
    if (nmCount >= 1) return false;
    
    // Limit depth within packages to 3 levels (package/a/b/c max)
    if (pkgDepth > 3) return false;
    
    return true;
  }
`;

content = content.replace(
  '  _register(filepath, type) {',
  patchCode + '\n  _register(filepath, type) {'
);

content = content.replace(
  '(dir) => {\n          this._watchdir(dir);',
  '(dir) => {\n          if (this._shouldWatch(dir)) this._watchdir(dir);'
);

fs.writeFileSync(watcherPath, content, 'utf8');
console.log('FallbackWatcher patched (v3) successfully');
