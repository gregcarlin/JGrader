var async = require('async');
var _ = require('lodash');
var assert = require('assert');
var bcrypt = require('bcrypt');

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
});
