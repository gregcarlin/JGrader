var codeRunner = require('../../controllers/codeRunner');
var fs = require('fs-extra');
var assert = require('assert');
var _ = require('lodash');

describe('codeRunner', function() {
  this.timeout(4000);

  describe('setupDirectory and cleanup', function() {
    var files = require('../data/files');
    var uniqueId;
    var savedFiles;
    var exists;

    before(function(done) {
      async.series([
        function(cb) {
          codeRunner.setupDirectory(files, function(err, uniqueIds) {
            uniqueId = uniqueIds[files[0].student_id];
            cb(err);
          });
        },
        function(cb) {
          fs.readdir('temp/' + uniqueId, function(err, files) {
            savedFiles = files;
            cb(err);
          });
        },
        function(cb) {
          codeRunner.cleanup(uniqueId, cb);
        },
        function(cb) {
          fs.exists('temp/' + uniqueId, function(doesExist) {
            exists = doesExist;
            cb();
          });
        }
      ], done);
    });

    it('should create a unique id', function() {
      assert(uniqueId);
    });

    it('should save the given files', function() {
      assert.equal(files.length, savedFiles.length);
      _.each(files, function(file) {
        assert(_.contains(savedFiles, file.name));
      });
    });

    it('should then remove the directory', function() {
      assert(!exists);
    });
  });

  describe('Successful compile and execute', function() {
    var compStderr;
    var exists;
    var stdout;
    var stderr;
    var overTime;

    before(function(done) {
      async.series([
        function(cb) {
          fs.ensureDir('temp/test/', cb);
        },
        function(cb) {
          fs.copy('test/data/Hello.java', 'temp/test/Hello.java', cb);
        },
        function(cb) {
          codeRunner.compile('temp/test/Hello.java', function(err, _stdout, _stderr) {
            compStderr = _stderr;
            cb(err);
          });
        },
        function(cb) {
          fs.access('temp/test/Hello.class', function(err) {
            exists = !err;
            cb(err);
          });
        },
        function(cb) {
          codeRunner.execute('test', 'Hello', null,
                             function(err, _stdout, _stderr, _overTime) {
            stdout = _stdout;
            stderr = _stderr;
            overTime = _overTime;
            cb(err);
          });
        },
        function(cb) {
          fs.remove('temp/test/', cb);
        }
      ], done);
    });

    it('should compile without issue', function() {
      if (compStderr) console.log(compStderr);
      assert(!compStderr);
      assert(exists);
    });

    it('should run without issue', function() {
      if (stderr) console.log(stderr);
      assert(!stderr);
      assert(!overTime);
    });

    it('should say hi', function() {
      assert.equal(stdout, 'hello world\n');
    });
  });

  describe('Compile and execute with infinite loop', function() {
    var compStderr;
    var exists;
    var stdout;
    var stderr;
    var overTime;

    before(function(done) {
      this.timeout(15000); // code is allowed to run for 10 seconds
      async.series([
        function(cb) {
          fs.ensureDir('temp/test/', cb);
        },
        function(cb) {
          fs.copy('test/data/Infinite.java', 'temp/test/Infinite.java', cb);
        },
        function(cb) {
          codeRunner.compile('temp/test/Infinite.java', function(err, _stdout, _stderr) {
            compStderr = _stderr;
            cb(err);
          });
        },
        function(cb) {
          fs.access('temp/test/Infinite.class', function(err) {
            exists = !err;
            cb(err);
          });
        },
        function(cb) {
          codeRunner.execute('test', 'Infinite', null,
                             function(err, _stdout, _stderr, _overTime) {
            stdout = _stdout;
            stderr = _stderr;
            overTime = _overTime;
            cb(err);
          });
        },
        function(cb) {
          fs.remove('temp/test/', cb);
        }
      ], done);
    });

    it('should compile without issue', function() {
      if (compStderr) console.log(compStderr);
      assert(!compStderr);
      assert(exists);
    });

    it('should report that code took too long', function() {
      if (stderr) console.log(stderr);
      assert(!stderr);
      assert(overTime);
    });
  });

  describe('Compile and execute with dependencies', function() {
    var compStderr;
    var existsA;
    var existsB;
    var stdout;
    var stderr;
    var overTime;

    before(function(done) {
      async.series([
        function(cb) {
          fs.ensureDir('temp/test/', cb);
        },
        function(cb) {
          fs.copy('test/data/DependA.java', 'temp/test/DependA.java', cb);
        },
        function(cb) {
          fs.copy('test/data/DependB.java', 'temp/test/DependB.java', cb);
        },
        function(cb) {
          codeRunner.compile('temp/test/DependA.java temp/test/DependB.java', function(err, _stdout, _stderr) {
            compStderr = _stderr;
            cb(err);
          });
        },
        function(cb) {
          fs.access('temp/test/DependA.class', function(err) {
            existsA = !err;
            cb(err);
          });
        },
        function(cb) {
          fs.access('temp/test/DependB.class', function(err) {
            existsB = !err;
            cb(err);
          });
        },
        function(cb) {
          codeRunner.execute('test', 'DependB', null,
                             function(err, _stdout, _stderr, _overTime) {
            stdout = _stdout;
            stderr = _stderr;
            overTime = _overTime;
            cb(err);
          });
        },
        function(cb) {
          fs.remove('temp/test/', cb);
        }
      ], done);
    });

    it('should compile without issue', function() {
      if (compStderr) console.log(compStderr);
      assert(!compStderr);
      assert(existsA);
      assert(existsB);
    });

    it('should run without issue', function() {
      if (stderr) console.log(stderr);
      assert(!stderr);
      assert(!overTime);
    });

    it('should return the correct answer', function() {
      assert.equal(stdout, '18\n');
    });
  });

  describe('Compile and execute with input', function() {
    var compStderr;
    var exists;
    var stdout;
    var stderr;
    var overTime;

    before(function(done) {
      async.series([
        function(cb) {
          fs.ensureDir('temp/test/', cb);
        },
        function(cb) {
          fs.copy('test/data/Input.java', 'temp/test/Input.java', cb);
        },
        function(cb) {
          codeRunner.compile('temp/test/Input.java', function(err, _stdout, _stderr) {
            compStderr = _stderr;
            cb(err);
          });
        },
        function(cb) {
          fs.access('temp/test/Input.class', function(err) {
            exists = !err;
            cb(err);
          });
        },
        function(cb) {
          codeRunner.execute('test', 'Input', '7',
                             function(err, _stdout, _stderr, _overTime) {
            stdout = _stdout;
            stderr = _stderr;
            overTime = _overTime;
            cb(err);
          });
        },
        function(cb) {
          fs.remove('temp/test/', cb);
        }
      ], done);
    });

    it('should compile without issue', function() {
      if (compStderr) console.log(compStderr);
      assert(!compStderr);
      assert(exists);
    });

    it('should run without issue', function() {
      if (stderr) console.log(stderr);
      assert(!stderr);
      assert(!overTime);
    });

    it('should return the correct answer', function() {
      assert.equal(stdout, '21\n');
    });
  });

  describe('Running tests', function() {
    var sectionId = _.uniqueId();
    var assignmentId;
    var studentAId = _.uniqueId();
    var studentBId = _.uniqueId();
    var submissionAId;
    var submissionBId;
    var inputJava;
    var wrongJava;
    var inputCompiled;
    var wrongCompiled;
    var preResultsA;
    var preResultsB;
    var postResultsA;
    var postResultsB;

    before(function(done) {
      this.timeout(8000);
      async.series([
        function(cb) {
          connection.query("TRUNCATE `test-cases`", cb);
        },
        function(cb) {
          connection.query("TRUNCATE `test-case-results`", cb);
        },
        function(cb) {
          connection.query("INSERT INTO `assignments` VALUES(NULL, ?, ?, NULL, CURRENT_TIMESTAMP())", [sectionId, 'Test'], function(err, result) {
            if (err) return cb(err);

            assignmentId = result.insertId;
            cb();
          });
        },
        function(cb) {
          connection.query("INSERT INTO `submissions` VALUES(NULL, ?, ?, CURRENT_TIMESTAMP(), NULL, ?)",
                           [assignmentId, studentAId, 'Input.java'], function(err, result) {
            if (err) return cb(err);

            submissionAId = result.insertId;
            cb();
          });
        },
        function(cb) {
          connection.query("INSERT INTO `submissions` VALUES(NULL, ?, ?, CURRENT_TIMESTAMP(), NULL, ?)",
                           [assignmentId, studentBId, 'WrongInput.java'], function(err, result) {
            if (err) return cb(err);

            submissionBId = result.insertId;
            cb();
          });
        },
        function(cb) {
          fs.readFile('test/data/Input.java', function(err, _inputJava) {
            inputJava = _inputJava;
            cb(err);
          });
        },
        function(cb) {
          fs.readFile('test/data/WrongInput.java', function(err, _wrongJava) {
            wrongJava = _wrongJava;
            cb(err);
          });
        },
        function(cb) {
          codeRunner.compile('test/data/Input.java test/data/WrongInput.java', cb);
        },
        function(cb) {
          fs.readFile('test/data/Input.class', function(err, _inputCompiled) {
            inputCompiled = _inputCompiled;
            cb(err);
          });
        },
        function(cb) {
          fs.readFile('test/data/WrongInput.class', function(err, _wrongCompiled) {
            wrongCompiled = _wrongCompiled;
            cb(err);
          });
        },
        function(cb) {
          connection.query("INSERT INTO `files` VALUES(NULL, ?, ?, ?, ?, ?),(NULL, ?, ?, ?, ?, ?)",
                           [submissionAId, 'Input.java', inputJava, inputCompiled, 'application/octet-stream',
                            submissionBId, 'WrongInput.java', wrongJava, wrongCompiled, 'application/octet-stream'], cb);
        },
        function(cb) {
          connection.query("INSERT INTO `test-cases` VALUES(NULL, ?, ?, ?),(NULL, ?, ?, ?),(NULL, ?, ?, ?)",
                           [assignmentId, 0, 0, assignmentId, 2, 6, assignmentId, 7, 21], cb);
        },
        function(cb) {
          connection.query("SELECT * FROM `test-case-results` WHERE `submission_id` = ?", [submissionAId], function(err, results) {
            preResultsA = results;
            cb(err);
          });
        },
        function(cb) {
          connection.query("SELECT * FROM `test-case-results` WHERE `submission_id` = ?", [submissionBId], function(err, results) {
            preResultsB = results;
            cb(err);
          });
        },
        function(cb) {
          codeRunner.runTestsForAssignment(assignmentId, cb);
        },
        function(cb) {
          fs.unlink('test/data/Input.class', cb);
        },
        function(cb) {
          fs.unlink('test/data/WrongInput.class', cb);
        },
        function(cb) {
          connection.query("SELECT * FROM `test-case-results` WHERE `submission_id` = ?", [submissionAId], function(err, results) {
            postResultsA = results;
            cb(err);
          });
        },
        function(cb) {
          connection.query("SELECT * FROM `test-case-results` WHERE `submission_id` = ?", [submissionBId], function(err, results) {
            postResultsB = results;
            cb(err);
          });
        }
      ], done);
    });

    it('should run the test cases against all submissions for the assignment', function() {
      assert(preResultsA);
      assert.equal(preResultsA.length, 0);
      assert(preResultsB);
      assert.equal(preResultsB.length, 0);

      assert(postResultsA);
      assert(postResultsB);
    });

    it('should correctly identify good and bad code', function() {
      assert.equal(postResultsA.length, 3);
      assert.equal(postResultsA[0].result, 0);
      assert(postResultsA[0].pass);
      assert.equal(postResultsA[1].result, 6);
      assert(postResultsA[1].pass);
      assert.equal(postResultsA[2].result, 21);
      assert(postResultsA[2].pass);

      assert.equal(postResultsB.length, 3);
      assert.equal(postResultsB[0].result, 0);
      assert(postResultsB[0].pass);
      assert.equal(postResultsB[1].result, 8);
      assert(!postResultsB[1].pass);
      assert.equal(postResultsB[2].result, 28);
      assert(!postResultsB[2].pass);
    });
  });
});
