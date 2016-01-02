var async = require('async');
var _ = require('lodash');
var assert = require('assert');
var bcrypt = require('bcrypt');

var db = require('../../../controllers/db');
var section = require('../../../controllers/student/section');

describe('Section', function() {
  var teacherId;
  var sectionId;
  var studentId = _.uniqueId();

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

          db.query("INSERT INTO `teachers` VALUES(NULL, ?, ?, ?, ?, NULL)", ['a@b.com', hash, 'Hillary', 'Clinton'], function(err, result) {
            if (err) return cb(err);

            teacherId = result.insertId;
            cb();
          });
        });
      },
      function(cb) {
        db.query("INSERT INTO `sections` VALUES(NULL, ?, ?, ?)", [teacherId, 'Test class', 'yoyoy'], function(err, result) {
          if (err) return cb(err);

          sectionId = result.insertId;
          cb();
        });
      },
      function(cb) {
        db.query("INSERT INTO `enrollment` VALUES(?, ?)", [sectionId, studentId], cb);
      },
      function(cb) {
        db.query("INSERT INTO `assignments` VALUES(NULL, ?, ?, NULL, CURRENT_TIMESTAMP())", [sectionId, 'Test Assignment'], cb);
      }
    ], done);
  });

  describe('List', function() {
    var sections;

    before(function(done) {
      section.list(studentId, function(err, _sections) {
        sections = _sections;
        done(err);
      });
    });

    it('should list the student\'s sections', function() {
      assert(sections);
      assert.equal(sections.length, 1);
      assert.equal(sections[0].name, 'Test class');
    });
  });

  describe('Verify', function() {
    var secction;

    before(function(done) {
      section.verify(sectionId, studentId, function(err, _section) {
        secction = _section;
        done(err);
      });
    });

    it('should retrieve the student\'s section', function() {
      assert(secction);
      assert.equal(secction.name, 'Test class');
    });
  });

  describe('Get', function() {
    var assignments;

    before(function(done) {
      section.get(sectionId, studentId, function(err, _assignments) {
        assignments = _assignments;
        done(err);
      });
    });

    it('should retrieve the section\'s assignments', function() {
      assert(assignments);
      assert.equal(assignments.length, 1);
      assert.equal(assignments[0].name, 'Test Assignment');
    });
  });

  describe('Enroll and Drop', function() {
    var studentId2 = _.uniqueId();
    var sectionId2;
    var enrolled;
    var enrolledDropped;
    var noCodeErr;
    var invalidCodeErr;
    var dupErr;

    before(function(done) {
      async.series([
        function(cb) {
          section.enroll(studentId2, '', function(err) {
            noCodeErr = err;
            cb();
          });
        },
        function(cb) {
          section.enroll(studentId2, 'lolol', function(err) {
            invalidCodeErr = err;
            cb();
          });
        },
        function(cb) {
          section.enroll(studentId2, 'yoyoy', function(err, _sectionId2) {
            sectionId2 = _sectionId2;
            cb(err);
          });
        },
        function(cb) {
          section.enroll(studentId2, 'yoyoy', function(err) {
            dupErr = err;
            cb();
          });
        },
        function(cb) {
          db.query("SELECT * FROM `enrollment` WHERE `section_id` = ? and `student_id` = ?", [sectionId2, studentId2], function(err, _enrolled) {
            enrolled = _enrolled;
            cb(err);
          });
        },
        function(cb) {
          section.drop(sectionId2, studentId2, cb);
        },
        function(cb) {
          db.query("SELECT * FROM `enrollment` WHERE `section_id` = ? and `student_id` = ?", [sectionId2, studentId2], function(err, _enrolled) {
            enrolledDropped = _enrolled;
            cb(err);
          });
        }
      ], done);
    });

    it('should enroll the student in the correct section', function() {
      assert.equal(sectionId2, sectionId);
    });

    it('should not allow missing section codes', function() {
      assert(noCodeErr);
      assert.equal(noCodeErr.jgCode, 9);
    });

    it('should not allow invalid section codes', function() {
      assert(invalidCodeErr);
      assert.equal(invalidCodeErr.jgCode, 10);
    });

    it('should enroll the student', function() {
      assert(enrolled);
      assert.equal(enrolled.length, 1);
      assert.equal(enrolled[0].section_id, sectionId2);
      assert.equal(enrolled[0].student_id, studentId2);
    });

    it('should not allow duplicate enrollments', function() {
      assert(dupErr);
      assert.equal(dupErr.jgCode, 11);
    });

    it('should then drop the student', function() {
      assert(enrolledDropped);
      assert.equal(enrolledDropped.length, 0);
    });
  });
});
