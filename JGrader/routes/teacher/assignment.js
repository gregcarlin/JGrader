// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

require('../common');
var router = express.Router();
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
      options.js = ['tooltip', 'teacher/assignmentList'];
      options.css = ['font-awesome.min'];
      options.strftime = strftime;
      break;
    case 'assignmentCreate':
      options.title = 'Create an Assignment';
      options.js = ['teacher/jquery.datetimepicker', 'teacher/datepicker'];
      options.css = ['jquery.datetimepicker'];
      break;
    case 'assignment':
      // title must be set already
      options.js = ['tooltip', 'strftime-min', 'teacher/edit', 'teacher/jquery.datetimepicker', 'teacher/datepicker'];
      options.css = ['jquery.datetimepicker', 'font-awesome.min'];
      options.strftime = strftime;
      break;
  }
  renderGenericTeacher(page, options, res);
}

// adapted from http://strongloop.com/strongblog/how-to-generators-node-js-yield-use-cases/
function thunkify (nodefn, context) { // [1]
  return function () { // [2]
    var args = Array.prototype.slice.call(arguments)
    return function (cb) { // [3]
      args.push(cb)
      nodefn.apply(context ? context : this, args)
    }
  }
}

// taken from http://strongloop.com/strongblog/how-to-generators-node-js-yield-use-cases/
function run (genFn) {
  var gen = genFn() // [1]
  next() // [2]
 
  function next (er, value) { // [3]
    if (er) return gen.throw(er)
    var continuable = gen.next(value) 

    if (continuable.done) return // [4]
    var cbFn = continuable.value // [5]
    cbFn(next)
  }
}

var query = thunkify(connection.query, connection);

// page that lists assignments
router.get('/', function(req, res) {
  run(function* () {
    try {
      var result = yield query("SELECT \
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
                                  `sections`.`name` ASC", [req.user.id]);
      render('assignmentList', {rows: result}, res);
    } catch (err) {
      render('assignmentList', {rows: [], error: 'An unexpected error has occurred.'}, res);
      throw err;
    }
  });
});

var assignmentCreate = function(req, res) {
  connection.query("SELECT `id`,`name` FROM `sections` WHERE `teacher_id` = ? ORDER BY `name` ASC", [req.user.id], function(err, rows) {
    if(err) {
      render('assignmentCreate', {error: 'An unexpected error has occurred.', rows: []}, res);
      throw err;
    } else if(rows.length <= 0) {
      render('assignmentCreate', {error: 'You must create a section before you can create an assignment.', rows: [], preselect: req.params.preselect}, res);
    } else {
      render('assignmentCreate', {rows: rows, preselect: req.params.preselect}, res);
    }
  });
}

// page for creating a new assignment
router.get('/create', assignmentCreate);

// same as above but one section is already checked
router.get('/create/:preselect', assignmentCreate);

// handles request to create an assignment
router.post('/create', function(req, res) {
  var name = req.body.name;
  var desc = req.body.desc;
  var due  = req.body.due;
  var secs = req.body.section;
  if(!name || name.length <= 0 || !due || due.length <= 0) {
    render('assignmentCreate', {error: 'Name and due date must both be filled out.', name: name, desc: desc, due: due}, res);
  } else if(!secs || secs.length <= 0) {
    render('assignmentCreate', {error: 'You must select at least one section.', name: name, desc: desc, due: due}, res);
  } else {
    for(i in secs) {
      createAssignment(req.user.id, secs[i], res, name, desc, due);
    }
    res.redirect('/teacher/assignment');
  }
});

var createAssignment = function(teacherID, sectionID, res, name, desc, due) {
  // verify that teacher owns this section
  connection.query("SELECT (SELECT `teacher_id` FROM `sections` WHERE `id` = ?) = ? AS `result`", [sectionID, teacherID], function(err, rows) {
    if(err) {
      render('assignmentCreate', {error: 'An unexpected error has occurred.', name: name, desc: desc, due: due}, res);
      throw err;
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

router.get('/:id.csv', function(req, res) {
  connection.query("SELECT \
                      `students`.`fname`,\
                      `students`.`lname`,\
                      `submissions`.`grade`,\
                      `submissions`.`submitted`,\
                      `assignments`.`due` \
                    FROM \
                      `students` \
                      JOIN `enrollment` ON `enrollment`.`student_id` = `students`.`id` \
                      JOIN `sections` ON `sections`.`id` = `enrollment`.`section_id` \
                      JOIN `assignments` ON `assignments`.`section_id` = `sections`.`id` \
                      LEFT JOIN `submissions` ON `submissions`.`assignment_id` = `assignments`.`id` AND `submissions`.`student_id` = `students`.`id` \
                      WHERE `assignments`.`id` = ?", [req.params.id], function(err, rows) {
    res.setHeader('Content-Disposition', 'attachment; filename=assignment_' + req.params.id + '.csv');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Descrption', 'File Transfer');
    var output = 'Student,Submitted,Grade,Late\n';
    for(i in rows) {
      output += rows[i].fname + ' ' + rows[i].lname + ',' + (rows[i].submitted ? 'Yes' : 'No') + ',' + (rows[i].grade ? rows[i].grade : 'None') + ',' + (rows[i].submitted ? (rows[i].submitted > rows[i].due ? 'Yes' : 'No') : (rows[i].due > Date.now() ? 'Yes' : 'Not Yet')) + '\n';
    }
    res.send(output);
  });
});

router.get('/:id', function(req, res) {
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
                      `assignments`.`id` = ?", [req.user.id, req.params.id], function(err, rows) {
    if(err) {
      render('notFound', {error: 'An unexpected error has occurred.'}, res);
      throw err;
    } else if(rows.length <= 0) {
      render('notFound', {}, res);
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
        render('assignment', {title: rows[0].name, assignment: rows[0], results: results, id: req.params.id}, res);
      });
    }
  });
});

// update description
router.post('/:id/updatedesc/:desc', function(req, res) {
  if(req.params.desc.startsWith('<em>')) {
    res.json({code: 1}); // invalid input
  } else {
    connection.query("UPDATE `assignments` SET `description` = ? WHERE `id` = ? AND TEACHER_OWNS_ASSIGNMENT(?,`assignments`.`id`)", [req.params.desc, req.params.id, req.user.id], function(err, rows) {
      if(err) {
        res.json({code: -1}); // unknown error
        throw err;
      } else if(rows.affectedRows <= 0) {
        res.json({code: 2}); // invalid permissions
      } else {
        res.json({code: 0, newValue: req.params.desc}); // success
      }
    });
  }
});

// update description to nothing
router.post('/:id/updatedesc', function(req, res) {
  connection.query("UPDATE `assignments` SET `description` = NULL WHERE `id` = ? AND TEACHER_OWNS_ASSIGNMENT(?,`assignments`.`id`)", [req.params.id, req.user.id], function(err, rows) {
    if(err) {
      res.json({code: -1}); // unknown error
      throw err;
    } else if(rows.affectedRows <= 0) {
      res.json({code: 2}); // invalid permissions
    } else {
      res.json({code: 0, newValue: ''}); // success
    }
  });
});

router.post('/:id/updatedue/:due', function(req, res) {
  connection.query("UPDATE `assignments` SET `due` = ? WHERE `id` = ? AND TEACHER_OWNS_ASSIGNMENT(?,`assignments`.`id`)", [req.params.due, req.params.id, req.user.id], function(err, rows) {
    if(err) {
      res.json({code: -1}); // unknown error
      throw err;
    } else if(rows.affectedRows <= 0) {
      res.json({code: 2}); // invalid permissions
    } else {
      res.json({code: 0, newValue: req.params.due});
    }
  });
});

router.get('/:id/delete', function(req, res) {
  connection.query('DELETE FROM `assignments` WHERE `id` = ? AND TEACHER_OWNS_ASSIGNMENT(?,`id`) LIMIT 1', [req.params.id, req.user.id], function(err, rows) {
    if(err) {
      render('notFound', {error: 'Unable to delete assignment. Please go back and try again.'}, res);
      throw err;
    } else if(rows.affectedRows <= 0) {
      render('notFound', {error: 'You are not allowed to delete that assignment.'}, res);
    } else {
      connection.query("DELETE FROM `submissions` JOIN `files` ON `files`.`submission_id` = `submissions`.`id` WHERE `submissions`.`assignment_id` = ?", [req.params.id], function(err) {
        if(err) {
          render('notFound', {error: 'Unable to delete assignment. Please go back and try again.'}, res);
          throw err;
        }
        res.redirect('/teacher/assignment');
      });
    }
  });
  /*query("DELETE FROM `assignments` WHERE `id` = ? AND TEACHER_OWNS_ASSIGNMENT(?,`id`) LIMIT 1", [req.params.id, req.user.id]).
  then(function(rows) {
    
  });*/
});

module.exports = router;
