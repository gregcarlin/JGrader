var async = require('async');
var _ = require('lodash');
var assert = require('assert');
var bcrypt = require('bcrypt');
var fs = require('fs-extra');

var db = require('../../../controllers/db');
var assignment = require('../../../controllers/student/assignment');

describe('Assignment', function() {
  var teacherId;
  var studentId = _.uniqueId();
  var sectionId;
  var assignmentId;
  var submissionId;

  before(function(done) {
    async.series([
      function(cb) {
        db.query("TRUNCATE `teachers`", cb);
      },
      function(cb) {
        db.query("TRUNCATE `sections`", cb);
      },
      function(cb) {
        db.query("TRUNCATE `enrollment`", cb);
      },
      function(cb) {
        db.query("TRUNCATE `assignments`", cb);
      },
      function(cb) {
        bcrypt.hash('password', 10, function(err, hash) {
          if (err) return cb(err);

          db.query("INSERT INTO `teachers` VALUES(NULL, ?, ?, ?, ?, NULL)",
                    ['test@me.com', hash, 'Senor', 'Lewick'],
                    function(err, result) {
            if (err) return cb(err);

            teacherId = result.insertId;
            cb();
          });
        });
      },
      function(cb) {
        db.query("INSERT INTO `sections` VALUES(NULL, ?, ?, ?)",
                  [teacherId, 'Test Class', 'penis'],
                  function(err, result) {
          if (err) return cb(err);
          sectionId = result.insertId;
          cb();
        });
      },
      function(cb) {
        db.query("INSERT INTO `enrollment` VALUES(?, ?)",
                  [sectionId, studentId], cb);
      },
      function(cb) {
        db.query("INSERT INTO `assignments` VALUES(NULL, ?, ?, NULL, CURRENT_TIMESTAMP())",
               [sectionId, 'Test Assignment'],
               function(err, result) {
          if (err) return cb(err);
          assignmentId = result.insertId;
          cb();
        });
      }
    ], done);
  });

  describe('List', function() {
    var assignments;

    before(function(done) {
      assignment.list(studentId, function(err, _assignments) {
        assignments = _assignments;
        done(err);
      });
    });

    it('should list the student\'s assignments', function() {
      assert(assignments);
      assert.equal(assignments.length, 1);
      assert.equal(assignments[0].id, assignmentId);
      assert.equal(assignments[0].assignmentName, 'Test Assignment');
      assert.equal(assignments[0].name, 'Test Class');
    });
  });

  describe('Verify', function() {
    var asssignment;
    var section;
    var assignmentWrong;
    var sectionWrong;

    before(function(done) {
      async.parallel([
        function(cb) {
          assignment.verify(assignmentId, studentId, function(err, _assignment, _section) {
            asssignment = _assignment;
            section = _section;
            cb(err);
          });
        },
        function(cb) {
          assignment.verify(assignmentId, _.uniqueId(), function(err, _assignment, _section) {
            asssignmentWrong = _assignment;
            sectionWrong = _section;
            cb(err);
          });
        }
      ], done);
    });

    it('should retrieve the correct assignment info', function() {
      assert(asssignment);
      assert.equal(asssignment.id, assignmentId);
      assert.equal(asssignment.name, 'Test Assignment');
    });

    it('should retrieve the correct section info', function() {
      assert(section);
      assert.equal(section.id, sectionId);
      assert.equal(section.name, 'Test Class');
    });

    it('should not retrieve data when student is not enrolled', function() {
      assert(!assignmentWrong);
      assert(!sectionWrong);
    });
  });

  describe('Get', function() {
    var data;

    before(function(done) {
      async.series([
        function(cb) {
          db.query("TRUNCATE `files-teachers`", cb);
        },
        function(cb) {
          db.query("TRUNCATE `submissions`", cb);
        },
        function(cb) {
          db.query("TRUNCATE `files`", cb);
        },
        function(cb) {
          db.query("INSERT INTO `files-teachers` VALUES(NULL, ?, ?, ?, ?)",
                           [assignmentId, 'another.txt', 'yoyo ma', 'text/plain'], cb);
        },
        function(cb) {
          db.query("INSERT INTO `submissions` VALUES(NULL, ?, ?, CURRENT_TIMESTAMP(), ?, NULL)",
                    [assignmentId, studentId, 74], function(err, result) {
            if (err) return cb(err);

            submissionId = result.insertId;
            cb();
          });
        },
        function(cb) {
          db.query("INSERT INTO `files` VALUES(NULL, ?, ?, ?, ?, ?),(NULL, ?, ?, ?, ?, ?)",
                    [submissionId, 'test.txt', 'contents here', null, 'text/plain',
                     submissionId, 'another.txt', 'yoyo ma', null, 'text/plain'], cb);
        },
        function(cb) {
          assignment.get(assignmentId, studentId, function(err, _data) {
            data = _data;
            cb(err);
          });
        }
      ], done);
    });

    it('should return data', function() {
      assert(data);
    });

    it('should return the correct file data', function() {
      assert(data.fileData);
      assert.equal(data.fileData.length, 2);
      assert.equal(data.fileData[0].name, 'test.txt');
      assert.equal(data.fileData[0].contents, 'contents here');
      assert.equal(data.fileData[0].grade, 74);
      assert.equal(data.fileData[1].name, 'another.txt');
      assert.equal(data.fileData[1].contents, 'yoyo ma');
      assert.equal(data.fileData[1].grade, 74);
    });

    it('should return the correct teacher file data', function() {
      assert(data.teacherFiles);
      assert.equal(data.teacherFiles.length, 1);
      assert.equal(data.teacherFiles[0], 'another.txt');
    });

    it('should return correct other data', function() {
      assert(!data.anyCompiled);
      assert(!data.anyMain);
    });
  });

  describe('Submission failures', function() {
    var assignment2Id;
    var nothing;
    var badName1;
    var badName2;
    var noJava;
    var duplicates;

    before(function(done) {
      async.parallel([
        function(cb) {
          db.query("TRUNCATE `submissions`", cb);
        },
        function(cb) {
          db.query("TRUNCATE `files`", cb);
        },
        function(cb) {
          db.query("TRUNCATE `files-teachers`", cb);
        },
        function(cb) {
          db.query("INSERT INTO `assignments` VALUES(NULL, ?, ?, NULL, CURRENT_TIMESTAMP())", [sectionId, 'okay'], function(err, result) {
            if (err) return cb(err);

            assignment2Id = result.insertId;
            cb();
          });
        },
        function(cb) {
          assignment.submit(assignment2Id, studentId, {}, function(err) {
            nothing = err;
            cb();
          });
        },
        function(cb) {
          assignment.submit(assignment2Id, studentId, {
            'file[0]': [{
              fieldname: 'file[0]',
              originalname: 'bad#name.txt',
              name: 'bad#name.txt',
              encoding: '7bit',
              mimetype: 'text/plain',
              path: 'test/data/bad#name.txt',
              extension: 'txt',
              size: 69,
              truncated: false,
              buffer: null
            }]
          }, function(err) {
            badName1 = err;
            cb();
          });
        },
        function(cb) {
          assignment.submit(assignment2Id, studentId, {
            'file[0]': [{
              fieldname: 'file[0]',
              originalname: 's.txt',
              name: 's.txt',
              encoding: '7bit',
              mimetype: 'text/plain',
              path: 'test/data/s.txt',
              extension: 'txt',
              size: 27,
              truncated: false,
              buffer: null
            }]
          }, function(err) {
            badName2 = err;
            cb();
          });
        },
        function(cb) {
          assignment.submit(assignment2Id, studentId, {
            'file[0]': [{
              fieldname: 'file[0]',
              originalname: 'valid.txt',
              name: 'valid.txt',
              encoding: '7bit',
              mimetype: 'text/plain',
              path: 'test/data/valid.txt',
              extension: 'txt',
              size: 66,
              truncated: false,
              buffer: null
            }]
          }, function(err) {
            noJava = err;
            cb();
          });
        },
        function(cb) {
          assignment.submit(assignment2Id, studentId, {
            'file[0]': [{
              fieldname: 'file[0]',
              originalname: 'valid.txt',
              name: 'valid.txt',
              encoding: '7bit',
              mimetype: 'text/plain',
              path: 'test/data/valid.txt',
              extension: 'txt',
              size: 66,
              truncated: false,
              buffer: null
            }],
            'file[1]': [{
              fieldname: 'file[1]',
              originalname: 'valid.txt',
              name: 'valid.txt',
              encoding: '7bit',
              mimetype: 'text/plain',
              path: 'test/data/valid.txt',
              extension: 'txt',
              size: 66,
              truncated: false,
              buffer: null
            }]
          }, function(err) {
            duplicates = err;
            cb();
          });
        }
      ], done);
    });

    it('should not allow empty submissions', function() {
      assert(nothing);
      assert.equal(nothing.jgCode, 4);
    });

    it('should not allow non-alphanumeric characters in names', function() {
      assert(badName1);
      assert.equal(badName1.jgCode, 5);
    });

    it('should not allow names shorter than 6 characters long', function() {
      assert(badName2);
      assert.equal(badName2.jgCode, 5);
    });

    it('should require a java file to be submitted', function() {
      assert(noJava);
      assert.equal(noJava.jgCode, 7);
    });

    it('should not allow duplicates', function() {
      assert(duplicates);
      assert.equal(duplicates.jgCode, 8);
    });
  });

  describe('Submit success and Choose main', function() {
    var submissions;
    var files;
    var override;
    var afterMain;

    before(function(done) {
      this.timeout(10000);
      async.series([
        function(cb) {
          db.query("TRUNCATE `submissions`", cb);
        },
        function(cb) {
          db.query("TRUNCATE `files`", cb);
        },
        function(cb) {
          db.query("TRUNCATE `files-teachers`", cb);
        },
        function(cb) {
          fs.readFile('test/data/lenna.png', function(err, data) {
            if (err) return cb(err);

            db.query("INSERT INTO `files-teachers` VALUES(NULL, ?, ?, ?, ?)", [assignmentId, 'lenna.png', data, 'image/png'], cb);
          });
        },
        function(cb) {
          fs.ensureDir('temp/' + studentId + '/', cb);
        },
        function(cb) {
          async.each(['DependA.java', 'DependB.java', 'files.json'], function(name, callback) {
            fs.copy('test/data/' + name, 'temp/' + studentId + '/' + name, callback);
          }, cb);
        },
        function(cb) {
          assignment.submit(assignmentId, studentId, {
            'file[0]': [{
              fieldname: 'file[0]',
              originalname: 'DependA.java',
              name: 'DependA.java',
              encoding: '7bit',
              mimetype: 'application/octet-stream',
              path: 'temp/' + studentId + '/DependA.java',
              extension: 'java',
              size: 225,
              truncated: false,
              buffer: null
            }],
            'file[1]': [{
              fieldname: 'file[1]',
              originalname: 'DependB.java',
              name: 'DependB.java',
              encoding: '7bit',
              mimetype: 'application/octet-stream',
              path: 'temp/' + studentId + '/DependB.java',
              extension: 'java',
              size: 146,
              truncated: false,
              buffer: null
            }],
            'file[2]': [{
              fieldname: 'file[2]',
              originalname: 'files.json',
              name: 'files.json',
              encoding: '7bit',
              mimetype: 'application/json',
              path: 'temp/' + studentId + '/files.json',
              extension: 'json',
              size: 166,
              truncated: false,
              buffer: null
            }]
          }, cb);
        },
        function(cb) {
          assignment.submit(assignmentId, studentId, {
            'file[0]': [{
              fieldname: 'file[0]',
              originalname: 'Hello.java',
              name: 'Hello.java',
              encoding: '7bit',
              mimetype: 'application/octet-stream',
              path: 'temp/' + studentId + '/Hello.java',
              extension: 'java',
              size: 118,
              truncated: false,
              buffer: null
            }]
          }, function(err) {
            override = err;
            cb();
          });
        },
        function(cb) {
          db.query("SELECT * FROM `submissions` WHERE `assignment_id` = ? AND `student_id` = ?",
                    [assignmentId, studentId],
                    function(err, _submissions) {
            submissions = _submissions;
            cb(err);
          });
        },
        function(cb) {
          db.query("SELECT * FROM `files` WHERE `submission_id` = ?", [submissions[0].id], function(err, _files) {
            files = _files;
            cb(err);
          });
        },
        function(cb) {
          assignment.chooseMain(assignmentId, studentId, 'DependA.java', cb);
        },
        function(cb) {
          db.query("SELECT * FROM `submissions` WHERE `id` = ?", [submissions[0].id], function(err, _submissions) {
            afterMain = _submissions;
            cb(err);
          });
        }
      ], done);
    });

    it('should create a submission', function() {
      assert(submissions);
      assert.equal(submissions.length, 1);
      assert.equal(submissions[0].main, 'DependB.java');
    });

    it('should upload the files', function() {
      assert(files);
      assert.equal(files.length, 4);
      assert.equal(files[0].name, 'DependA.java');
      assert(files[0].compiled);
      assert.equal(files[1].name, 'DependB.java');
      assert(files[1].compiled);
      assert.equal(files[2].name, 'files.json');
      assert(!files[2].compiled);
      assert.equal(files[3].name, 'lenna.png');
      assert(!files[3].compiled);
    });

    it('should not allow overriding submissions', function() {
      assert(override);
      assert.equal(override.jgCode, 6);
    });

    it('should set the new main', function() {
      assert(afterMain);
      assert.equal(afterMain.length, 1);
      assert.equal(afterMain[0].id, submissions[0].id);
      assert.equal(afterMain[0].main, 'DependA.java');
    });
  });
});
