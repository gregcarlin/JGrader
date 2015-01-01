require('./common');
var router = express.Router();
var strftime = require('strftime');

var render = function(page, options, res) {
  switch(page) {
    case 'notFound':
      // page must be set already
      options.title = options.type.charAt(0).toUpperCase() + options.type.slice(1) + ' Not Found';
      break;
    case 'sectionList':
      options.page = 0;
      options.title = 'Your Sections';
      options.js = ['tooltip'];
      break;
    case 'sectionCreate':
      options.page = 0;
      options.title = 'Create a Section';
      break;
    case 'section':
      options.page = 0;
      // title must be set already
      options.js = ['tooltip', 'teacher/edit'];
      options.strftime = strftime;
      break;
    case 'assignmentList':
      options.page = 1;
      options.title = 'Your Assignments';
      options.js = ['tooltip'];
      options.strftime = strftime;
      break;
    case 'assignmentCreate':
      options.page = 1;
      options.title = 'Create an Assignment';
      options.js = ['teacher/jquery.datetimepicker', 'teacher/datepicker'];
      options.css = ['jquery.datetimepicker'];
      break;
    case 'assignment':
      options.page = 1;
      // title must be set already
      options.js = ['tooltip', 'teacher/edit', 'teacher/jquery.datetimepicker', 'teacher/datepicker'];
      options.css = ['jquery.datetimepicker'];
      options.strftime = strftime;
      break;
    case 'submission':
      options.page = 1;
      // title must be set already
      options.js = ['prettify', 'teacher/submission', 'tooltip', 'teacher/edit'];
      options.css = ['prettify'];
      options.onload = 'prettyPrint()';
      options.strftime = strftime;
      break;
    case 'studentList':
      options.page = 2;
      options.title = 'Your Students';
      break;
    case 'settings':
      options.page = -1;
      options.title = 'Settings';
      break;
  }
  renderGenericTeacher(page, options, res);
}

// main teacher page, redirects to section list
router.get('/', function(req, res) {
  res.redirect('/teacher/section'); // redirect to section list
});

// page for listing sections
router.get('/section', function(req, res) {
  authTeacher(req.cookies.hash, res, function(id) {
    connection.query("SELECT \
                        `sections`.`name`,\
                        `sections`.`id`,\
                        COUNT(`enrollment`.`student_id`) AS `count`,\
                        `assignments`.`name` AS `aname`,\
                        `assignments`.`id` AS `aid`\
                      FROM `sections` \
                      LEFT JOIN `enrollment` ON `sections`.`id` = `enrollment`.`section_id` \
                      LEFT JOIN `assignments` ON `assignments`.`section_id` = `sections`.`id` \
                      AND `assignments`.`due` = \
                        (SELECT MIN(`due`) FROM `assignments` WHERE `section_id` = `sections`.`id` AND `due` > NOW()) \
                      WHERE `sections`.`teacher_id` = ? \
                      GROUP BY `sections`.`id` \
                      ORDER BY `sections`.`name` ASC", [id], function(err, rows) {
      if(err) {
        render('sectionList', {rows: [], error: 'An unexpected error has occurred.'}, res);
        if(debug) throw err;
      } else {
        render('sectionList', {rows: rows}, res);
      }
    });
  });
});

// page for creating a new section
router.get('/section/create', function(req, res) {
  authTeacher(req.cookies.hash, res, function(id) {
    render('sectionCreate', {}, res);
  });
});

// handles request to create a section
router.post('/section/create', function(req, res) {
  authTeacher(req.cookies.hash, res, function(id) {
    var name = req.param('name');
    if(!name || name.length <= 0) {
      render('sectionCreate', {error: 'Name cannot be blank.', name: name}, res);
    } else {
      connection.query("INSERT INTO `sections` VALUES(NULL, ?, ?, LEFT(UUID(), 5)); SELECT LAST_INSERT_ID()", [id, name], function(err, rows) {
        if(err || rows.length <= 0) {
          render('sectionCreate', {error: 'An unknown error has occurred. Please try again later.', name: name}, res);
        } else {
          res.redirect('/teacher/section/' + rows[1][0]["LAST_INSERT_ID()"]); // redirect teacher to page of newly created section
        }
      });
    }
  });
});

// page providing info on a specific section
router.get('/section/:id', function(req, res) {
  authTeacher(req.cookies.hash, res, function(teacherID) {
    var sectionID = req.params.id;
    if(sectionID && sectionID.length > 0) {
      connection.query("SELECT * FROM `sections` WHERE `id` = ? AND `teacher_id` = ?", [sectionID, teacherID], function(err, rows) {
        if(err || rows.length <= 0) {
          render('notFound', {page: 0, type: 'section'}, res);
        } else {
          connection.query("SELECT \
                              `assignments`.`id` AS `aid`,\
                              `assignments`.`name` AS `aname`,\
                              `assignments`.`due`,\
                              COUNT(DISTINCT(`enrollment`.`student_id`)) AS `total`,\
                              COUNT(DISTINCT(`submissions`.`student_id`)) AS `complete`,\
                              COUNT(DISTINCT(`submissions`.`grade`)) AS `graded`\
                            FROM `assignments` \
                            LEFT JOIN `enrollment` ON `enrollment`.`section_id` = ? \
                            LEFT JOIN `submissions` ON `submissions`.`assignment_id` = `assignments`.`id` \
                            WHERE `assignments`.`section_id` = ? \
                            GROUP BY `assignments`.`id` \
                            ORDER BY \
                              `assignments`.`due` DESC, \
                              `assignments`.`name` ASC", [sectionID, sectionID], function(err, results) {
            if(err) {
              render('notFound', {page: 0, error: 'Error getting section', type: 'section'}, res);
              if(debug) throw err;
            } else {
              render('section', {title: rows[0].name, sectionName: rows[0].name, sectionID: sectionID, sectionCode: rows[0].code, rows: results}, res);
            }
          });
        }
      });
    } else {
      render('notFound', {page: 0, type: 'section'}, res);
    }
    });
});

router.post('/section/:id/updatename/:name', function(req, res) {
  authTeacher(req.cookies.hash, res, function(teacherID) {
    connection.query("UPDATE `sections` SET `name` = ? WHERE `id` = ? AND `teacher_id` = ?", [req.params.name, req.params.id, teacherID], function(err, rows) {
      if(err) {
        res.json({code: -1}); // unknown error
        if(debug) throw err;
      } else if(rows.affectedRows <= 0) {
        res.json({code: 2}); // no permission
      } else {
        res.json({code: 0, newValue: req.params.name});
      }
    });
  });
});

// page that lists assignments
router.get('/assignment', function(req, res) {
  authTeacher(req.cookies.hash, res, function(id) {
    connection.query("SELECT \
                        `assignments`.`id` AS `aid`,\
                        `assignments`.`name` AS `aname`,\
                        `assignments`.`due`,\
                        `sections`.`id` AS `sid`,\
                        `sections`.`name` AS `sname`,\
                        COUNT(DISTINCT(`enrollment`.`student_id`)) AS `total`,\
                        COUNT(DISTINCT(`submissions`.`student_id`)) AS `complete`,\
                        COUNT(DISTINCT(`submissions`.`grade`)) AS `graded`\
                      FROM `assignments` \
                      JOIN `sections` ON `sections`.`id` = `assignments`.`section_id` \
                      LEFT JOIN `enrollment` ON `sections`.`id` = `enrollment`.`section_id` \
                      LEFT JOIN `submissions` ON `submissions`.`assignment_id` = `assignments`.`id` \
                      WHERE `sections`.`teacher_id` = ? \
                      GROUP BY `assignments`.`id` \
                      ORDER BY \
                        `assignments`.`due` DESC, \
                        `assignments`.`name` ASC, \
                        `sections`.`name` ASC", [id], function(err, rows) {
      if(err) {
        render('assignmentList', {rows: [], error: 'An unexpected error has occurred.'}, res);
        if(debug) throw err;
      } else {
        render('assignmentList', {rows: rows}, res);
      }
    });
  });
});

var assignmentCreate = function(req, res) {
  authTeacher(req.cookies.hash, res, function(id) {
    connection.query("SELECT `id`,`name` FROM `sections` WHERE `teacher_id` = ? ORDER BY `name` ASC", [id], function(err, rows) {
      if(err) {
        render('assignmentCreate', {error: 'An unexpected error has occurred.', rows: []}, res);
        if(debug) throw err;
      } else if(rows.length <= 0) {
        render('assignmentCreate', {error: 'You must create a section before you can create an assignment.', rows: [], preselect: req.params.preselect}, res);
      } else {
        render('assignmentCreate', {rows: rows, preselect: req.params.preselect}, res);
      }
    });
  });
}

// page for creating a new assignment
router.get('/assignment/create', assignmentCreate);

// same as above but one section is already checked
router.get('/assignment/create/:preselect', assignmentCreate);

// handles request to create an assignment
router.post('/assignment/create', function(req, res) {
  authTeacher(req.cookies.hash, res, function(id) {
    var name = req.param('name');
    var desc = req.param('desc');
    var due  = req.param('due');
    var secs = req.param('section');
    if(!name || name.length <= 0 || !due || due.length <= 0) {
      render('assignmentCreate', {error: 'Name and due date must both be filled out.', name: name, desc: desc, due: due}, res);
    } else if(!secs || secs.length <= 0) {
      render('assignmentCreate', {error: 'You must select at least one section.', name: name, desc: desc, due: due}, res);
    } else {
      for(i in secs) {
        createAssignment(id, secs[i], res, name, desc, due);
      }
      res.redirect('/teacher/assignment');
    }
  });
});

var createAssignment = function(teacherID, sectionID, res, name, desc, due) {
  // verify that teacher owns this section
  connection.query("SELECT (SELECT `teacher_id` FROM `sections` WHERE `id` = ?) = ? AS `result`", [sectionID, teacherID], function(err, rows) {
    if(err) {
      render('assignmentCreate', {error: 'An unexpected error has occurred.', name: name, desc: desc, due: due}, res);
      if(debug) throw err;
    } else if(!rows[0].result) {
      render('assignmentCreate', {error: 'An unexpected error has occurred.', name: name, desc: desc, due: due}, res);
    } else {
      if(!desc || desc.length <= 0) desc = null;
      connection.query("INSERT INTO `assignments` VALUES(NULL, ?, ?, ?, ?)", [sectionID, name, desc, due], function(err, rows) {
        if(err) {
          render('assignmentCreate', {error: 'Invalid due date.', name: name, desc: desc, due: due}, res); // probably an invalid due date. i think.
        }
        // nothing to do here
      });
    }
  });
}

router.get('/assignment/:id', function(req, res) {
  authTeacher(req.cookies.hash, res, function(teacherID) {
    connection.query("SELECT \
                        `assignments`.`id` AS `aid`,\
                        `assignments`.`name`,\
                        `assignments`.`description`,\
                        `assignments`.`due`,\
                        `sections`.`name` AS `sname`,\
                        `sections`.`id` AS `sid` \
                      FROM `assignments`,`sections` \
                      WHERE \
                        `assignments`.`section_id` = `sections`.`id` AND \
                        `sections`.`teacher_id` = ? AND \
                        `assignments`.`id` = ?", [teacherID, req.params.id], function(err, rows) {
      if(err) {
        render('notFound', {page: 1, type: 'assignment', error: 'An unexpected error has occurred.'}, res);
        if(debug) throw err;
      } else if(rows.length <= 0) {
        render('notFound', {page: 1, type: 'assignment'}, res);
      } else {
        connection.query("SELECT \
                            `students`.`id`,\
                            `students`.`fname`,\
                            `students`.`lname`,\
                            `submissions`.`id` AS `subID`,\
                            `submissions`.`submitted` \
                          FROM `enrollment`,`students` \
                          LEFT JOIN \
                            `submissions` ON `submissions`.`student_id` = `students`.`id` AND \
                            `submissions`.`assignment_id` = ? \
                          WHERE \
                            `enrollment`.`student_id` = `students`.`id` AND \
                            `enrollment`.`section_id` = ?", [req.params.id, rows[0].sid], function(err, results) {
          render('assignment', {title: rows[0].name, assignment: rows[0], results: results}, res);
        });
      }
    });
  });
});

router.post('/assignment/:id/updatedesc/:desc', function(req, res) {
  authTeacher(req.cookies.hash, res, function(teacherID) {
    connection.query("UPDATE `assignments` SET `description` = ? WHERE `id` = ? AND TEACHER_OWNS_ASSIGNMENT(?,`assignments`.`id`)", [req.params.desc, req.params.id, teacherID], function(err, rows) {
      if(err) {
        res.json({code: -1}); // unknown error
        if(debug) throw err;
      } else if(rows.affectedRows <= 0) {
        res.json({code: 2}); // invalid permissions
      } else {
        res.json({code: 0, newValue: req.params.desc}); // success
      }
    });
  });
});

router.post('/assignment/:id/updatedue/:due', function(req, res) {
  authTeacher(req.cookies.hash, res, function(teacherID) {
    connection.query("UPDATE `assignments` SET `due` = ? WHERE `id` = ? AND TEACHER_OWNS_ASSIGNMENT(?,`assignments`.`id`)", [req.params.due, req.params.id, teacherID], function(err, rows) {
      if(err) {
        res.json({code: -1}); // unknown error
        if(debug) throw err;
      } else if(rows.affectedRows <= 0) {
        res.json({code: 2}); // invalid permissions
      } else {
        res.json({code: 0, newValue: req.params.due});
      }
    });
  });
});

router.get('/submission/:id', function(req, res) {
  authTeacher(req.cookies.hash, res, function(teacherID) {
    connection.query("SELECT \
                        `submissions`.`assignment_id`,\
                        `submissions`.`submitted`,\
                        `submissions`.`grade`,\
                        `students`.`id`,\
                        `students`.`fname`,\
                        `students`.`lname`,\
                        `assignments`.`id` AS `aid`,\
                        `assignments`.`name` \
                      FROM `submissions`,`students`,`assignments`,`sections` \
                      WHERE \
                        `students`.`id` = `submissions`.`student_id` AND \
                        `assignments`.`id` = `submissions`.`assignment_id` AND \
                        `submissions`.`id` = ? AND \
                        `assignments`.`section_id` = `sections`.`id` AND \
                        `sections`.`teacher_id` = ?", [req.params.id, teacherID], function(err, subData) {
      if(err) {
        render('notFound', {page: 1, type: 'submission', error: 'An unexpected error has occurred.'}, res);
        if(debug) throw err;
      } else if(subData.length <= 0) {
        render('notFound', {page: 1, type: 'submission'}, res);
      } else {
        connection.query("SELECT `id`,`name`,`contents` FROM `files` WHERE `submission_id` = ? ORDER BY `id`", [req.params.id], function(err, fileData) {
          if(err) {
            render('submission', {title: subData[0].fname + ' ' + subData[0].lname = "'s submission to " + subData[0].name, subData: subData[0], fileData: [], error: 'Unable to retrieve file data.'}, res);
            if(debug) throw err;
          } else {
            render('submission', {title: subData[0].fname + ' ' + subData[0].lname + "'s submission to " + subData[0].name, subData: subData[0], fileData: fileData}, res);
          }
        });
      }
    });
  });
});

router.post('/submission/:id/updategrade/:grade', function(req, res) {
  authTeacher(req.cookies.hash, res, function(teacherID) {
    // security to ensure this teacher owns this submission
    connection.query("SELECT `submissions`.`id` FROM `submissions`,`assignments`,`sections` WHERE `submissions`.`assignment_id` = `assignments`.`id` AND `assignments`.`section_id` = `sections`.`id` AND `submissions`.`id` = ? AND `sections`.`teacher_id` = ?", [req.params.id, teacherID], function(err, rows) {
      if(isNaN(req.params.grade)) {
        res.json({code: 1}); // invalid input
      } else if(rows.length <= 0) {
        res.json({code: 2}); // invalid permissions
      } else {
        connection.query("UPDATE `submissions` SET `grade` = ? WHERE `id` = ?", [req.params.grade, req.params.id], function(err) {
          if(err) {
            res.json({code: -1}); // unknown error
          } else {
            res.json({code: 0, newValue: req.params.grade}); // success
          }
        });
      }
    });
  });
});

router.post('/submission/:id/run/:fileIndex', function(req, res) {
  authTeacher(req.cookies.hash, res, function(teacherID) {
    // security to ensure this teacher owns this submission and file
    connection.query("SELECT \
                      `files`.`id`,\
                      `files`.`name`,\
                      `files`.`compiled` \
                    FROM `submissions`,`assignments`,`sections`,`files` \
                    WHERE \
                      `submissions`.`assignment_id` = `assignments`.`id` AND \
                      `assignments`.`section_id` = `sections`.`id` AND \
                      `submissions`.`id` = ? AND \
                      `sections`.`teacher_id` = ? AND \
                      `files`.`submission_id` = `submissions`.`id` \
                    ORDER BY `files`.`id`", [req.params.id, teacherID], function(err, rows) {
      if(rows.length <= 0) {
        res.json({code: 2}); // invalid permissions
      } else {
        fs.mkdir('temp/', function(err) {
          if(err.code != 'EEXIST') throw err;

          for(i in rows) {
            var name = rows[i].name;
            rows[i].className = name.substring(0, name.length - 5);
            // note: working directory seems to be one with app.js in it
            fs.writeFileSync('temp/' + rows[i].className + '.class', rows[i].compiled);
          }

          var fileIndex = req.param('fileIndex');
          if(fileIndex < rows.length) {
            // note: 'nothing' should refer to an actual policy but it doesn't. referring to something that doesn't exist seems to be the same as referring to a policy that grants nothing.
            child = exec('cd temp/ && java -Djava.security.manager -Djava.security.policy==nothing ' + rows[req.param('fileIndex')].className, function(error, stdout, stderr) {
              for(i in rows) {
                fs.unlinkSync('temp/' + rows[i].className + '.class');
              }
              res.json({code: 0, out: stdout, err: stderr});
            });
            child.stdin.write(req.body.stdin);
            child.stdin.end(); // forces java process to end at end of stdin (otherwise it would just wait if more input was needed)
          } else {
            res.json({code: 1}); // invalid input
          }
        });
      }
    });
  });
});

// todo all student stuff
router.get('/student', function(req, res) {
  authTeacher(req.cookies.hash, res, function(teacherID) {
    connection.query("SELECT \
                      `students`.`id`,\
                      `students`.`fname`,\
                      `students`.`lname`,\
                      `sections`.`id` AS `sid`,\
                      `sections`.`name` AS `sname` \
                    FROM \
                      `students`,\
                      `enrollment`,\
                      `sections` \
                    WHERE \
                      `sections`.`teacher_id` = ? AND \
                      `enrollment`.`section_id` = `sections`.`id` AND \
                      `enrollment`.`student_id` = `students`.`id`", [teacherID], function(err, rows) {
      render('studentList', {rows: rows}, res);
    });
  });
});

// settings page
router.get('/settings', function(req, res) {
  authTeacher(req.cookies.hash, res, function(teacherID) {
    connection.query("SELECT `fname`,`lname` FROM `teachers` WHERE `id` = ?", [teacherID], function(err, rows) {
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
  authTeacher(req.cookies.hash, res, function(teacherID) {
    var fname = req.param('fname');
    var lname = req.param('lname');
    if(isSet(fname) && isSet(lname)) {
      var oldPass = req.param('oldpass');
      var newPass = req.param('newpass');
      if(isSet(oldPass) || isSet(newPass)) {
        if(isSet(oldPass) && isSet(newPass)) {
          connection.query("UPDATE `teachers` SET `fname` = ?, `lname` = ?, `pass` = AES_ENCRYPT(?, ?) WHERE `id` = ? AND `pass` = AES_ENCRYPT(?, ?)", [fname, lname, newPass, creds.aes_key, teacherID, oldPass, creds.aes_key], function(err, rows) {
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
        connection.query("UPDATE `teachers` SET `fname` = ?, `lname` = ? WHERE `id` = ?", [fname, lname, teacherID], function(err) {
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