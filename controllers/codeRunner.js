var _ = require('lodash');
var async = require('async');
var exec = require('child_process').exec; // for running bash commands
var fs = require('fs-extra');

var db = require('./db');

var setupDirectory = module.exports.setupDirectory = function(files, callback) {
  var grouped = _.groupBy(files, 'student_id');
  var studentIds = _.keys(grouped);
  async.map(studentIds, function(studentId, studentCb) {
    var studentFiles = grouped[studentId];
    var uniqueId = _.uniqueId();
    var folder = 'temp/' + uniqueId + '/';
    fs.ensureDir(folder, function(err) {
      if (err) return studentCb(err);

      async.each(studentFiles, function(file, fileCb) {
        if (file.compiled) {
          file.className = file.name.substring(0, file.name.length - 5);
          file.writeName = file.className + '.class';
          file.writeData = file.compiled;
        } else {
          file.writeName = file.name;
          file.writeData = file.contents;
        }
        // note: working directory seems to be one with app.js in it
        fs.writeFile(folder + file.writeName, file.writeData, fileCb);
      }, function(err) {
        studentCb(err, uniqueId);
      });
    });
  }, function(err, results) {
    if (err) return callback(err);

    var rt = {};
    _.each(results, function(uniqueId, index) {
      rt[studentIds[index]] = uniqueId;
    });
    callback(null, rt);
  });
};

module.exports.compile = function(toCompile, callback) {
  exec('javac ' + toCompile, callback);
};

var execute =
    module.exports.execute =
    function(uniqueId, toExecute, input, callback) {
  var command = 'java -Djava.security.manager ' +
                '-Djava.security.policy==security.policy ' + toExecute;
  var options = {
    timeout: 10000, // 10 seconds
    cwd: 'temp/' + uniqueId + '/'
  };

  var child = exec(command, options, function(err, stdout, stderr) {
    if (err && stderr) err = null; // suppress error if stderr is set (indicates user error)

    var overTime = false;
    if (err) {
      if (err.killed) {
        overTime = true;
        err = null;
      } else {
        child.kill();
      }
    }
    callback(err, stdout, stderr, overTime);
  });

  if (input) child.stdin.write(input);
  child.stdin.end(); // forces java process to end at end of stdin (otherwise it would just wait if more input was needed)
};

var cleanup = module.exports.cleanup = function(uniqueId, callback) {
  fs.remove('temp/' + uniqueId + '/', callback);
};

var runTests =
    module.exports.runTests =
    function(uniqueId, main, submissionId, tests, callback) {
  db.query("DELETE FROM `test-case-results` WHERE `submission_id` = ?",
            [submissionId], function(err) {
    if (err) return callback(err);

    async.eachSeries(tests, function(test, testCb) {
      execute(uniqueId, main, test.input,
              function(err, stdout, stderr, overTime) {
        if (err) return testCb(err);

        var match = stdout === test.output;
        if (!match && stdout.length &&
            stdout.charAt(stdout.length - 1) === '\n') {
          stdout = stdout.substring(0, stdout.length - 1);
          match = stdout === test.output;
        }
        db.query("INSERT INTO `test-case-results` \
                  VALUES(NULL, ?, ?, ?, ?)",
                  [submissionId, test.id, stdout, match], testCb);
      });
    }, callback);
  });
};

module.exports.runTestsForAssignment = function(assignmentId, callback) {
  db.query("SELECT \
              `files`.`name`,\
              `files`.`contents`,\
              `files`.`compiled`,\
              `files`.`mime`,\
              `submissions`.`student_id`,\
              `submissions`.`main`,\
              `submissions`.`id` AS `subId` \
            FROM `submissions`,`files` \
            WHERE `submissions`.`id` = `files`.`submission_id` \
            AND `submissions`.`assignment_id` = ?",
            [assignmentId], function(err, files) {
    if (err) return callback(err);

    db.query("SELECT `id`,`input`,`output` FROM `test-cases` \
              WHERE `assignment_id` = ?",
              [assignmentId], function(err, tests) {
      if (err) return callback(err);

      setupDirectory(files, function(err, uniqueIds) {
        if (err) return callback(err);

        var grouped = _.groupBy(files, 'student_id');
        async.forEachOf(uniqueIds, function(uniqueId, studentId, cb) {
          var main = grouped[studentId][0].main;
          if (!main) {
            return cleanup(uniqueId, cb);
          }
          main = main.substring(0, main.length - 5);
          var submissionId = grouped[studentId][0].subId;

          runTests(uniqueId, main, submissionId, tests, function(err) {
            if (err) return cb(err);

            cleanup(uniqueId, cb);
          });
        }, callback);
      });
    });
  });
};
