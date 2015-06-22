// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

require('../common');
var router = express.Router();
var multer = require('multer');
var strftime = require('strftime');
var _ = require('lodash');
var comments = require('../comments');

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
    if(err) {
      render('notFound', {error: 'An unexpected error has occurred.'}, res);
      err.handled = true;
      next(err);
    } else {
      connection.query("SELECT `files`.`name`,`files`.`contents`,`files`.`mime`,`submissions`.`grade`,`submissions`.`submitted`,`files`.`compiled` \
                        FROM `files`, `students`, `assignments`, `submissions` \
                        WHERE `submissions`.`assignment_id` = `assignments`.`id` \
                        AND `submissions`.`student_id` = `students`.`id` \
                        AND `files`.`submission_id`= `submissions`.`id` \
                        AND `students`.`id` = ? AND `assignments`.`id` = ? ORDER BY `files`.`id`", [req.user.id, req.params.id], function(err, fileData){
        if(err) {
          render('notFound', {error: 'An unexpected error has occurred.'}, res);
          err.handled = true;
          next(err);
        } else if(fileData.length == 0) {
          render('assignment', {title: req.assignment.name, assignment: req.assignment, teacherFiles: teacherFiles}, res);
        } else {
          var anyCompiled = false;
          for(file in fileData) {
            fileData[file].display = isAscii(fileData[file].mime);
            if(fileData[file].compiled) anyCompiled = true;
          }
          // Sends file data
          var teacherNames = [];
          for(i in teacherFiles) {
            teacherNames.push(teacherFiles[i].name);
          }
          render('assignmentComplete', {title: req.assignment.name, assignment: req.assignment, fileData: fileData, anyCompiled: anyCompiled, teacherFiles: teacherNames}, res);
        }
      });
    }
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

// Submits the file into the mysql database
var submit = function(req, res, next) {
  var files = [];
  for (var key in req.files) {
    for (var i=0; i<req.files[key].length; i++) {
      files.push(req.files[key][i]);
    }
  }
  if (!_.isEmpty(files)) {

    // first, check all the file names for legality
    for(var i in files) {
      if(!/^[a-zA-Z0-9.]+$/.test(files[i].name) || files[i].name.length < 6) { // if the name contains anything besides alphanumerical characters and periods or is too short (less than 6 chars)
        return next(null, 2); // invalid name
      }
      for(var j in files) {
        if(i == j) continue;
        if(files[i].name == files[j].name) {
          return next(null, 5); // duplicate names
        }
      }
    }

    // get attached teacher files
    connection.query("SELECT `name`,`contents`,`mime` FROM `files-teachers` WHERE `assignment_id` = ?", [req.params.id], function(err, teacherFiles) {
      if (err) {
        next(err, -1);
      } else {
        // now, check to see if this student already submitted this assignment
        connection.query("SELECT `id` FROM `submissions` WHERE `student_id` = ? AND `assignment_id` = ?", [req.user.id, req.params.id], function(err, submissions) {
          if (err) {
            next(err, -1);
          } else if(submissions.length > 0) {
            next(null, 3);
          } else {

            var toCompile = "";
            for(file in files) {
              files[file].isJava = files[file].path.substr(files[file].path.length-4).toLowerCase() == 'java';
              if(files[file].isJava) toCompile += files[file].path + " ";
            }
            for(file in teacherFiles) {
              teacherFiles[file].path = './uploads/' + req.user.id + '/' + teacherFiles[file].name;
              fs.writeFileSync(teacherFiles[file].path, teacherFiles[file].contents);
              teacherFiles[file].isJava = teacherFiles[file].name.substr(teacherFiles[file].name.length-4).toLowerCase() == 'java';
              if(teacherFiles[file].isJava) toCompile += teacherFiles[file].path + " ";
              teacherFiles[file].mimetype = teacherFiles[file].mime;
              files[teacherFiles[file].name] = teacherFiles[file];
            }

            if(!toCompile) {
              return next(null, 4); // must have at least one java file
            }

            // compile the java files
            exec("javac " + toCompile, function(err, stdout, stderr) {
              if (err) { // compilation error, treat all files as non-java files
                for(file in files) {
                  files[file].isJava = false;
                }
              }

              // finally, make necessary changes in database
              connection.query("INSERT INTO `submissions` VALUES(NULL, ?, ?, NOW(), NULL, NULL)", [req.params.id, req.user.id], function(err, result) {
                if (err) {
                  next(err, -1);
                } else {

                  var args = [];
                  var stmt = "";
                  for(file in files) {
                    // read java and class data into variables
                    var javaData = fs.readFileSync(files[file].path);
                    var classData = files[file].isJava ? fs.readFileSync(files[file].path.substr(0, files[file].path.length-4) + 'class') : null;

                    stmt += "(NULL,?,?,?,?,?),";
                    args.push(result.insertId);
                    args.push(files[file].name);
                    args.push(javaData);
                    args.push(classData);
                    args.push(files[file].mimetype);
                  }
                  stmt = stmt.substr(0, stmt.length-1); // remove last character from stmt (extraneous comma)
                  connection.query("INSERT INTO `files` VALUES" + stmt, args, function(err, result) {
                    if(err) {
                      fs.removeSync('./uploads/' + req.user.id + '/'); // we must cleanup, even on error
                      next(err, -1);
                    } else {
                      // clean up files used for compilation
                      fs.remove('./uploads/' + req.user.id + '/', function(err) {
                        if (err) {
                          next(err, -1);
                        } else {
                          next(null, 0);
                        }
                      });
                    }
                  });

                }
              });

            });

          }
        });
      }
    });

  } else {
    next(null, 1); // no files submitted
  }
};

router.get('/:id/resubmit', function(req,res) {
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

comments.setup(router, 'student');

module.exports = router;
