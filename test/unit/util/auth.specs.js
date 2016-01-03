var async = require('async');
var assert = require('assert');

var db = require('../../../controllers/db');
var auth = require('../../../util/auth');

describe('Auth', function() {
  describe('Log in', function() {
    var id;
    var noId;

    before(function(done) {
      async.series([
        function(cb) {
          db.query("TRUNCATE `sessions-teachers`", cb);
        },
        function(cb) {
          db.query("INSERT INTO `sessions-teachers` VALUES(?, ?)", [24, 'hellothere'], cb);
        },
        function(cb) {
          auth.logIn('hellothere', 'teachers', function(_id) {
            id = _id;
            cb();
          });
        },
        function(cb) {
          auth.logIn('hellothere', 'students', function(_noId) {
            noId = _noId;
            cb();
          });
        }
      ], done);
    });

    it('should return a teacher id', function() {
      assert(id);
      assert.equal(id, 24);
    });

    it('should not return a student id', function() {
      assert(!noId);
    });
  });

  describe('Sign in', function() {
    var hash;
    var sessions;

    before(function(done) {
      async.series([
        function(cb) {
          auth.signIn('students', 88, {
            cookie: function(str, _hash) {
              if (str === 'hash') hash = _hash;
            }
          }, cb);
        },
        function(cb) {
          db.query("SELECT * FROM `sessions-students` WHERE `hash` = ?", [hash], function(err, _sessions) {
            sessions = _sessions;
            cb(err);
          });
        }
      ], done);
    });

    it('should set the hash in a cookie', function() {
      assert(hash);
      assert.equal(hash.length, 40);
    });

    it('should put the hash in the database', function() {
      assert(sessions);
      assert.equal(sessions.length, 1);
      assert.equal(sessions[0].id, 88);
      assert.equal(sessions[0].hash, hash);
    });
  });
});
