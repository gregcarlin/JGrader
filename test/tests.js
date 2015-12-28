var creds = require('../routes/credentials');
creds.mysql_db = 'Jgrader-test';
require('../routes/common');

describe('Unit tests', function() {
  require('./unit/codeRunner.specs');
  require('./unit/teacher.specs');
  require('./unit/student.specs');
});
