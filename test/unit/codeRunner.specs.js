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

  describe('execute', function() {
    var stdout;
    var stderr;
    var overTime;

    before(function(done) {
      async.series([
        function(cb) {
          fs.ensureDir('temp/test/', cb);
        },
        function(cb) {
          fs.copy('test/data/Hello.class', 'temp/test/Hello.class', cb);
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

    it('should run without issue', function() {
      assert(!stderr);
      assert(!overTime);
    });

    it('should say hi', function() {
      assert.equal(stdout, 'hello world\n');
    });
  });
});
