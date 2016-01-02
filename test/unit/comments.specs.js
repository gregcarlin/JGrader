var async = require('async');
var assert = require('assert');
var _ = require('lodash');
var bcrypt = require('bcrypt');

var db = require('../../controllers/db');
var comments = require('../../controllers/comments');

describe('Comments', function() {
  var sectionId;
  var assignmentId;
  var submissionId;
  var teacherId;
  var studentId;
  var commentAId;
  var commentBId;

  before(function(done) {
    async.series([
      function(cb) {
        db.query("TRUNCATE `teachers`", cb);
      },
      function(cb) {
        db.query("TRUNCATE `students`", cb);
      },
      function(cb) {
        db.query("TRUNCATE `sections`", cb);
      },
      function(cb) {
        db.query("TRUNCATE `assignments`", cb);
      },
      function(cb) {
        db.query("TRUNCATE `submissions`", cb);
      },
      function(cb) {
        db.query("TRUNCATE `comments`", cb);
      },
      function(cb) {
        bcrypt.hash('password', 10, function(err, hash) {
          if (err) return cb(err);

          db.query("INSERT INTO `teachers` VALUES(NULL, ?, ?, ?, ?, NULL)", ['hi@ih.com', hash, 'Tommy', 'Wiseau'], function(err, result) {
            if (err) return cb(err);

            teacherId = result.insertId;
            cb();
          });
        });
      },
      function(cb) {
        bcrypt.hash('password', 10, function(err, hash) {
          if (err) return cb(err);

          db.query("INSERT INTO `students` VALUES(NULL, ?, ?, ?, ?, NULL)", ['ih@hi.com', hash, 'Greg', 'Sestero'], function(err, result) {
            if (err) return cb(err);

            studentId = result.insertId;
            cb();
          });
        });
      },
      function(cb) {
        db.query("INSERT INTO `sections` VALUES(NULL, ?, ?, ?)", [teacherId, 'section', 'koder'], function(err, result) {
          if (err) return cb(err);

          sectionId = result.insertId;
          cb();
        });
      },
      function(cb) {
        db.query("INSERT INTO `assignments` VALUES(NULL, ?, ?, NULL, NOW())", [sectionId, 'assignment'], function(err, result) {
          if (err) return cb(err);

          assignmentId = result.insertId;
          cb();
        });
      },
      function(cb) {
        db.query("INSERT INTO `submissions` VALUES(NULL, ?, ?, NOW(), NULL, NULL)",
                  [assignmentId, studentId], function(err, result) {
          if (err) return cb(err);

          submissionId = result.insertId;
          cb();
        });
      },
      function(cb) {
        db.query("INSERT INTO `comments` VALUES(NULL, ?, ?, ?, ?, ?, NOW(), ?)",
                  [submissionId, 2, 11, 'teacher', teacherId, 'test comment'],
                  function(err, result) {
          if (err) return cb(err);

          commentAId = result.insertId;
          cb();
        });
      },
      function(cb) {
        db.query("INSERT INTO `comments` VALUES(NULL, ?, ?, ?, ?, ?, NOW(), ?)",
                  [submissionId, 0, 8, 'student', studentId, 'test another comment'],
                  function(err, result) {
          if (err) return cb(err);

          commentBId = result.insertId;
          cb();
        });
      }
    ], done);
  });

  describe('List', function() {
    var commentsTeacher;
    var commentsStudent;

    before(function(done) {
      async.parallel([
        function(cb) {
          comments.list(teacherId, submissionId, 'teacher', function(err, _commentsTeacher) {
            commentsTeacher = _commentsTeacher;
            cb(err);
          });
        },
        function(cb) {
          comments.list(studentId, submissionId, 'student', function(err, _commentsStudent) {
            commentsStudent = _commentsStudent;
            cb(err);
          });
        }
      ], done);
    });

    it('should list comments for the teacher', function() {
      assert(commentsTeacher);
      assert.equal(commentsTeacher.length, 2);

      assert.equal(commentsTeacher[0].id, commentAId);
      assert.equal(commentsTeacher[0].tab, 2);
      assert.equal(commentsTeacher[0].line, 11);
      assert.equal(commentsTeacher[0].message, 'test comment');
      assert.equal(commentsTeacher[0].name, 'Tommy Wiseau');
      assert(commentsTeacher[0].owns);

      assert.equal(commentsTeacher[1].id, commentBId);
      assert.equal(commentsTeacher[1].tab, 0);
      assert.equal(commentsTeacher[1].line, 8);
      assert.equal(commentsTeacher[1].message, 'test another comment');
      assert.equal(commentsTeacher[1].name, 'Greg Sestero');
      assert(!commentsTeacher[1].owns);
    });

    it('should list comments for the student', function() {
      assert(commentsStudent);
      assert.equal(commentsStudent.length, 2);

      assert.equal(commentsStudent[0].id, commentAId);
      assert.equal(commentsStudent[0].tab, 2);
      assert.equal(commentsStudent[0].line, 11);
      assert.equal(commentsStudent[0].message, 'test comment');
      assert.equal(commentsTeacher[0].name, 'Tommy Wiseau');
      assert(!commentsStudent[0].owns);

      assert.equal(commentsStudent[1].id, commentBId);
      assert.equal(commentsStudent[1].tab, 0);
      assert.equal(commentsStudent[1].line, 8);
      assert.equal(commentsStudent[1].message, 'test another comment');
      assert.equal(commentsTeacher[1].name, 'Greg Sestero');
      assert(commentsStudent[1].owns);
    });
  });

  describe('Post', function() {
    var commentId;
    var name;
    var results;

    before(function(done) {
      async.series([
        function(cb) {
          comments.post(5, 104, 'this is a comment', studentId, submissionId, 'student', function(err, _commentId, _name) {
            commentId = _commentId;
            name = _name;
            cb(err);
          });
        },
        function(cb) {
          db.query("SELECT * FROM `comments` WHERE `id` = ?", [commentId], function(err, _results) {
            results = _results;
            cb(err);
          });
        }
      ], done);
    });

    it('should return the correct data', function() {
      assert(commentId);
      assert.equal(name, 'Greg Sestero');
    });

    it('should post the comment', function() {
      assert(results);
      assert.equal(results.length, 1);
      assert.equal(results[0].submission_id, submissionId);
      assert.equal(results[0].tab, 5);
      assert.equal(results[0].line, 104);
      assert.equal(results[0].commenter_type, 'student');
      assert.equal(results[0].commenter_id, studentId);
      assert.equal(results[0].message, 'this is a comment');
    });
  });

  describe('Remove', function() {
    var results;

    before(function(done) {
      async.series([
        function(cb) {
          comments.remove(teacherId, commentAId, 'teacher', cb);
        },
        function(cb) {
          db.query("SELECT * FROM `comments` WHERE `id` = ?", [commentAId], function(err, _results) {
            results = _results;
            cb(err);
          });
        }
      ], done);
    });

    it('should remove the comment', function() {
      assert(results);
      assert.equal(results.length, 0);
    });
  });

  describe('Edit', function() {
    var results;

    before(function(done) {
      async.series([
        function(cb) {
          comments.edit('new text', studentId, commentBId, 'student', cb);
        },
        function(cb) {
          db.query("SELECT * FROM `comments` WHERE `id` = ?", [commentBId], function(err, _results) {
            results = _results;
            cb(err);
          });
        }
      ], done);
    });

    it('should edit the comment', function() {
      assert(results);
      assert.equal(results.length, 1);
      assert.equal(results[0].submission_id, submissionId);
      assert.equal(results[0].tab, 0);
      assert.equal(results[0].line, 8);
      assert.equal(results[0].commenter_type, 'student');
      assert.equal(results[0].commenter_id, studentId);
      assert.equal(results[0].message, 'new text');
    });
  });
});
