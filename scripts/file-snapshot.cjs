const fs = require('node:fs');

function contentOf(file) {
  try {
    return fs.readFileSync(file);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function snapshotFile(file) {
  const original = fs.readFileSync(file);
  return function restore() {
    const current = contentOf(file);
    if (current === null || !current.equals(original)) fs.writeFileSync(file, original);
  };
}

module.exports = { snapshotFile };
