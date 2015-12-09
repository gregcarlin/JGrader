var fs = require('fs-extra');
var path = require('path');

data = {
  teacher: require('./teacher/teacher')
};

for (var type in data) {
  for (var category in data[type]) {
    for (var file in data[type][category]) {
      data[type][category][file] = fs.readFileSync(path.resolve(__dirname, type, category, data[type][category][file] + '.sql'), 'UTF-8');
    }
  }
}

module.exports = data;
