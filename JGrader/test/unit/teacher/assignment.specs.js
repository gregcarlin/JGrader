var async = require('async');
var _ = require('lodash');
var assert = require('assert');

require('../../../routes/common');
var assignment = require('../../../controllers/teacher/assignment');

describe('Assignment', function() {
  describe('Create', function() {
    var teacherId = _.uniqueId();
    var sectionId;
    var assignments;

    before(function(done) {
      async.series([
        function(cb) {
          connection.query("TRUNCATE `sections`", cb);
        },
        function(cb) {
          connection.query("TRUNCATE `assignments`", cb);
        },
        function(cb) {
          connection.query("INSERT INTO `sections` VALUES(NULL, ?, ?, ?)", [teacherId, 'Test Class', '12345'], function(err, result) {
            if (err) return cb(err);
            sectionId = result.insertId;
            cb();
          });
        },
        function(cb) {
          assignment.create(teacherId, sectionId, 'Test Assignment', '', '2015/09/17 21:23', [], cb);
        },
        function(cb) {
          connection.query("SELECT * FROM `assignments` WHERE `section_id` = ?", [sectionId], function(err, _assignments) {
            assignments = _assignments;
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
  });
});
