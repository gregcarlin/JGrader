// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

require('../common');
var router = express.Router();
var alphanumericAndPeriod = /^[a-zA-Z0-9]+\.java$/;
var multer = require('multer');
var strftime = require('strftime');

var render = function(page, options, res) {
  options.page = 1;
  switch(page) {
    case 'notFound':
      options.title = 'Assignment Not Found';
      options.type = 'assignment';
      break;
    case 'assignmentList':
      options.title = 'Your Assignments';
      options.js = ['tooltip'];
      options.css = ['font-awesome.min'];
      options.strftime = strftime;
      break;
    case 'assignment':
      // title should already be set
      options.js = ['student/dropzone', 'student/studentSubmit'];
      options.css = ['student/submit', 'font-awesome.min'];
      options.strftime = strftime;
      break;
    case 'assignmentComplete':
      // title should already be set
      options.js = ['prettify', 'student/studentSubmitted'];
      options.css = ['prettify', 'font-awesome.min'];
      options.onload = 'prettyPrint()';
      options.strftime = strftime;
      break;
  }
  renderGenericStudent(page, options, res);
}

// The page that lists the assignments
router.get('/', function(req, res) {
  connection.query("SELECT `sections`.`name`,`teachers`.`fname`,`teachers`.`lname`,`assignments`.`name` AS `assignmentName`,`assignments`.`description`,`assignments`.`due`,`assignments`.`id`,`submissions`.`submitted` \
                    FROM `sections`, `teachers`,`enrollment`,`assignments` \
                    LEFT JOIN `submissions` ON `submissions`.`assignment_id` = `assignments`.`id` AND `submissions`.`student_id` = ? \
                    WHERE `enrollment`.`student_id` = ? \
                    AND `enrollment`.`section_id` = `assignments`.`section_id` \
                    AND `sections`.`id` = `enrollment`.`section_id` \
                    AND `sections`.`teacher_id`=`teachers`.`id`", [req.user.id, req.user.id], function(err, rows) {
    if(err) {
      render('assignmentList', {rows: [], error: 'An unexpected error has occurred.'}, res);
      throw err;
    } else {
      render('assignmentList', {rows: rows}, res);
    }
  });
});

// Gets the assignment information based on id
router.get('/:id', function(req, res) {
  var assignmentID = req.params.id;
  if(assignmentID) {
    connection.query("SELECT `assignments`.`id`, `assignments`.`name`, `assignments`.`description`,`assignments`.`due` \
                      FROM `enrollment`,`assignments`,`sections` \
                      WHERE `enrollment`.`section_id` = `sections`.`id` \
                      AND `sections`.`id` = `assignments`.`section_id` \
                      AND `enrollment`.`student_id` = ? \
                      AND `assignments`.`id` = ?", [req.user.id, assignmentID], function(err, rows) {
      if(err) {
        render('notFound', {error: 'An unexpected error has occurred.'}, res);
        throw err;
      } else if(rows.length <= 0) {
        render('notFound', {}, res);
      } else {
        connection.query("SELECT `files`.`name`, `files`.`contents`, `submissions`.`grade`,`submissions`.`submitted` \
                          FROM `files`, `students`, `assignments`, `submissions` \
                          WHERE `submissions`.`assignment_id` = `assignments`.`id` \
                          AND `submissions`.`student_id` = `students`.`id` \
                          AND `files`.`submission_id`= `submissions`.`id` \
                          AND  `students`.`id` = ? AND `assignments`.`id` = ?", [req.user.id, assignmentID], function(err, fileData){
          if(err) {
            render('notFound', {error: 'An unexpected error has occurred.'}, res);
            throw err;
          } else if(fileData.length == 0) {
            render('assignment', {title: rows[0].name, rows: rows}, res);
          } else {
            // Sends file data
            render('assignmentComplete', {title: rows[0].name, rows: rows, fileData: fileData}, res);
          }
        });
      }
    });
  }
});

// special version of fs.mkdir that suppresses errors on already created directories
var mkdir = function(dir) {
  try {
    fs.mkdirSync(dir);
  } catch (err) {
    if(err.code != 'EEXIST') throw err;
  }
};

router.use('/:id/submit', multer({
  inMemory: false,
  rename: function(fieldname, filename) {
    return filename;
  },
  changeDest: function(dest, req, res) {
    mkdir('./uploads');
    mkdir('./uploads/' + req.user.id + '/');
    return './uploads/' + req.user.id + '/';
  }
}));

// Submits the file into the mysql database
router.post('/:id/submit', function(req, res) {
  var assignmentID = req.params.id;
  if(req.files) {
    // Sanatize file name a-z A-Z 0-9 and .
    var isSanitize = true;
    var noNameSame = true;
    var stringArray = new Array();
    // Checks if any files are the same or have weird names
    for(file in req.files) {
      if(!alphanumericAndPeriod.test(req.files[file].originalname)) {
        isSanitize = false;
      }
      if(stringArray.indexOf(req.files[file].originalname) != -1){
        noNameSame = false;
      }
      stringArray.push(req.files[file].originalname);
    }
    if(isSanitize) {
      if(noNameSame) {
        // Checks if already submission
        connection.query("SELECT `submissions`.`id` \
                          FROM `submissions` \
                          WHERE `submissions`.`student_id` = ? \
                          AND `submissions`.`assignment_id` = ?", [req.user.id, req.params.id], function(err, rows) {
          if(rows.length == 0) {
            connection.query("INSERT INTO `submissions` VALUES(NULL, ?, ?, NOW(), NULL)", [req.params.id, req.user.id], function(err, rows) {
              if(err) {
                render('notFound', {error: 'An unexpected error has occurred.'}, res);
                throw err;
              } else {
                submitFiles(0, req.files, req.user.id, assignmentID, function(err, stderr) {
                  if(err) {
                    render('notFound', {error: 'Compilation has failed'}, res);
                    throw err;
                  } if(stderr) {
                    console.log(stderr);
                    res.send(stderr);
                  } else {
                    console.log('success');
                    res.send("success");
                  }
                });
              }
            });
          } else {
            // Submission is already added
            // Todo: block submission or something
            submitFiles(0, req.files, req.user.id, assignmentID, function(err) {
              if(err) {
                render('notFound', {error: 'Compilation has failed'}, res);
                throw err;
              } else {
                console.log('success 2');
                res.send("success");
                //res.redirect('/student/assignment/' + req.params.id);
              }
            });
          }
        });
      } else {
        // Will implement frontend name Same error to make it more friendly, no need for error response
        for(file in req.files) {
          fs.unlinkSync(req.files[file].path);
        }
        res.send('noSanitize');
      }
    } else {
      // Will implement frontend sanitization to make it more friendly, no need for error response
      for(file in req.files) {
        fs.unlinkSync(req.files[file].path);
      }
      res.send('noSanitize');
    }
  }
});

// Compiles and submits the information to the database
var submitFiles = function(i, files, student_id, assignment_id, finish) {
  // Makes sure safe upload
  if(files) {
      // Gets submission created in the POST method
      connection.query("SELECT `submissions`.`id` \
                        FROM `students`,`submissions` \
                        WHERE `students`.`id` = ?  \
                        AND `submissions`.`student_id` = `students`.`id` AND `submissions`.`assignment_id` = ?", [student_id, assignment_id], function(err, rows) {
        if(err){
          finish(err);
        } else {
          // List of file paths to compile
          var compileFiles = "";
          var fileArr = [];
          for(file in files) {
            compileFiles = compileFiles + files[file].path + " ";
            fileArr.push(files[file]);
          }

          // Compiles the java
          exec("javac " + compileFiles, function (error, stdout, stderr) {
            if(error) throw error;

            // must convert from file object to file array
            // var fileArr = [];
            // for(i in files) {
            //   fileArr.push(files[i]);
            // }

            async.each(fileArr, function(file, cb) {
              var compilePath = file.path.substr(0, file.path.length-4) + 'class';
              async.parallel({
                  javaData: function(callback) {
                    fs.readFile(file.path, callback);
                  },
                  classData: function(callback) {
                    fs.readFile(compilePath, callback);
                  }
                }, function(err, data) {
                  connection.query("INSERT INTO `files` VALUES(NULL,?,?,?,?)", [rows[0].id, file.originalname, data.javaData, data.classData], function(err, rows) {
                    if(err) throw err;
                    // Deletes files after submit
                    async.parallel([
                        function(callback) { fs.unlink(file.path, callback) },
                        function(callback) { fs.unlink(compilePath, callback) }
                      ], function(err) {
                        // All files deleted and inserted into database, good to run final callback
                        cb();
                        if(err) throw err;
                      });
                  });
              });
              // Final Callback after all of files delted then deletes dir.
            }, function(err) {
                fs.rmdirSync(fileArr[0].path.substring(0, fileArr[0].path.lastIndexOf('/')))
                finish(err ? err : stderr);
            });
          });
        }
      });
  } else {
    finish(err);
  }
}

router.get('/:id/resubmit', function(req,res) {
  connection.query("SELECT `submissions`.`id` \
                    FROM `submissions` \
                    WHERE `submissions`.`student_id` = ? \
                    AND `submissions`.`assignment_id` = ?", [req.user.id, req.params.id], function(err, rows) {
    if(err) {
      res.redirect('/student/assignment');
    } else if (rows.length == 0) {
      // User has not submitted so cannot resubmit
      res.redirect('/student/assignment');
    } else {
      // Means user has already submitted and is able to resubmit
      connection.query("DELETE FROM `files` WHERE `files`.`submission_id` = ?", [rows[0].id], function(err, rows) {
        if(err) {
          res.redirect('/student/assignment');
        } else {
          connection.query("DELETE FROM `submissions` \
                            WHERE `submissions`.`assignment_id` = ? \
                            AND `submissions`.`student_id` = ?", [req.params.id, req.user.id], function(err, rows) {
            if(err) {
              res.redirect('/student/assignment/');
            } else {
              res.redirect('/student/assignment/' + req.params.id);
            }
          });
        }
      });
    }
  });
});

module.exports = router;
