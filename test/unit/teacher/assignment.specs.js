var async = require('async');
var _ = require('lodash');
var assert = require('assert');
var bcrypt = require('bcrypt');

require('../../../routes/common');
var assignment = require('../../../controllers/teacher/assignment');

describe('Assignment', function() {
  before(function(done) {
    async.parallel([
      function(cb) {
        connection.query("TRUNCATE `sections`", cb);
      },
      function(cb) {
        connection.query("TRUNCATE `assignments`", cb);
      },
      function(cb) {
        connection.query("TRUNCATE `files-teachers`", cb);
      },
      function(cb) {
        connection.query("TRUNCATE `students`", cb);
      },
      function(cb) {
        connection.query("TRUNCATE `enrollment`", cb);
      }
    ], done);
  });

  describe('Create and List and List Sections', function() {
    var teacherId = _.uniqueId();
    var sectionId;
    var assignments;
    var listed;
    var listedSections;

    before(function(done) {
      async.series([
        function(cb) {
          connection.query("INSERT INTO `sections` VALUES(NULL, ?, ?, ?)",
                           [teacherId, 'Test Class', '12345'],
                           function(err, result) {
            if (err) return cb(err);
            sectionId = result.insertId;
            cb();
          });
        },
        function(cb) {
          assignment.create(teacherId, sectionId, 'Test Assignment', '',
                            '2015/09/17 21:23', [], cb);
        },
        function(cb) {
          connection.query("SELECT * FROM `assignments` WHERE `section_id` = ?",
                           [sectionId], function(err, _assignments) {
            assignments = _assignments;
            cb(err);
          });
        },
        function(cb) {
          assignment.list(teacherId, function(err, results) {
            listed = results;
            cb(err);
          });
        },
        function(cb) {
          assignment.listSections(teacherId, function(err, results) {
            listedSections = results;
            cb(err);
          });
        }
      ], done);
    });

    it('should create an assignment', function() {
      assert(sectionId);
      assert(assignments);
      assert.equal(assignments.length, 1);
      assert.equal(assignments[0].name, 'Test Assignment');
    });

    it('should list the created assignment', function() {
      assert(listed)
      assert.equal(listed.length, 1);
      assert.equal(listed[0].aname, 'Test Assignment');
    });

    it('should list the section', function() {
      assert(listedSections);
      assert.equal(listedSections.length, 1);
      assert.equal(listedSections[0].name, 'Test Class');
    });
  });

  describe('Add and remove teacher files', function() {
    var teacherId = _.uniqueId();
    var sectionId;
    var assignmentId;
    var preFiles;
    var postFiles;
    var addErr;
    var removeErr;

    before(function(done) {
      async.series([
        function(cb) {
          connection.query("TRUNCATE `submissions`", cb);
        },
        function(cb) {
          connection.query("INSERT INTO `sections` VALUES(NULL, ?, ?, ?)",
                           [teacherId, 'Test Class', '87189'],
                           function(err, result) {
            if (err) return cb(err);
            sectionId = result.insertId;
            cb();
          });
        },
        function(cb) {
          connection.query("INSERT INTO `assignments` \
                            VALUES(NULL, ?, ?, NULL, CURRENT_TIMESTAMP())",
                           [sectionId, 'Blah blah assignment'],
                           function(err, result) {
            if (err) return cb(err);
            assignmentId = result.insertId;
            cb();
          });
        },
        function(cb) {
          assignment.addFile(assignmentId, {
            name: 'Test_file.txt',
            buffer: new Buffer('test contents'),
            mimetype: 'text/plain'
          }, cb);
        },
        function(cb) {
          assignment.addFile(assignmentId, {
            name: 'Another.txt',
            buffer: new Buffer('hi there'),
            mimetype: 'text/plain'
          }, cb);
        },
        function(cb) {
          connection.query("SELECT * FROM `files-teachers` \
                            WHERE `assignment_id` = ?",
                           [assignmentId], function(err, files) {
            preFiles = files;
            cb(err);
          });
        },
        function(cb) {
          assignment.removeFile(assignmentId, 'Test_file.txt', cb);
        },
        function(cb) {
          connection.query("SELECT * FROM `files-teachers` \
                            WHERE `assignment_id` = ?",
                           [assignmentId], function(err, files) {
            postFiles = files;
            cb(err);
          });
        },
        function(cb) {
          connection.query("INSERT INTO `submissions` VALUES(NULL, ?, ?, CURRENT_TIMESTAMP(), NULL, NULL)",
                           [assignmentId, _.uniqueId()], cb);
        },
        function(cb) {
          assignment.addFile(assignmentId, {
            name: 'Toolate.txt',
            buffer: new Buffer('Oh no'),
            mimetype: 'text/plain'
          }, function(err) {
            addErr = err;
            cb();
          });
        },
        function(cb) {
          assignment.removeFile(assignmentId, 'Still2late.text', function(err) {
            removeErr = err;
            cb();
          });
        }
      ], done);
    });

    it('should add a file without issue', function() {
      assert(preFiles);
      assert.equal(preFiles.length, 2);
      assert.equal(preFiles[0].name, 'Test_file.txt');
      assert.equal(preFiles[1].name, 'Another.txt');
    });

    it('should remove a file without issue', function() {
      assert(postFiles);
      assert.equal(postFiles.length, 1);
      assert.equal(postFiles[0].name, 'Another.txt');
    });

    it('should disallow adding files after first submission', function() {
      assert(addErr);
      assert.equal(addErr.jgCode, 52);
    });

    it('should disallow removing files after first submission', function() {
      assert(removeErr);
      assert.equal(removeErr.jgCode, 51);
    });
  });

  describe('Set description and due date', function() {
    var teacherId = _.uniqueId();
    var sectionId;
    var assignmentId;
    var assignmentData;
    var invalidErr;

    before(function(done) {
      async.series([
        function(cb) {
          connection.query("INSERT INTO `sections` VALUES(NULL, ?, ?, ?)",
                           [teacherId, 'Test Class', '19q3a'],
                           function(err, result) {
            if (err) return cb(err);
            sectionId = result.insertId;
            cb();
          });
        },
        function(cb) {
          connection.query("INSERT INTO `assignments` \
                            VALUES(NULL, ?, ?, NULL, CURRENT_TIMESTAMP())",
                           [sectionId, 'Blah assignment'],
                           function(err, result) {
            if (err) return cb(err);
            assignmentId = result.insertId;
            cb();
          });
        },
        function(cb) {
          assignment.setDescription(assignmentId, 'new description', cb);
        },
        function(cb) {
          assignment.setDescription(assignmentId, '<em>invalid</em>', function(err) {
            invalidErr = err;
            cb();
          });
        },
        function(cb) {
          assignment.setDue(assignmentId, '2015/09/17 21:23', cb);
        },
        function(cb) {
          connection.query("SELECT * FROM `assignments` WHERE `id` = ?",
                           [assignmentId], function(err, _assignment) {
            assignmentData = _assignment;
            cb(err);
          });
        }
      ], done);
    });

    it('should not encounter issues', function() {
      assert(assignmentData);
      assert.equal(assignmentData.length, 1);
    });

    it('should set the assignment\'s description', function() {
      assert.equal(assignmentData[0].description, 'new description');
    });

    it('should not allow an invalid description', function() {
      assert(invalidErr);
      assert.equal(invalidErr.jgCode, 1);
    });

    it('should set the assignment\'s due date', function() {
      var due = assignmentData[0].due;
      assert(due);
      assert.equal(due.getDate(), 17);
      assert.equal(due.getDay(), 4);
      assert.equal(due.getFullYear(), 2015);
      assert.equal(due.getHours(), 21);
      assert.equal(due.getMinutes(), 23);
      assert.equal(due.getSeconds(), 0);
    });
  });

  describe('Remove', function() {
    var teacherId = _.uniqueId();
    var sectionId;
    var assignmentId;
    var preAssignment;
    var postAssignment;

    before(function(done) {
      async.series([
        function(cb) {
          connection.query("INSERT INTO `sections` VALUES(NULL, ?, ?, ?)",
                           [teacherId, 'Test Class', 'abcde'],
                           function(err, result) {
            if (err) return cb(err);
            sectionId = result.insertId;
            cb();
          });
        },
        function(cb) {
          connection.query("INSERT INTO `assignments` \
                            VALUES(NULL, ?, ?, NULL, CURRENT_TIMESTAMP())",
                           [sectionId, 'Blah assignment'],
                           function(err, result) {
            if (err) return cb(err);
            assignmentId = result.insertId;
            cb();
          });
        },
        function(cb) {
          connection.query("SELECT * FROM `assignments` WHERE `id` = ?",
                           [assignmentId], function(err, assignments) {
            preAssignment = assignments;
            cb(err);
          });
        },
        function(cb) {
          assignment.remove(assignmentId, cb);
        },
        function(cb) {
          connection.query("SELECT * FROM `assignments` WHERE `id` = ?",
                           [assignmentId], function(err, assignments) {
            postAssignment = assignments;
            cb(err);
          });
        }
      ], done);
    });

    it('should remove the created assignment', function() {
      assert(preAssignment);
      assert.equal(preAssignment.length, 1);
      assert(postAssignment);
      assert.equal(postAssignment.length, 0);
    });
  });

  describe('Export', function() {
    var sectionId = _.uniqueId();
    var assignmentId;
    var studentAId;
    var studentBId;
    var output;

    before(function(done) {
      async.series([
        function(cb) {
          connection.query("INSERT INTO `assignments` VALUES(NULL, ?, ?, NULL, CURRENT_TIMESTAMP())",
                           [sectionId, 'Test Assignment'], function(err, result) {
            if (err) return cb(err);

            assignmentId = result.insertId;
            cb();
          });
        },
        function(cb) {
          bcrypt.hash('password', 10, function(err, hash) {
            connection.query("INSERT INTO `students` VALUES(NULL, ?, ?, ?, ?, NULL)",
                            ['a@student.com', hash, 'a', 'student'], function(err, result) {
              if (err) return cb(err);

              studentAId = result.insertId;
              cb();
            });
          });
        },
        function(cb) {
          bcrypt.hash('password', 10, function(err, hash) {
            connection.query("INSERT INTO `students` VALUES(NULL, ?, ?, ?, ?, NULL)",
                            ['b@student.com', hash, 'b', 'student'], function(err, result) {
              if (err) return cb(err);

              studentBId = result.insertId;
              cb();
            });
          });
        },
        function(cb) {
          connection.query("INSERT INTO `enrollment` VALUES(?,?),(?,?)", [sectionId, studentAId, sectionId, studentBId], cb);
        },
        function(cb) {
          connection.query("INSERT INTO `submissions` \
                           VALUES(NULL, ?, ?, CURRENT_TIMESTAMP() + INTERVAL 1 DAY, ?, NULL),\
                           (NULL, ?, ?, CURRENT_TIMESTAMP() - INTERVAL 1 DAY, ?, NULL)",
                           [assignmentId, studentAId, 91, assignmentId, studentBId, 87], cb);
        },
        function(cb) {
          assignment.exportOne(assignmentId, function(err, _output) {
            output = _output;
            cb(err);
          });
        }
      ], done);
    });

    it('should return the correct csv data', function() {
      assert(output);
      assert.equal(output, 'Student,Submitted,Grade,Late\na student,Yes,91,Yes\nb student,Yes,87,No\n');
    });
  });
});
