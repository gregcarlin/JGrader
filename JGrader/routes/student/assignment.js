// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

require('../common');
var router = express.Router();
var multer = require('multer');
var strftime = require('strftime');
var comments = require('../comments');

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
      options.js = ['student/dropzone', 'student/submit'];
      options.css = ['student/submit', 'font-awesome.min'];
      options.strftime = strftime;
      break;
    case 'assignmentComplete':
      // title should already be set
      options.js = ['prettify', 'student/submitted', 'comments'];
      options.css = ['prettify', 'font-awesome.min'];
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

router.use('/:id', function(req, res, next) {
  connection.query({
      sql: "SELECT `assignments`.*,`sections`.* FROM `assignments` JOIN `sections` ON `assignments`.`section_id` = `sections`.`id` JOIN `enrollment` ON `sections`.`id` = `enrollment`.`section_id` WHERE `assignments`.`id` = ? AND `enrollment`.`student_id` = ?",
      nestTables: true,
      values: [req.params.id, req.user.id]
    }, function(err, result) {
      if(err) {
        render('notFound', {error: 'An unexpected error has occurred.'}, res);
        throw err;
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
router.get('/:id', function(req, res) {
  connection.query("SELECT `files`.`name`,`files`.`contents`,`submissions`.`grade`,`submissions`.`submitted`,`files`.`compiled` \
                    FROM `files`, `students`, `assignments`, `submissions` \
                    WHERE `submissions`.`assignment_id` = `assignments`.`id` \
                    AND `submissions`.`student_id` = `students`.`id` \
                    AND `files`.`submission_id`= `submissions`.`id` \
                    AND  `students`.`id` = ? AND `assignments`.`id` = ? ORDER BY `files`.`id`", [req.user.id, req.params.id], function(err, fileData){
    if(err) {
      render('notFound', {error: 'An unexpected error has occurred.'}, res);
      throw err;
    } else if(fileData.length == 0) {
      render('assignment', {title: req.assignment.name, assignment: req.assignment}, res);
    } else {
      for(file in fileData) {
        fileData[file].display = fileData[file].contents.length <= 4096 || fileData[file].compiled;
      }
      // Sends file data
      render('assignmentComplete', {title: req.assignment.name, assignment: req.assignment, fileData: fileData}, res);
    }
  });
});

router.use('/:id/submit', multer({
  inMemory: false,
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

// Submits the file into the mysql database
router.post('/:id/submit', function(req, res) {
  if(req.files) {

    // first, check all the file names for legality
    for(file in req.files) {
      if(!/^[a-zA-Z0-9.]+$/.test(req.files[file].name) || req.files[file].name.length < 6) { // if the name contains anything besides alphanumerical characters and periods or is too short (less than 6 chars)
        res.json({code: 2}); // invalid name
        return; // just stop
      }
      for(file2 in req.files) {
        if(file2 == file) continue;
        if(req.files[file].name == req.files[file2].name) {
          res.json({code: 5}); // duplicate names
          return; // just stop
        }
      }
    }

    // now, check to see if this student already submitted this assignment
    connection.query("SELECT `id` FROM `submissions` WHERE `student_id` = ? AND `assignment_id` = ?", [req.user.id, req.params.id], function(err, submissions) {
      if(err) {
        res.json({code: -1}); // unknown error
        throw err;
      } else if(submissions.length > 0) {
        res.json({code: 3}); // already submitted this assignment
      } else {

        var toCompile = "";
        for(file in req.files) {
          req.files[file].isJava = req.files[file].path.substr(req.files[file].path.length-4).toLowerCase() == 'java';
          if(req.files[file].isJava) toCompile += req.files[file].path + " ";
        }

        if(!toCompile) {
          res.json({code: 4}); // must have at least one java file
          return; // easier than another if/else
        }

        // compile the java files
        exec("javac " + toCompile, function(err, stdout, stderr) {
          if(err) {
            // clean up
            fs.remove('./uploads/' + req.user.id + '/', function(err) {
              res.json({code: 1}); // code can't compile
            });
          } else {

            // finally, make necessary changes in database
            connection.query("INSERT INTO `submissions` VALUES(NULL, ?, ?, NOW(), NULL)", [req.params.id, req.user.id], function(err, result) {
              if(err) {
                res.json({code: -1}); // unknown error
                throw err;
              } else {

                var args = [];
                var stmt = "";
                for(file in req.files) {
                  // read java and class data into variables
                  var javaData = fs.readFileSync(req.files[file].path);
                  var classData = req.files[file].isJava ? fs.readFileSync(req.files[file].path.substr(0, req.files[file].path.length-4) + 'class') : null;

                  stmt += "(NULL,?,?,?,?),";
                  args.push(result.insertId);
                  args.push(req.files[file].name);
                  args.push(javaData);
                  args.push(classData);
                }
                stmt = stmt.substr(0, stmt.length-1); // remove last character from stmt (extraneous comma)
                connection.query("INSERT INTO `files` VALUES" + stmt, args, function(err, result) {
                  if(err) {
                    fs.removeSync('./uploads/' + req.user.id + '/'); // we must cleanup, even on error
                    res.json({code: -1}); // unknown error
                    throw err;
                  } else {
                    // clean up files used for compilation
                    fs.remove('./uploads/' + req.user.id + '/', function(err) {
                      if(err) {
                        res.json({code: -1}) // unknown error
                        throw err;
                      } else {
                        // TODO check code against test cases
                        res.json({code: 0});
                      }
                    });
                  }
                });

              }
            });

          }
        });

      }
    });

  } else {
    res.json({code: 1}); // no files submitted
  }
});

router.get('/:id/resubmit', function(req,res) {
  connection.query("SELECT `submissions`.`id` \
                    FROM `submissions` \
                    WHERE `submissions`.`student_id` = ? \
                    AND `submissions`.`assignment_id` = ?", [req.user.id, req.params.id], function(err, rows) {
    if(err) {
      res.redirect('/student/assignment');
      throw err;
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
          throw err;
        } else {
          res.redirect('/student/assignment/' + req.params.id);
        }
      });
    }
  });
});

comments.setup(router, 'student');

module.exports = router;
