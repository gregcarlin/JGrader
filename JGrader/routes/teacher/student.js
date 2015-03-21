// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

require('../common');
var router = express.Router();
var strftime = require('strftime');

var render = function(page, options, res) {
  options.page = 2;
  switch(page) {
    case 'notFound':
      options.title = 'Student Not Found';
      options.type = 'student';
      break;
    case 'studentList':
      options.title = 'Your Students';
      options.js = ['tooltip', 'teacher/studentList', 'stupidtable.min', 'tablesort'];
      options.css = ['font-awesome.min'];
      break;
    case 'student':
      // title must be set already
      options.js = ['tooltip', 'stupidtable.min', 'tablesort'];
      options.css = ['font-awesome.min'];
      options.strftime = strftime;
      break;
  }
  renderGenericTeacher(page, options, res);
}

router.get('/', function(req, res) {
  connection.query("SELECT \
                      `students`.`id`,\
                      `students`.`fname`,\
                      `students`.`lname`,\
                      `sections`.`id` AS `sid`,\
                      `sections`.`name` AS `sname`,\
                      `temp3`.`name` AS `aname`,\
                      `temp3`.`subid`,\
                      `temp4`.`avg` \
                    FROM \
                      `students` \
                      JOIN `enrollment` ON `students`.`id` = `enrollment`.`student_id` \
                      JOIN `sections` ON `sections`.`id` = `enrollment`.`section_id` \
                      LEFT JOIN \
                        (SELECT `temp2`.* FROM \
                          (SELECT `student_id`,`assignments`.`section_id`,MAX(`submitted`) AS `max` \
                            FROM `submissions` JOIN `assignments` ON `submissions`.`assignment_id` = `assignments`.`id` \
                            WHERE TEACHER_OWNS_ASSIGNMENT(?,`assignments`.`id`) \
                            GROUP BY `student_id`,`assignments`.`section_id`) AS `temp` \
                          JOIN \
                          (SELECT `submissions`.`student_id`,`assignments`.`section_id`,`submissions`.`submitted`,`assignments`.`name`,`assignments`.`id`,`submissions`.`id` AS `subid` \
                            FROM `submissions` JOIN `assignments` ON `submissions`.`assignment_id` = `assignments`.`id`) AS `temp2` \
                          ON `temp`.`student_id` = `temp2`.`student_id` AND `temp`.`section_id` = `temp2`.`section_id` AND `temp2`.`submitted` = `temp`.`max`) AS `temp3` \
                      ON `temp3`.`student_id` = `students`.`id` AND `temp3`.`section_id` = `sections`.`id` \
                      LEFT JOIN \
                        (SELECT `submissions`.`id`,`submissions`.`student_id`,AVG(`submissions`.`grade`) AS `avg`,`assignments`.`section_id` \
                          FROM `submissions` JOIN `assignments` ON `submissions`.`assignment_id` = `assignments`.`id` \
                          WHERE TEACHER_OWNS_ASSIGNMENT(?,`assignment_id`) \
                          GROUP BY `student_id`,`section_id`) AS `temp4` \
                      ON `students`.`id` = `temp4`.`student_id` AND `sections`.`id` = `temp4`.`section_id` \
                    WHERE `sections`.`teacher_id` = ?", [req.user.id, req.user.id, req.user.id], function(err, rows) {
    if(err) {
      render('notFound', {error: 'An unexpected error has occurred.'}, res);
      throw err;
    } else {
      render('studentList', {rows: rows}, res);
    }
  });
});

router.use('/:id', function(req, res, next) {
  connection.query({
      sql: "SELECT `students`.*,`sections`.* FROM `students` JOIN `enrollment` ON `students`.`id` = `enrollment`.`student_id` JOIN `sections` ON `enrollment`.`section_id` = `sections`.`id` WHERE `students`.`id` = ? AND `sections`.`teacher_id` = ?",
      nestTables: true,
      values: [req.params.id, req.user.id]
    }, function(err, result) {
      if(err) {
        render('notFound', {error: 'An unexpected error has occurred.'}, res);
        throw err;
      } else if(result.length <= 0) {
        render('notFound', {}, res);
      } else {
        console.log(result);
        req.student = result[0].students;
        req.sections = [];
        for(i in result) {
          req.sections[i] = result[i].sections;
        }
        next();
      }
    });
});

router.get('/:id.csv', function(req, res) {
  connection.query("SELECT \
                      `assignments`.`name`,\
                      `sections`.`name` AS `sname`,\
                      `submissions`.`id`,\
                      `submissions`.`grade` \
                    FROM \
                      `assignments` \
                      JOIN `sections` ON `assignments`.`section_id` = `sections`.`id` \
                      JOIN `enrollment` ON `enrollment`.`section_id` = `sections`.`id` \
                      LEFT JOIN `submissions` ON `submissions`.`assignment_id` = `assignments`.`id` AND `submissions`.`student_id` = `enrollment`.`student_id` \
                    WHERE `enrollment`.`student_id` = ? AND `sections`.`teacher_id` = ?", [req.params.id, req.user.id], function(err, rows) {
    res.setHeader('Content-Disposition', 'attachment; filename=student_' + req.params.id + '.csv');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Descrption', 'File Transfer');
    var output = 'Assignment,Section,Grade\n';
    for(i in rows) {
      output += rows[i].name + ',' + rows[i].sname + ',' + (rows[i].grade ? rows[i].grade : (rows[i].id ? 'Not Graded' : 'Not Submitted')) + '\n';
    }
    res.send(output);
  });
});

router.get('/:id', function(req, res) {
  connection.query("SELECT \
                      `submissions`.`id`,\
                      `submissions`.`grade`,\
                      `submissions`.`submitted`,\
                      `assignments`.`name`,\
                      `assignments`.`due`,\
                      `sections`.`name` AS `sname`,\
                      `sections`.`id` AS `sid` \
                    FROM \
                      `assignments` \
                      JOIN `sections` ON `assignments`.`section_id` = `sections`.`id` \
                      JOIN `enrollment` ON `enrollment`.`section_id` = `sections`.`id` \
                      LEFT JOIN `submissions` ON `assignments`.`id` = `submissions`.`assignment_id` AND `submissions`.`student_id` = `enrollment`.`student_id` \
                    WHERE `enrollment`.`student_id` = ? AND `sections`.`teacher_id` = ?", [req.params.id, req.user.id], function(err, rows) {
    if(err) {
      render('notFound', {error: 'An unexpected error has occurred.'}, res);
      throw err;
    } else {
      var name = req.student.fname + ' ' + req.student.lname;
      render('student', {title: name, name: name, rows: rows, id: req.params.id}, res);
    }
  });
});

router.get('/:id/:section/delete', function(req, res) {
  connection.query("DELETE `enrollment`,`submissions`,`files` \
                    FROM \
                      `enrollment` \
                      JOIN `sections` ON `enrollment`.`section_id` = `sections`.`id` \
                      LEFT JOIN `assignments` ON `assignments`.`section_id` = `sections`.`id` \
                      LEFT JOIN `submissions` ON `submissions`.`assignment_id` = `assignments`.`id` \
                      LEFT JOIN `files` ON `files`.`submission_id` = `submissions`.`id` \
                    WHERE \
                      `enrollment`.`student_id` = ? AND \
                      `enrollment`.`section_id` = ? AND \
                      `sections`.`teacher_id` = ?", [req.params.id, req.params.section, req.user.id], function(err, result) {
    if(err) {
      render('notFound', {error: 'Unable to remove student. Please go back and try again.'}, res);
      throw err;
    } else {
      res.redirect('/teacher/student');
    }
  });
});

module.exports = router;
