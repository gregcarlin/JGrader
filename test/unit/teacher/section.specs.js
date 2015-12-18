var async = require('async');
var _ = require('lodash');
var assert = require('assert');

require('../../../routes/common');
var section = require('../../../controllers/teacher/section');

describe('Section', function() {
  before(function(done) {
    async.parallel([
      function(cb) {
        connection.query("TRUNCATE `sections`", cb);
      }
    ], done);
  });

  describe('Create', function() {
    var teacherId = _.uniqueId();
    var sections;

    before(function(done) {
      async.series([
        function(cb) {
          section.create(teacherId, 'Test Section', cb);
        },
        function(cb) {
          connection.query("SELECT * FROM `sections`", function(err, result) {
            sections = result;
            cb(err);
          });
        }
      ], done);
    });

    it('should create a section', function() {
      assert.equal(sections.length, 1);
      assert.equal(sections[0].name, 'Test Section');
    });
  });

  describe('Set name', function() {
    var sectionId;
    var sections;

    before(function(done) {
      async.series([
        function(cb) {
          connection.query("INSERT INTO `sections` VALUES(NULL, ?, ?, ?)",
                           [_.uniqueId(), 'Test Class', 'uniq1'],
                           function(err, result) {
            sectionId = result.insertId;
            cb(err);
          });
        },
        function(cb) {
          section.setName(sectionId, 'New Name', cb);
        },
        function(cb) {
          connection.query("SELECT * FROM `sections` WHERE `id` = ?",
                           [sectionId], function(err, results) {
            sections = results;
            cb(err);
          });
        }
      ], done);
    });

    it('should set the name of the section', function() {
      assert(sectionId >= 0);
      assert(sections.length >= 1);
      assert.equal(sections[0].name, 'New Name');
    });
  });

  describe('Remove', function() {
    var sectionId;
    var sections;

    before(function(done) {
      async.series([
        function(cb) {
          connection.query("INSERT INTO `sections` VALUES(NULL, ?, ?, ?)",
                           [_.uniqueId(), 'Test Class', 'uniq2'],
                           function(err, result) {
            sectionId = result.insertId;
            cb(err);
          });
        },
        function(cb) {
          section.remove(sectionId, cb);
        },
        function(cb) {
          connection.query("SELECT * FROM `sections` WHERE `id` = ?", [sectionId], function(err, results) {
            sections = results;
            cb(err);
          });
        }
      ], done);
    });

    it('should remove the section', function() {
      assert(sectionId >= 0);
      assert.equal(sections.length, 0);
    });
  });
});
