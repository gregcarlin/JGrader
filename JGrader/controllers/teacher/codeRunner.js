var _ = require('lodash');
var async = require('async');
var exec = require('child_process').exec; // for running bash commands
var fs = require('fs-extra');

module.exports.setupDirectory = function(files, callback) {
  var grouped = _.groupBy(files, 'student_id');
  async.map(_.keys(grouped), function(studentId, studentCb) {
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
  }, callback);
};

module.exports.execute = function(uniqueId, toExecute, input, callback) {
  var command = 'java -Djava.security.manager -Djava.security.policy==security.policy ' + toExecute;
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

module.exports.cleanup = function(uniqueId, callback) {
  fs.remove('temp/' + uniqueId + '/', callback);
};
