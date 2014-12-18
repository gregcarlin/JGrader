require('./common');
var router = express.Router();
var strftime = require('strftime');

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
        renderGenericTeacher('sectionList', { js:['tooltip'], page: 0, title: 'Your Sections', rows: [], error: 'An unexpected error has occurred.' }, res);
        if(debug) throw err;
      } else {
        renderGenericTeacher('sectionList', { js:['tooltip'], page: 0, title: 'Your Sections', rows: rows }, res);
      }
    });
  });
});

// page for creating a new section
router.get('/section/create', function(req, res) {
  authTeacher(req.cookies.hash, res, function(id) {
    renderGenericTeacher('sectionCreate', { page: 0, title: 'Create a Section' }, res);
  });
});

// handles request to create a section
router.post('/section/create', function(req, res) {
  authTeacher(req.cookies.hash, res, function(id) {
    var name = req.param('name');
    if(!name || name.length <= 0) {
      renderGenericTeacher('sectionCreate', { page: 0, title: 'Create a Section', error: 'Name cannot be blank.', name: name }, res);
    } else {
      connection.query("INSERT INTO `sections` VALUES(NULL, ?, ?); SELECT LAST_INSERT_ID()", [id, name], function(err, rows) {
        if(err || rows.length <= 0) {
          renderGenericTeacher('sectionCreate', { page: 0, title: 'Create a Section', error: 'An unknown error has occurred. Please try again later.', name: name }, res);
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
          renderGenericTeacher('notFound', { page: 0, title: 'Section Not Found', type: 'section' }, res);
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
              renderGenericTeacher('notFound', { page: 0, title: 'Error getting section', type: 'section' }, res);
              if(debug) throw err;
            } else {
              renderGenericTeacher('section', { js: ['tooltip'], page: 0, title: rows[0].name, sectionName: rows[0].name, sectionID: sectionID, rows: results, strftime: strftime }, res);
            }
          });
        }
      });
    } else {
      renderGenericTeacher('notFound', { page: 0, title: 'Section Not Found', type: 'section' }, res);
    }
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
        renderGenericTeacher('assignmentList', { js:['tooltip'], page: 1, title: 'Your Assignments', rows: [], strftime: strftime, error: 'An unexpected error has occurred.' }, res);
        if(debug) throw err;
      } else {
        renderGenericTeacher('assignmentList', { js:['tooltip'], page: 1, title: 'Your Assignments', rows: rows, strftime: strftime }, res);
      }
    });
  });
});

var assignmentCreate = function(req, res) {
  authTeacher(req.cookies.hash, res, function(id) {
    connection.query("SELECT `id`,`name` FROM `sections` WHERE `teacher_id` = ? ORDER BY `name` ASC", [id], function(err, rows) {
      if(err) {
        renderGenericTeacher('assignmentCreate', { js: ['jquery.datetimepicker', 'datepicker'], css: ['jquery.datetimepicker'], page: 1, title: 'Create an Assignment', error: 'An unexpected error has occurred.', rows: [] }, res);
        if(debug) throw err;
      } else if(rows.length <= 0) {
        renderGenericTeacher('assignmentCreate', { js: ['jquery.datetimepicker', 'datepicker'], css: ['jquery.datetimepicker'], page: 1, title: 'Create an Assignment', error: 'You must create a section before you can create an assignment.', rows: [], preselect: req.params.preselect }, res);
      } else {
        renderGenericTeacher('assignmentCreate', { js: ['jquery.datetimepicker', 'datepicker'], css: ['jquery.datetimepicker'], page: 1, title: 'Create an Assignment', rows: rows, preselect: req.params.preselect }, res);
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
      renderGenericTeacher('assignmentCreate', { page: 1, title: 'Create an Assignment', error: 'Name and due date must both be filled out.', name: name, desc: desc, due: due}, res);
    } else if(!secs || secs.length <= 0) {
      renderGenericTeacher('assignmentCreate', { page: 1, title: 'Create an Assignment', error: 'You must select at least one section.', name: name, desc: desc, due: due}, res);
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
      renderGenericTeacher('assignmentCreate', { page: 1, title: 'Create an Assignment', error: 'An unexpected error has occurred.', name: name, desc: desc, due: due }, res);
      if(debug) throw err;
    } else if(!rows[0].result) {
      renderGenericTeacher('assignmentCreate', { page: 1, title: 'Create an Assignment', error: 'An unexpected error has occurred.', name: name, desc: desc, due: due }, res);
    } else {
      if(!desc || desc.length <= 0) desc = null;
      connection.query("INSERT INTO `assignments` VALUES(NULL, ?, ?, ?, ?)", [sectionID, name, desc, due], function(err, rows) {
        if(err) {
          renderGenericTeacher('assignmentCreate', { page: 1, title: 'Create an Assignment', error: 'Invalid due date.', name: name, desc: desc, due: due}, res); // probably an invalid due date. i think.
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
        renderGenericTeacher('notFound', { page: 1, title: 'Error Getting Assignment', type: 'assignment', error: 'An unexpected error has occurred.'}, res);
        if(debug) throw err;
      } else if(rows.length <= 0) {
        renderGenericTeacher('notFound', { page: 1, title: 'Assignment Not Found', type: 'assignment' }, res);
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
          renderGenericTeacher('assignment', { page: 1, title: rows[0].name, assignment: rows[0], strftime: strftime, results: results }, res);
        });
      }
    });
  });
});

router.get('/submission/:id', function(req, res) {
  authTeacher(req.cookies.hash, res, function(teacherID) {
    // todo security to ensure this teacher owns this assignment
    connection.query("SELECT \
                        `submissions`.`assignment_id`,\
                        `submissions`.`submitted`,\
                        `submissions`.`grade`,\
                        `students`.`id`,\
                        `students`.`fname`,\
                        `students`.`lname`,\
                        `assignments`.`id` AS `aid`,\
                        `assignments`.`name` \
                      FROM `submissions`,`students`,`assignments` \
                      WHERE \
                        `students`.`id` = `submissions`.`student_id` AND \
                        `assignments`.`id` = `submissions`.`assignment_id` AND \
                        `submissions`.`id` = ?", [req.params.id], function(err, subData) {
      if(err) {
        renderGenericTeacher('notFound', { page: 1, title: 'Submission Not Found', type: 'submission', error: 'An unexpected error has occurred.' }, res);
        if(debug) throw err;
      } else if(subData.length <= 0) {
        renderGenericTeacher('notFound', { page: 1, title: 'Submission Not Found', type: 'submission' }, res);
      } else {
        connection.query("SELECT `id`,`name`,`contents` FROM `files` WHERE `submission_id` = ?", [req.params.id], function(err, fileData) {
          if(err) {
            throw err; // todo improve
          } else {
            renderGenericTeacher('submission', { js: ['prettify', 'submission'], css: ['prettify'], onload: 'prettyPrint()', page: 1, title: subData[0].fname + ' ' + subData[0].lname + "'s submission to " + subData[0].name, subData: subData[0], fileData: fileData, strftime: strftime }, res);
          }
        });
      }
    });
  });
});

router.post('/submission/:id/updategrade/:grade', function(req, res) {
  authTeacher(req.cookies.hash, res, function(teacherID) {
    // todo security to ensure this teacher owns this assignment
    if(isNaN(req.params.grade)) {
      res.send('1');
    } else {
      connection.query("UPDATE `submissions` SET `grade` = ? WHERE `id` = ?", [req.params.grade, req.params.id], function(err) {
        if(err) {
          res.send('-1');
        } else {
          res.send('0');
        }
      });
    }
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
      renderGenericTeacher('studentList', { page: 2, title: 'Your Students', rows: rows }, res);
    });
  });
});

module.exports = router;