// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

require('../common');
var router = express.Router();
var multer = require('multer');
var strftime = require('strftime');
var _ = require('lodash');
var comments = require('../comments');
var async = require('async');

var render = function(page, options, res) {
  options.page = 1;
  switch(page) {
    case 'notFound':
      options.title = 'Assignment Not Found';
      options.type = 'assignment';
      page = '../' + page;
      break;
    case 'assignmentList':
      options.title = 'Your Assignments';
      options.js = ['tooltip'];
      options.css = ['font-awesome.min'];
      options.strftime = strftime;
      break;
    case 'assignment':
      // title should already be set
      options.js = ['dropzone', 'student/submit', 'tooltip'];
      options.css = ['font-awesome.min'];
      options.strftime = strftime;
      break;
    case 'assignmentComplete':
      // title should already be set
      options.js = ['prettify', 'student/submitted', 'comments', 'tooltip'];
      options.css = ['prettify', 'font-awesome.min'];
      options.strftime = strftime;
      break;
  }
  renderGenericStudent(page, options, res);
}

// The page that lists the assignments
router.get('/', function(req, res, next) {
  connection.query("SELECT `sections`.`name`,`teachers`.`fname`,`teachers`.`lname`,`assignments`.`name` AS `assignmentName`,`assignments`.`due`,`assignments`.`id`,`submissions`.`submitted` \
                    FROM `sections`, `teachers`,`enrollment`,`assignments` \
                    LEFT JOIN `submissions` ON `submissions`.`assignment_id` = `assignments`.`id` AND `submissions`.`student_id` = ? \
                    WHERE `enrollment`.`student_id` = ? \
                    AND `enrollment`.`section_id` = `assignments`.`section_id` \
                    AND `sections`.`id` = `enrollment`.`section_id` \
                    AND `sections`.`teacher_id`=`teachers`.`id`", [req.user.id, req.user.id], function(err, rows) {
    if(err) {
      render('assignmentList', {rows: [], error: 'An unexpected error has occurred.'}, res);
      err.handled = true;
      next(err);
    } else {
      render('assignmentList', {rows: rows}, res);
    }
  });
});

router.use('/:id', function(req, res, next) {
  connection.query({
      sql: "SELECT `assignments`.*,`sections`.* FROM `assignments` JOIN `sections` ON `assignments`.`section_id` = `sections`.`id` JOIN `enrollment` ON `sections`.`id` = `enrollment`.`section_id` WHERE `assignments`.`id` = ? AND `enrollment`.`student_id` = ?",
      nestTables: true,
      values: [req.params.id, req.user.id]
    }, function(err, result) {
      if(err) {
        render('notFound', {error: 'An unexpected error has occurred.'}, res);
        err.handled = true;
        next(err);
      } else if(result.length <= 0) {
        render('notFound', {}, res);
      } else {
        req.assignment = result[0].assignments;
        req.section = result[0].sections;
        next();
      }
    });
});

// Gets the assignment information based on id
router.get('/:id', function(req, res, next) {
  connection.query("SELECT `name`,`contents`,`mime` FROM `files-teachers` WHERE `assignment_id` = ?", [req.params.id], function(err, teacherFiles) {
    if (err) {
      render('notFound', {error: 'An unexpected error has occurred.'}, res);
      err.handled = true;
      return next(err);
    }

    connection.query("SELECT `files`.`name`,`files`.`contents`,`files`.`mime`,`submissions`.`grade`,`submissions`.`submitted`,`files`.`compiled`,`submissions`.`main` \
                      FROM `files`, `students`, `assignments`, `submissions` \
                      WHERE `submissions`.`assignment_id` = `assignments`.`id` \
                      AND `submissions`.`student_id` = `students`.`id` \
                      AND `files`.`submission_id`= `submissions`.`id` \
                      AND `students`.`id` = ? AND `assignments`.`id` = ? ORDER BY `files`.`id`", [req.user.id, req.params.id], function(err, fileData) {
      if (err) {
        render('notFound', {error: 'An unexpected error has occurred.'}, res);
        err.handled = true;
        return next(err);
      }

      if (fileData.length == 0) {
        render('assignment', {
          title: req.assignment.name,
          assignment: req.assignment,
          teacherFiles: teacherFiles
        }, res);
      } else {
        var anyCompiled = false;
        var anyMain = false;
        for (var i = 0; i < fileData.length; i++) {
          fileData[i].display = isAscii(fileData[i].mime) ? fileData[i].contents : 'This is a binary file. Download it to view it.';
          if (fileData[i].compiled) anyCompiled = true;

          fileData[i].isMain = fileData[i].main == fileData[i].name;
          if (fileData[i].isMain) anyMain = true;

          var lastDot = fileData[i].name.lastIndexOf('.') + 1;
          fileData[i].extension = fileData[i].name.substring(lastDot >= fileData[i].name.length ? 0 : lastDot);
          var imageExtensions = ['png', 'jpg', 'jpeg', 'gif'];
          if (imageExtensions.indexOf(fileData[i].extension) >= 0) {
            fileData[i].text = false;
            fileData[i].display = '<img src="data:image/' + fileData[i].extension + ';base64,';
            fileData[i].display += new Buffer(fileData[i].contents).toString('base64');
            fileData[i].display += '" alt="' + fileData[i].name + '">';
          } else {
            fileData[i].text = true;
          }
        }

        // Sends file data
        var teacherNames = [];
        for(var i = 0; i < teacherFiles.length; i++) {
          teacherNames.push(teacherFiles[i].name);
        }
        render('assignmentComplete', {title: req.assignment.name, assignment: req.assignment, fileData: fileData, anyCompiled: anyCompiled, anyMain: anyMain, teacherFiles: teacherNames}, res);
      }

    });

  });
});

router.use('/:id/submit', multer({
  inMemory: false,
  putSingleFilesInArray: true,
  rename: function(fieldname, filename) {
    // don't rename
    return filename;
  },
  changeDest: function(dest, req, res) {
    var directory = './uploads/' + req.user.id + '/';
    fs.ensureDirSync(directory); // note: i tried the async version of this but i got weird errors
    return directory;
  }
}));

router.post('/:id/submit', function(req, res, next) {
  submit(req, res, function(err, data) {
    if (err) {
      if (req.body.fallback) {
        res.redirect('/student/assignment/' + req.params.id + '?error=An unknown error has occurred.');
      } else {
        res.json({ code: -1 }); // unknown
      }
      err.handled = true;
      return next(err);
    }
    if (req.body.fallback) {
      if (data == 0) {
        res.redirect('/student/assignment/' + req.params.id);
      } else {
        var msg = '';
        switch (data) {
          case -1:
            msg = 'An unknown error has occurred.';
            break;
          case 1:
            msg = 'Your code could not be compiled.';
            break;
          case 2:
            msg = 'Some of your files have invalid names. Only alphanumeric characters and periods are allowed, and names must contain at least 6 characters.';
            break;
          case 3:
            msg = 'You already submitted this!';
            break;
          case 4:
            msg = 'You must submit at least one java file. Make sure they end in .java';
            break;
          case 5:
            msg = 'No two files can share the same name.';
            break;
        }
        res.redirect('/student/assignment/' + req.params.id + '?error=' + msg);
      }
    } else {
      res.json({ code: data });
    }
  });
});

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

      fs.readFile(file, function(err, data) {
        if (err) return cb(err);

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
var submit = function(req, res, next) {

  // normalize file uploads into this files array
  var files = [];
  for (var key in req.files) {
    for (var i=0; i<req.files[key].length; i++) {
      files.push(req.files[key][i]);
    }
  }

  if (_.isEmpty(files)) return next(null, 1); // no files submitted

  // first, check all the file names for legality
  for(var i=0; i<files.length; i++) {
    if(!/^[a-zA-Z0-9.]+$/.test(files[i].name) || files[i].name.length < 6) { // if the name contains anything besides alphanumerical characters and periods or is too short (less than 6 chars)
      return next(null, 2); // invalid name
    }
    for(var j=0; j<files.length; j++) {
      if(i == j) continue;
      if(files[i].name == files[j].name) {
        return next(null, 5); // duplicate names
      }
    }
  }

  // get attached teacher files
  connection.query("SELECT `name`,`contents`,`mime` FROM `files-teachers` WHERE `assignment_id` = ?", [req.params.id], function(err, teacherFiles) {
    if (err) return next(err, -1);

    // now, check to see if this student already submitted this assignment
    connection.query("SELECT `id` FROM `submissions` WHERE `student_id` = ? AND `assignment_id` = ?", [req.user.id, req.params.id], function(err, submissions) {
      if (err) return next(err, -1);
      if (submissions.length > 0) return next(null, 3);

      var toCompile = "";
      for(var i=0; i<files.length; i++) {
        files[i].isJava = files[i].path.substr(files[i].path.length-4).toLowerCase() == 'java';
        if(files[i].isJava) toCompile += files[i].path + " ";
      }

      async.each(teacherFiles, function(teacherFile, cb) {
        teacherFile.path = './uploads/' + req.user.id + '/' + teacherFile.name;
        teacherFile.isJava = teacherFile.name.substr(teacherFile.name.length-4).toLowerCase() == 'java';
        if(teacherFile.isJava) toCompile += teacherFile.path + " ";
        teacherFile.mimetype = teacherFile.mime;
        files.push(teacherFile);
        fs.writeFile(teacherFile.path, teacherFile.contents, cb);
      }, function(err) {
        if (err) return next(err);

        if (!toCompile) return next(null, 4); // must have at least one java file

        // compile the java files
        exec("javac " + toCompile, function(err, stdout, stderr) {
          findMain(err, files, function(err, main) {
            if (err) return next(err, -1);

            // finally, make necessary changes in database
            connection.query("INSERT INTO `submissions` VALUES(NULL, ?, ?, NOW(), NULL, ?)", [req.params.id, req.user.id, main], function(err, result) {
              if (err) return next(err, -1);

              var args = [];
              var stmt = "";
              async.map(files, function(file, cb) {
                fs.readFile(file.path, cb);
              }, function(err, javaResults) {
                if (err) return next(err, -1);

                async.map(files, function(file, cb) {
                  if (file.isJava) {
                    fs.readFile(file.path.substr(0, file.path.length - 4) + 'class', cb);
                  } else {
                    cb(null, null);
                  }
                }, function(err, classResults) {
                  if (err) return next(err, -1);

                  for (var i=0; i<files.length; i++) {
                    stmt += "(NULL,?,?,?,?,?),";
                    args.push(result.insertId);
                    args.push(files[i].name);
                    args.push(javaResults[i]);
                    args.push(classResults[i]);
                    args.push(files[i].mimetype);
                  }
                  stmt = stmt.substr(0, stmt.length - 1); // remove last character from stmt (extraneous comma)

                  connection.query("INSERT INTO `files` VALUES" + stmt, args, function(err, result) {
                    fs.remove('./uploads/' + req.user.id + '/', function(err2) {
                      if (err) return next(err, -1);
                      if (err2) return next(err2, -1);

                      next(null, 0);
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

router.get('/:id/resubmit', function(req, res, next) {
  connection.query("SELECT `submissions`.`id` \
                    FROM `submissions` \
                    WHERE `submissions`.`student_id` = ? \
                    AND `submissions`.`assignment_id` = ?", [req.user.id, req.params.id], function(err, rows) {
    if(err) {
      res.redirect('/student/assignment');
      err.handled = true;
      next(err);
    } else if (rows.length == 0) {
      // User has not submitted so cannot resubmit
      console.error('USER ' + req.user.id + ' IS TRYING TO RESUBMIT BUT SHOULDNT BE');
      res.redirect('/student/assignment');
    } else {
      // Means user has already submitted and is able to resubmit
      connection.query("DELETE FROM `files` WHERE `submission_id` = ?; \
                        DELETE FROM `submissions` \
                            WHERE `assignment_id` = ? \
                            AND `student_id` = ?; \
                        DELETE FROM `comments` WHERE `submission_id` = ?", [rows[0].id, req.params.id, req.user.id, rows[0].id], function(err, rows) {
        if(err) {
          res.redirect('/student/assignment/');
          err.handled = true;
          next(err);
        } else {
          res.redirect('/student/assignment/' + req.params.id);
        }
      });
    }
  });
});

router.get('/:id/chooseMain/:file', function(req, res, next) {
  connection.query("UPDATE `submissions` SET `main` = ? WHERE `assignment_id` = ? AND `student_id` = ?", [req.params.file, req.params.id, req.user.id], function(err) {
    if (err) {
      res.redirect('/student/assignment/' + req.params.id + '?error=Unable to set main, please reload and try again.');
      err.handled = true;
      next(err);
    } else {
      res.redirect('/student/assignment/' + req.params.id);
    }
  });
});

comments.setup(router, 'student');

module.exports = router;
