// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

require('../common');
var router = express.Router();
var alphanumericAndPeriod = /^[a-zA-Z0-9]+\.java$/;

var render = function(page, options, res) {
  switch(page) {
    case 'notFound':
      // page must be set already
      options.title = options.type.charAt(0).toUpperCase() + options.type.slice(1) + ' Not Found';
      break;
    case 'assignmentList':
      options.page = 1;
      options.title = 'Your Assignments';
      break;
    case 'assignment':
      options.page = 1;
      // title should already be set
      options.js = ['student/dropzone', 'student/studentSubmit'];
      options.css = ['student/submit', 'font-awesome.min'];
      break;
    case 'assignmentComplete':
      options.page = 1;
      // title should already be set
      options.js = ['prettify', 'student/studentSubmitted'];
      options.css = ['prettify', 'font-awesome.min'];
      options.onload = 'prettyPrint()';
      break;
  }
  renderGenericStudent(page, options, res);
}

// The page that lists the assignments
router.get('/', function(req, res) {
  connection.query("SELECT `sections`.`name`,`teachers`.`fname`,`teachers`.`lname`,`assignments`.`name` AS `assignmentName`,`assignments`.`description`,`assignments`.`due`, `assignments`.`id` \
                    FROM `sections`, `teachers`, `assignments`,`enrollment` \
                    WHERE `enrollment`.`student_id` = ? \
                    AND `enrollment`.`section_id` = `assignments`.`section_id` \
                    AND `sections`.`id` = `enrollment`.`section_id` \
                    AND `sections`.`teacher_id`=`teachers`.`id`", [req.user.id], function(err, rows) {
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
        render('notFound', {page: 1, type: 'assignment', error: 'An unexpected error has occurred.'}, res);
        throw err;
      } else if(rows.length <= 0) {
        render('notFound', {page: 1, type: 'assignment'}, res);
      } else {
        connection.query("SELECT `files`.`name`, `files`.`contents` \
                          FROM `files`, `students`, `assignments`, `submissions` \
                          WHERE `submissions`.`assignment_id` = `assignments`.`id` \
                          AND `submissions`.`student_id` = `students`.`id` \
                          AND `files`.`submission_id`= `submissions`.`id` \
                          AND  `students`.`id` = ? AND `assignments`.`id` = ?", [req.user.id, assignmentID], function(err, fileData){
          if(err) {
            render('notFound', {page: 1, type: 'assignment', error: 'An unexpected error has occurred.'}, res);
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
                render('notFound', {page: 1, type: 'assignment', error: 'An unexpected error has occurred.'}, res);
                throw err;
              } else {
                submitFiles(0, req.files, req.user.id, assignmentID, function(err, stderr) {
                  if(err) {
                    render('notFound', {page: 1, type: 'assignment', error: 'Compilation has failed'}, res);
                    throw err;
                  } if(stderr) {
                    console.log(stderr);
                    res.send(stderr);
                  } else {
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
                render('notFound', {page: 1, type: 'assignment', error: 'Compilation has failed'}, res);
                throw err;
              } else {
                res.redirect('/student/assignment/' + req.params.id);
              }
            });
          }
        });
      } else {
        // Will implement frontend name Same error to make it more friendly, no need for error response
        res.redirect('/student/assignment/');
      }
    } else {
      // Will implement frontend sanitization to make it more friendly, no need for error response
      res.redirect('/student/assignment/');
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
          for(file in files) {
            compileFiles = compileFiles + files[file].path + " ";
          }

          // Compiles the java
          exec("javac " + compileFiles, function (error, stdout, stderr) {
            if(stderr){
              for(file in files) {
                var compilePath = files[file].path.substr(0, files[file].path.length-4) + "class";
                fs.readFile(files[file].path, function(err, javaData) {
                  fs.readFile(compilePath, function (err, classData) {
                    connection.query("INSERT INTO `files` VALUES(NULL,?,?,?,?)", [rows[0].id, files[file].originalname, javaData, classData], function(err, rows) {
                      if(err){
                        finish(err);
                      }
                      // Deletes files after submit
                      fs.unlink(files[file].path, function() {
                        fs.unlink(compilePath, function() {

                        });
                      });
                    });
                  });
                });
              }
              finish(null, stderr);
            } else {
              for(file in files) {
                var compilePath = files[file].path.substr(0, files[file].path.length-4) + "class";
                fs.readFile(files[file].path, function(err, javaData) {
                  fs.readFile(compilePath, function (err, classData) {
                    connection.query("INSERT INTO `files` VALUES(NULL,?,?,?,?)", [rows[0].id, files[file].originalname, javaData, classData], function(err, rows) {
                      if(err){
                        finish(err);
                      }
                      // Deletes files after submit
                      fs.unlink(files[file].path, function() {
                        fs.unlink(compilePath, function() {

                        });
                      });
                    });
                  });
                });
              }
            }
            finish(null);
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
