var async = require('async');
var assert = require('assert');

require('../../../routes/common');
var submission = require('../../../controllers/teacher/submission');

describe('Submission', function() {
  before(function(done) {
    async.series([
      function(cb) {
        connection.query('TRUNCATE `submissions`', cb);
      }
    ], done);
  });

  describe('Set grade', function() {
    var submissionId;
    var withGrade;
    var withoutGrade;

    before(function(done) {
      async.series([
        function(cb) {
          connection.query('INSERT INTO `submissions` VALUES(NULL, ?, ?, CURRENT_TIMESTAMP(), NULL, NULL)', [1, 1], function(err, result) {
            if (err) return cb(err);

            submissionId = result.insertId;
            cb();
          });
        },
        function(cb) {
          submission.setGrade(submissionId, 66, cb);
        },
        function(cb) {
          connection.query('SELECT * FROM `submissions` WHERE `id` = ?', [submissionId], function(err, result) {
            withGrade = result;
            cb(err);
          });
        },
        function(cb) {
          submission.removeGrade(submissionId, cb);
        },
        function(cb) {
          connection.query('SELECT * FROM `submissions` WHERE `id` = ?', [submissionId], function(err, result) {
            withoutGrade = result;
            cb(err);
          });
        }
      ], done);
    });

    it('should have the submission', function() {
      assert(submissionId >= 0);
    });

    it('should set to something', function() {
      assert.equal(withGrade.length, 1);
      assert.equal(withGrade[0].grade, 66);
    });

    it('should set to nothing', function() {
      assert.equal(withoutGrade.length, 1);
      assert.equal(withoutGrade[0].grade, null);
    });
  });
});
