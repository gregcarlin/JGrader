require('./common');
var router = express.Router();
var multer  = require('multer');
var moment = require('moment');
var alphanumericAndPeriod = /^[a-zA-Z0-9]+\.java$/;

var render = function(page, options, res) {
  switch(page) {
    case 'notFound':
      break;
    case 'assignmentList':
      options.page = 1;
      options.title = 'Your Assignments';
      break;
    case 'assignment':
      options.page = 1;
      // title should already be set
      break;
    case 'sectionList':
      options.page = 0;
      options.title = 'Your Sections';
      options.js = ['tooltip'];
      break;
    case 'section':
      options.page = 0;
      // title should already be set
      break;
    case 'joinSection':
      options.page = 0;
      options.title = 'Join a Section';
      break;
    case 'settings':
      options.page = -1;
      options.title = 'Settings';
      break;
  }
  renderGenericStudent(page, options, res);
}

// No page so redirect to view the sections
router.get('/', function(req, res) {
  res.redirect('/student/section');
});

// The page that lists the assignments
router.get('/assignment', function(req, res) {
  authStudent(req.cookies.hash, res, function(id) {
    connection.query("SELECT `sections`.`name`,`teachers`.`fname`,`teachers`.`lname`,`assignments`.`name` AS `assignmentName`,`assignments`.`description`,`assignments`.`due`, `assignments`.`id` \
                      FROM `sections`, `teachers`, `assignments`,`enrollment` \
                      WHERE `enrollment`.`student_id` = ? \
                      AND `enrollment`.`section_id` = `assignments`.`section_id` \
                      AND `sections`.`id` = `enrollment`.`section_id` \
                      AND `sections`.`teacher_id`=`teachers`.`id`", [id], function(err, rows) {
      if(err) {
        render('assignmentList', {rows: [], error: 'An unexpected error has occurred.'}, res);
        if(debug) throw err;
      } else {
        render('assignmentList', {rows: rows}, res);
      }
    });
  });
});

// Gets the assignment information based on id
router.get('/assignment/:id', function(req, res) {
  authStudent(req.cookies.hash, res, function(id) {
    var assignmentID = req.params.id;
    if(id) {
      connection.query("SELECT `assignments`.`id`, `assignments`.`name`, `assignments`.`description`,`assignments`.`due` \
                        FROM `enrollment`,`assignments`,`sections` \
                        WHERE `enrollment`.`section_id` = `sections`.`id` \
                        AND `sections`.`id` = `assignments`.`section_id` \
                        AND `enrollment`.`student_id` = ? \
                        AND `assignments`.`id` = ?", [id, assignmentID], function(err, rows) {
        if(err) {
          render('notFound', {page: 1, type: 'assignment', error: 'An unexpected error has occurred.'}, res);
          if(debug) throw err;
        } else if(rows.length <= 0) {
          render('notFound', {page: 1, type: 'assignment'}, res);
        } else {
          connection.query("SELECT `files`.`name`, `files`.`contents` \
                            FROM `files`, `students`, `assignments`, `submissions` \
                            WHERE `submissions`.`assignment_id` = `assignments`.`id` \
                            AND `submissions`.`student_id` = `students`.`id` \
                            AND `files`.`submission_id`= `submissions`.`id` \
                            AND  `students`.`id` = ? AND `assignments`.`id` = ?", [id, assignmentID], function(err, fileData){
            if(err) {
              render('notFound', {page: 1, type: 'assignment', error: 'An unexpected error has occurred.'}, res);
              if(debug) throw err;
            } else if(fileData.length == 0) {
              render('assignment', { rows: rows, js: ['student/dropzone', 'student/studentSubmit'] }, res);
            } else {
              // Sends file data
              render('assignment', { rows: rows, fileData: fileData, js: ['prettify', 'student/studentSubmitted'] }, res);
            }
          });
        }
      });
    }
  });
});

// Submits the file into the mysql database
router.post('/assignment/:id/submit', function(req, res) {
  authStudent(req.cookies.hash, res, function(id) {
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
                            AND `submissions`.`assignment_id` = ?", [id, req.params.id], function(err, rows) {
            if(rows.length == 0) {
              var timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
              connection.query("INSERT INTO `submissions` VALUES(NULL, ?, ?, ?, NULL)", [req.params.id, id, timestamp], function(err, rows) {
                if(err) {
                  render('notFound', {page: 1, type: 'assignment', error: 'An unexpected error has occurred.'}, res);
                  if(debug) throw err;
                } else {
                  submitFiles(0, req.files, id, assignmentID, function(err) {
                    if(err){
                      render('notFound', {page: 1, type: 'assignment', error: 'Compilation has failed'}, res);
                      if(debug) throw err;
                    } else {
                      res.send("success");
                    }
                  });
                }
              });
            } else {
              // Submission is already added
              // Todo: block submission or something
              submitFiles(0, req.files, id, assignmentID, function(err) {
                if(err) {
                  render('notFound', {page: 1, type: 'assignment', error: 'Compilation has failed'}, res);
                  if(debug) throw err;
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
});

router.get('/assignment/:id/resubmit', function(req,res) {
  authStudent(req.cookies.hash, res, function(id) {
    connection.query("SELECT `submissions`.`id` \
                      FROM `submissions` \
                      WHERE `submissions`.`student_id` = ? \
                      AND `submissions`.`assignment_id` = ?", [id, req.params.id], function(err, rows) {
      if(err) {
        res.redirect('/student/assignment');
      } else if (rows.length == 0) {
        // User has not submitted so cannot resubmit
        res.redirect('/student/assignment');
      } else {
        // Means user has already submitted and is able to resubmit
        connection.query("DELETE FROM `files` WHERE `files`.`submission_id` = ?", [rows[0].id], function(err, rows) {
          if(err) {
            console.log("mysql error");
            res.redirect('/student/assignment');
          } else {
            connection.query("DELETE FROM `submissions` \
                              WHERE `submissions`.`assignment_id` = ? \
                              AND `submissions`.`student_id` = ?", [req.params.id, id], function(err, rows) {
              if(err) {
                res.redirect('/student/assignment');
              } else {
                res.redirect('/student/assignment/');
              }
            });
          }
        });
    }
  });
});
});


// Lists all of the current sections (classes)
router.get('/section', function(req, res) {
  authStudent(req.cookies.hash, res, function(id) {
    findSectionInfo(id, res, function(rows) {
      render('sectionList', {rows: rows}, res);
    });
  });
});

// Asks user for class password
router.get('/section/joinSection', function(req, res) {
  authStudent(req.cookies.hash, res, function(id) {
    render('joinSection', {}, res);
  });
});

// Gets information for specific class
router.get('/section/:id', function(req, res) {
  authStudent(req.cookies.hash, res, function(studentID) {
    var sectionID = req.params.id;
    connection.query("SELECT `sections`.`name` FROM `sections`,`enrollment` WHERE `sections`.`id` = ? AND `sections`.`id` = `enrollment`.`section_id` AND `enrollment`.`student_id` = ?", [sectionID, studentID], function(err, result) {
      if(err) {
        render('notFound', {page: 0, type: 'section', error: 'An unexpected error has occurred.'}, res);
        if(debug) throw err;
      } else if(result.length <= 0) {
        render('notFound', {page: 0, type: 'section'}, res);
      } else {
        connection.query("SELECT `id`,`name`,`description`,`due` FROM `assignments` WHERE `section_id` = ?", [sectionID], function(err, rows) {
          if(err) {
            render('notFound', {page: 0, type: 'section', error: 'An unexpected error has occurred.'}, res);
            if(debug) throw err;
          } else {
            render('section', {name: result[0].name, rows: rows}, res);
          }
        });
      }
    });
  });
});

// Joins Class
router.post('/section/joinSection', function(req, res) {
  authStudent(req.cookies.hash, res, function(id) {
    var sectionID = req.param('sectionID');
    if(isSet(sectionID)) {
      connection.query("SELECT `id` FROM `sections` WHERE `code` = ?", [sectionID], function(err, rows) {
        if(err) {
          render('joinSection', {error: 'An unknown error has occurred.'}, res);
          if(debug) throw err;
        } else if(rows.length <= 0) {
          render('joinSection', {error: 'That is not a valid section code.'}, res);
        } else {
          connection.query("INSERT INTO `enrollment` VALUES(?, ?)", [rows[0].id, id], function(err, result) {
            if(err) {
              render('joinSection', {error: 'An unknown error has occurred.'}, res);
              if(debug) throw err;
            } else {
              res.redirect('/student/section/' + rows[0].id);
            }
          });
        }
      });
    } else {
      render('joinSection', {error: 'You must enter a section code.'}, res);
    }
  });
});

var findSectionInfo = function(id, res, finish) {
  if(id){
    connection.query("SELECT `sections`.`name`,`teachers`.`fname`,`teachers`.`lname`,`sections`.`id` FROM `enrollment`,`sections`,`teachers` WHERE `enrollment`.`section_id` = `sections`.`id` AND `sections`.`teacher_id` = `teachers`.`id` AND `enrollment`.`student_id` = ?", [id], function(err, rows) {
      if(err) {
        render('notFound', {page: 1, type: 'section', error: 'An unexpected error has occurred.'}, res);
        if(debug) throw err;
      } else {
        finish(rows);
      }
    });
  }
}

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
              for(file in files){
                fs.unlink(files[file.path], function() {

                });
              }
              finish(stderr);
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

// settings page
router.get('/settings', function(req, res) {
  authStudent(req.cookies.hash, res, function(studentID) {
    connection.query("SELECT `fname`,`lname` FROM `students` WHERE `id` = ?", [studentID], function(err, rows) {
      if(err) {
        render('notFound', {page: -1, type: 'settings', error: 'An unexpected error has occurred.'}, res);
        if(debug) throw err;
      } else {
        render('settings', {fname: rows[0].fname, lname: rows[0].lname}, res);
      }
    });
  });
});

router.post('/settings', function(req, res) {
  authStudent(req.cookies.hash, res, function(studentID) {
    var fname = req.param('fname');
    var lname = req.param('lname');
    if(isSet(fname) && isSet(lname)) {
      var oldPass = req.param('oldpass');
      var newPass = req.param('newpass');
      if(isSet(oldPass) || isSet(newPass)) {
        if(isSet(oldPass) && isSet(newPass)) {
          connection.query("UPDATE `students` SET `fname` = ?, `lname` = ?, `pass` = AES_ENCRYPT(?, ?) WHERE `id` = ? AND `pass` = AES_ENCRYPT(?, ?)", [fname, lname, newPass, creds.aes_key, studentID, oldPass, creds.aes_key], function(err, rows) {
            if(err) {
              render('notFound', {page: -1, type: 'settings', error: 'An unexpected error has occurred.'}, res);
              if(debug) throw err;
            } else if(rows.affectedRows <= 0) {
              render('settings', {fname: fname, lname: lname, error: 'Incorrect password.'}, res);
            } else {
              render('settings', {fname: fname, lname: lname, msg: 'Changes saved.'}, res);
            }
          });
        } else {
          render('settings', {fname: fname, lname: lname, error: 'All fields are required to change your password.'}, res);
        }
      } else {
        connection.query("UPDATE `students` SET `fname` = ?, `lname` = ? WHERE `id` = ?", [fname, lname, studentID], function(err) {
          if(err) {
            render('notFound', {page: -1, type: 'settings', error: 'An unexpected error has occurred.'}, res);
            if(debug) throw err;
          } else {
            render('settings', {fname: fname, lname: lname, msg: 'Changes saved.'}, res);
          }
        });
      }
    } else {
      if(!fname) fname = '';
      if(!lname) lname = '';
      render('settings', {fname: fname, lname: lname, error: 'You must set a valid name.'});
    }
  });
});

module.exports = router;
