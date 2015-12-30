// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

require('../../routes/common');

var _ = require('lodash');
var fs = require('fs-extra');

var codeRunner = require('../../controllers/codeRunner');
var jgError = require('../../util/errorCode').jgError;

module.exports.list = function(studentId, callback) {
  connection.query("SELECT `sections`.`name`,\
                           `teachers`.`fname`,\
                           `teachers`.`lname`,\
                           `assignments`.`name` AS `assignmentName`,\
                           `assignments`.`due`,\
                           `assignments`.`id`,\
                           `submissions`.`submitted` \
                    FROM `sections`, `teachers`,`enrollment`,`assignments` \
                    LEFT JOIN `submissions` \
                      ON `submissions`.`assignment_id` = `assignments`.`id` \
                      AND `submissions`.`student_id` = ? \
                    WHERE `enrollment`.`student_id` = ? \
                    AND `enrollment`.`section_id` = `assignments`.`section_id` \
                    AND `sections`.`id` = `enrollment`.`section_id` \
                    AND `sections`.`teacher_id`=`teachers`.`id`",
                    [studentId, studentId], callback);
};

module.exports.verify = function(assignmentId, studentId, callback) {
  connection.query({
      sql: "SELECT `assignments`.*,`sections`.* \
            FROM `assignments` \
            JOIN `sections` ON `assignments`.`section_id` = `sections`.`id` \
            JOIN `enrollment` ON `sections`.`id` = `enrollment`.`section_id` \
            WHERE `assignments`.`id` = ? AND `enrollment`.`student_id` = ?",
      nestTables: true,
      values: [assignmentId, studentId]
    }, function(err, result) {
      if (err) return callback(err);
      if (result.length <= 0) return callback(null, null, null);

      callback(null, result[0].assignments, result[0].sections);
  });
};

module.exports.get = function(assignmentId, studentId, callback) {
  connection.query("SELECT `name`,`contents`,`mime` FROM `files-teachers` \
                    WHERE `assignment_id` = ?",
                    [assignmentId], function(err, teacherFiles) {
    if (err) return callback(err);

    connection.query("SELECT `files`.`name`,\
                             `files`.`contents`,\
                             `files`.`mime`,\
                             `submissions`.`grade`,\
                             `submissions`.`submitted`,\
                             `files`.`compiled`,\
                             `submissions`.`main` \
                      FROM `files`, `assignments`, `submissions` \
                      WHERE `submissions`.`assignment_id` = `assignments`.`id` \
                        AND `submissions`.`student_id` = ? \
                        AND `files`.`submission_id`= `submissions`.`id` \
                        AND `assignments`.`id` = ? \
                      ORDER BY `files`.`id`",
                      [studentId, assignmentId], function(err, fileData) {
      if (err) return callback(err);

      var anyCompiled = false;
      var anyMain = false;
      for (var i = 0; i < fileData.length; i++) {
        fileData[i].display =
          isAscii(fileData[i].mime) ?
            fileData[i].contents :
            'This is a binary file. Download it to view it.';
        if (fileData[i].compiled) anyCompiled = true;

        fileData[i].isMain = fileData[i].main == fileData[i].name;
        if (fileData[i].isMain) anyMain = true;

        var lastDot = fileData[i].name.lastIndexOf('.') + 1;
        if (lastDot >= fileData[i].name.length) lastDot = 0;
        fileData[i].extension = fileData[i].name.substring(lastDot);
        var imageExtensions = ['png', 'jpg', 'jpeg', 'gif'];
        if (imageExtensions.indexOf(fileData[i].extension) >= 0) {
          fileData[i].text = false;
          fileData[i].display = '<img src="data:image/' +
                                fileData[i].extension + ';base64,';
          fileData[i].display += new Buffer(fileData[i].contents)
                                  .toString('base64');
          fileData[i].display += '" alt="' + fileData[i].name + '">';
        } else {
          fileData[i].text = true;
        }
      }

      // Sends file data
      var teacherNames = [];
      for (var i = 0; i < teacherFiles.length; i++) {
        teacherNames.push(teacherFiles[i].name);
      }

      callback(null, {
        fileData: fileData,
        anyCompiled: anyCompiled,
        anyMain: anyMain,
        teacherFiles: teacherNames
      });
    });
  });
};

// helper for submit
var findMain = function(err, files, callback) {
  if (err) { // compilation error, treat all files as non-java files
    _.each(files, function(file) {
      file.isJava = false;
    });
    callback(null, null);
  } else if (files.length == 1) { // only 1 file was submitted, so we mark it as containing the main
    callback(null, files[0].name);
  } else { // we must search for the main
    async.map(files, function(file, cb) {
      if (!file.isJava) return cb();

      fs.readFile(file.path, function(err, data) {
        if (err) return cb(err);

        data = data.toString();
        if (data.indexOf('main') >= 0) {
          cb(null, file.name);
        } else {
          cb();
        }
      });
    }, function(err, results) {
      if (err) return callback(err);

      var main = null;
      for (var i = 0; i < results.length; i++) {
        if (results[i]) {
          if (main) { // multiple mains found
            main = null;
            break;
          } else {
            main = results[i];
          }
        }
      }
      callback(null, main);
    });
  }
};

// Submits the file into the mysql database
module.exports.submit = function(assignmentId, studentId, _files, callback) {

  // normalize file uploads into this files array
  var files = [];
  for (var key in _files) {
    for (var i = 0; i < _files[key].length; i++) {
      files.push(_files[key][i]);
    }
  }

  if (_.isEmpty(files)) return callback(jgError(4)); // no files submitted

  // first, check all the file names for legality
  for (var i = 0; i < files.length; i++) {
    // if the name contains anything besides alphanumerical characters and periods or is too short (less than 6 chars)
    if (!/^[a-zA-Z0-9.]+$/.test(files[i].name) || files[i].name.length < 6) {
      return callback(jgError(5)); // invalid name
    }
    for (var j = 0; j < files.length; j++) {
      if (i == j) continue;
      if (files[i].name == files[j].name) {
        return callback(jgError(8)); // duplicate names
      }
    }
  }

  // get attached teacher files
  connection.query("SELECT `name`,`contents`,`mime` FROM `files-teachers` \
                    WHERE `assignment_id` = ?",
                    [assignmentId], function(err, teacherFiles) {
    if (err) return callback(err);

    // now, check to see if this student already submitted this assignment
    connection.query("SELECT `id` FROM `submissions` \
                      WHERE `student_id` = ? AND `assignment_id` = ?",
                      [studentId, assignmentId], function(err, submissions) {
      if (err) return callback(err);
      if (submissions.length > 0) return callback(jgError(6));

      var toCompile = '';
      _.each(files, function(file) {
        file.isJava = file.path.substr(file.path.length - 4)
                      .toLowerCase() === 'java';
        if (file.isJava) toCompile += file.path + ' ';
      });

      async.each(teacherFiles, function(teacherFile, cb) {
        teacherFile.path = './temp/' + studentId + '/' + teacherFile.name;
        teacherFile.isJava = teacherFile.name
                             .substr(teacherFile.name.length - 4)
                             .toLowerCase() == 'java';
        if (teacherFile.isJava) toCompile += teacherFile.path + " ";
        teacherFile.mimetype = teacherFile.mime;
        files.push(teacherFile);
        fs.writeFile(teacherFile.path, teacherFile.contents, cb);
      }, function(err) {
        if (err) return callback(err);

        if (!toCompile) return callback(jgError(7)); // must have at least one java file

        // compile the java files
        codeRunner.compile(toCompile, function(err, stdout, stderr) {
          findMain(err, files, function(err, main) {
            if (err) return callback(err);

            // finally, make necessary changes in database
            connection.query("INSERT INTO `submissions` \
                              VALUES(NULL, ?, ?, NOW(), NULL, ?)",
                              [assignmentId, studentId, main],
                              function(err, result) {
              if (err) return callback(err);

              var args = [];
              var stmt = '';
              async.map(files, function(file, cb) {
                fs.readFile(file.path, cb);
              }, function(err, javaResults) {
                if (err) return callback(err);

                async.map(files, function(file, cb) {
                  if (file.isJava) {
                    var path = file.path.substr(0, file.path.length - 4) +
                               'class';
                    fs.readFile(path, cb);
                  } else {
                    cb(null, null);
                  }
                }, function(err, classResults) {
                  if (err) return callback(err);

                  for (var i = 0; i < files.length; i++) {
                    stmt += "(NULL,?,?,?,?,?),";
                    args.push(result.insertId);
                    args.push(files[i].name);
                    args.push(javaResults[i]);
                    args.push(classResults[i]);
                    args.push(files[i].mimetype);
                  }
                  stmt = stmt.substr(0, stmt.length - 1); // remove last character from stmt (extraneous comma)

                  connection.query("INSERT INTO `files` \
                                    VALUES" + stmt, args,
                                    function(err, fileResult) {
                    if (err) return callback(err);

                    if (!main) {
                      return codeRunner.cleanup(studentId, callback);
                    }
                    main = main.substring(0, main.length - 5);

                    connection.query("SELECT `id`,`input`,`output` \
                                      FROM `test-cases` \
                                      WHERE `assignment_id` = ?",
                                      [assignmentId], function(err, tests) {
                      if (err) return callback(err);

                      codeRunner.runTests(studentId,
                                          main,
                                          result.insertId,
                                          tests,
                                          function(err) {
                        if (err) return callback(err);

                        codeRunner.cleanup(studentId, callback);
                      });
                    });
                  });
                });
              });

            });

          });
        });

      });

    });

  });

};

module.exports.chooseMain = function(assignmentId, studentId, fileName, callback) {
  connection.query("UPDATE `submissions` SET `main` = ? \
                    WHERE `assignment_id` = ? AND `student_id` = ?",
                    [fileName, assignmentId, studentId],
                    function(err, result) {
    if (err) {
      return callback(err);
    }

    connection.query("SELECT `id` FROM `submissions` \
                      WHERE `assignment_id` = ? AND `student_id` = ?",
                      [assignmentId, studentId], function(err, result) {
      if (err) return callback(err);

      connection.query("SELECT \
                          `files`.`id`,\
                          `files`.`name`,\
                          `files`.`contents`,\
                          `files`.`compiled`,\
                          `submissions`.`student_id` \
                        FROM `files`,`submissions` \
                        WHERE `files`.`submission_id` = `submissions`.`id` \
                        AND `submissions`.`id` = ?",
                        [result[0].id], function(err, files) {
        if (err) return callback(err);

        codeRunner.setupDirectory(files, function(err, uniqueIds) {
          if (err) return callback(err);

          var uniqueId = uniqueIds[files[0].student_id];
          var main = fileName.substring(0, fileName.length - 5);

          connection.query("SELECT `id`,`input`,`output` FROM `test-cases` \
                            WHERE `assignment_id` = ?",
                            [assignmentId], function(err, tests) {
            if (err) return callback(err);

            codeRunner.runTests(uniqueId, main, result[0].id,
                                tests, function(err) {
              if (err) return callback(err);

              codeRunner.cleanup(uniqueId, callback);
            });
          });
        });
      });
    });
  });
};
