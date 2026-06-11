const fs = require('fs');
const path = require('path');

const adapters = {};

fs.readdirSync(__dirname).forEach(file => {
  if (file !== 'index.js' && file.endsWith('.js')) {
    const adapter = require(path.join(__dirname, file));
    if (adapter.platform) {
      adapters[adapter.platform] = adapter;
    }
  }
});

module.exports = adapters;
