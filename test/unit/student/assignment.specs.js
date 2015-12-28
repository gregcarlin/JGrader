var async = require('async');
var _ = require('lodash');
var assert = require('assert');
var bcrypt = require('bcrypt');
var fs = require('fs-extra');

require('../../../routes/common');
var assignment = require('../../../controllers/student/assignment');

describe('Assignment', function() {
  var teacherId;
  var studentId = _.uniqueId();
  var sectionId;
  var assignmentId;

  before(function(done) {
    async.series([
      function(cb) {
        connection.query("TRUNCATE `teachers`", cb);
      },
      function(cb) {
        connection.query("TRUNCATE `sections`", cb);
      },
      function(cb) {
        connection.query("TRUNCATE `enrollment`", cb);
      },
      function(cb) {
        connection.query("TRUNCATE `assignments`", cb);
      },
      function(cb) {
        bcrypt.hash('password', 10, function(err, hash) {
          if (err) return cb(err);

          connection.query("INSERT INTO `teachers` VALUES(NULL, ?, ?, ?, ?, NULL)",
                          ['test@me.com', hash, 'Senor', 'Lewick'],
                          function(err, result) {
            if (err) return cb(err);

            teacherId = result.insertId;
            cb();
          });
        });
      },
      function(cb) {
        connection.query("INSERT INTO `sections` VALUES(NULL, ?, ?, ?)",
                         [teacherId, 'Test Class', 'penis'],
                         function(err, result) {
          if (err) return cb(err);
          sectionId = result.insertId;
          cb();
        });
      },
      function(cb) {
        connection.query("INSERT INTO `enrollment` VALUES(?, ?)",
                         [sectionId, studentId], cb);
      },
      function(cb) {
        connection.query("INSERT INTO `assignments` VALUES(NULL, ?, ?, NULL, CURRENT_TIMESTAMP())",
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
      assignment.get(assignmentId, studentId, function(err, _data) {
        data = _data;
        done(err);
      });
    });

    it('should return the correct data', function() {
      // TODO actually add files to check data for
    });
  });

  describe('Submission failures', function() {
    var nothing;
    var badName1;
    var badName2;
    var noJava;
    var duplicates;

    before(function(done) {
      async.parallel([
        function(cb) {
          assignment.submit(assignmentId, studentId, {}, function(err) {
            nothing = err;
            cb();
          });
        },
        function(cb) {
          assignment.submit(assignmentId, studentId, {
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
          assignment.submit(assignmentId, studentId, {
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
          assignment.submit(assignmentId, studentId, {
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
          assignment.submit(assignmentId, studentId, {
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
      async.series([
        function(cb) {
          connection.query("TRUNCATE `submissions`", cb);
        },
        function(cb) {
          connection.query("TRUNCATE `files`", cb);
        },
        function(cb) {
          assignment.submit(assignmentId, studentId, {
            'file[0]': [{
              fieldname: 'file[0]',
              originalname: 'DependA.java',
              name: 'DependA.java',
              encoding: '7bit',
              mimetype: 'application/octet-stream',
              path: 'test/data/DependA.java',
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
              path: 'test/data/DependB.java',
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
              path: 'test/data/files.json',
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
              path: 'test/data/Hello.java',
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
          connection.query("SELECT * FROM `submissions` WHERE `assignment_id` = ? AND `student_id` = ?",
                           [assignmentId, studentId],
                           function(err, _submissions) {
            submissions = _submissions;
            cb(err);
          });
        },
        function(cb) {
          connection.query("SELECT * FROM `files` WHERE `submission_id` = ?", [submissions[0].id], function(err, _files) {
            files = _files;
            cb(err);
          });
        },
        function(cb) {
          fs.unlink('test/data/DependA.class', cb);
        },
        function(cb) {
          fs.unlink('test/data/DependB.class', cb);
        },
        function(cb) {
          assignment.chooseMain(assignmentId, studentId, 'DependA.java', cb);
        },
        function(cb) {
          connection.query("SELECT * FROM `submissions` WHERE `id` = ?", [submissions[0].id], function(err, _submissions) {
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
      assert.equal(files.length, 3);
      assert.equal(files[0].name, 'DependA.java');
      assert(files[0].compiled);
      assert.equal(files[1].name, 'DependB.java');
      assert(files[1].compiled);
      assert.equal(files[2].name, 'files.json');
      assert(!files[2].compiled);
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
