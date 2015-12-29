var codeRunner = require('../../controllers/codeRunner');
var fs = require('fs-extra');
var assert = require('assert');
var _ = require('lodash');

describe('codeRunner', function() {
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
      this.timeout(12000); // code is allowed to run for 10 seconds
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
      this.timeout(12000); // code is allowed to run for 10 seconds
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
});
