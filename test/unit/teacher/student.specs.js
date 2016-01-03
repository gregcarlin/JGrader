var async = require('async');
var assert = require('assert');
var bcrypt = require('bcrypt');

var email = require('../../../util/email');
var db = require('../../../controllers/db');
var student = require('../../../controllers/teacher/student');

describe('Student', function() {
  before(function(done) {
    async.parallel([
      function(cb) {
        db.query("TRUNCATE `sections`", cb);
      },
      function(cb) {
        db.query("TRUNCATE `teachers`", cb);
      }
    ], done);
  });

  describe('Invite', function() {
    var teacherId;
    var sectionId;

    before(function(done) {
      async.series([
        function(cb) {
          bcrypt.hash('password', 10, function(err, hash) {
            if (err) return cb(err);

            db.query("INSERT INTO `teachers` VALUES(NULL, ?, ?, ?, ?, NULL)", ['hi@test.com', hash, 'Hi', 'Test'], function(err, result) {
              if (err) return cb(err);

              teacherId = result.insertId;
              cb();
            });
          });
        },
        function(cb) {
          db.query("INSERT INTO `sections` VALUES(NULL, ?, ?, ?)", [teacherId, 'Test', 'uniq3'], function(err, result) {
            sectionId = result.insertId;
            cb(err);
          });
        },
        function(cb) {
          student.invite([sectionId], teacherId, 'test@test.test', cb);
        }
      ], done);
    });

    it('should send out invitations', function() {
      assert(sectionId >= 0);
      assert.equal(email.sent.length, 2);
      assert.equal(email.sent[1].to, 'test@test.test');
    });
  });
});
