// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

require('../common');
var router = express.Router();
var strftime = require('strftime');

var render = function(page, options, res) {
  options.page = 0;
  switch(page) {
    case 'notFound':
      options.title = 'Class Not Found';
      options.type = 'class';
      break;
    case 'sectionList':
      options.title = 'Your Classes';
      options.js = ['tooltip', 'student/sectionList'];
      options.css = ['font-awesome.min'];
      break;
    case 'section':
      // title should already be set
      options.js = ['tooltip', 'student/sectionList'];
      options.css = ['font-awesome.min'];
      options.strftime = strftime;
      break;
    case 'joinSection':
      options.title = 'Join a Class';
      break;
  }
  renderGenericStudent(page, options, res);
}

// Lists all of the current sections (classes)
router.get('/', function(req, res, next) {
  findSectionInfo(req.user.id, res, next, function(rows) {
    render('sectionList', {rows: rows}, res);
  });
});

var findSectionInfo = function(id, res, next, finish) {
  if(id){
    connection.query("SELECT \
                        `sections`.`name`,\
                        `teachers`.`fname`,\
                        `teachers`.`lname`,\
                        `sections`.`id` \
                      FROM \
                        `enrollment`,\
                        `sections`,\
                        `teachers` \
                      WHERE \
                        `enrollment`.`section_id` = `sections`.`id` AND \
                        `sections`.`teacher_id` = `teachers`.`id` AND \
                        `enrollment`.`student_id` = ?", [id], function(err, rows) {
      if(err) {
        render('notFound', {error: 'An unexpected error has occurred.'}, res);
        err.handled = true;
        next(err);
      } else {
        finish(rows);
      }
    });
  }
}

// Asks user for class password
router.get('/joinSection', function(req, res) {
  render('joinSection', {}, res);
});

// Joins Class
router.post('/joinSection', function(req, res, next) {
  var sectionID = req.body.sectionID;
  if(isSet(sectionID)) {
    connection.query("SELECT `id` FROM `sections` WHERE `code` = ?", [sectionID], function(err, rows) {
      if(err) {
        render('joinSection', {error: 'An unknown error has occurred.'}, res);
        err.handled = true;
        next(err);
      } else if(rows.length <= 0) {
        render('joinSection', {error: 'That is not a valid class code.'}, res);
      } else {
        connection.query("INSERT INTO `enrollment` VALUES(?, ?)", [rows[0].id, req.user.id], function(err, result) {
          if(err) {
            render('joinSection', {error: 'An unknown error has occurred.'}, res);
            err.handled = true;
            next(err);
          } else {
            res.redirect('/student/section/' + rows[0].id);
          }
        });
      }
    });
  } else {
    render('joinSection', {error: 'You must enter a class code.'}, res);
  }
});

router.use('/:id', function(req, res, next) {
  connection.query("SELECT `sections`.* FROM `sections` JOIN `enrollment` ON `sections`.`id` = `enrollment`.`section_id` WHERE `sections`.`id` = ? AND `enrollment`.`student_id` = ?", [req.params.id, req.user.id], function(err, result) {
    if(err) {
      render('notFound', {error: 'An unexpected error has occurred.'}, res);
      err.handled = true;
      next(err);
    } else if(result.length <= 0) {
      render('notFound', {}, res);
    } else {
      req.section = result[0];
      next();
    }
  });
});

// Gets information for specific class
router.get('/:id', function(req, res, next) {
  connection.query("SELECT \
                      `assignments`.`id`,\
                      `assignments`.`name`,\
                      `assignments`.`description`,\
                      `assignments`.`due`,\
                      `submissions`.`submitted` \
                    FROM \
                      `assignments` \
                      LEFT JOIN `submissions` ON `assignments`.`id` = `submissions`.`assignment_id` AND `submissions`.`student_id` = ? \
                    WHERE `assignments`.`section_id` = ?", [req.user.id, req.params.id], function(err, rows) {
    if(err) {
      render('notFound', {error: 'An unexpected error has occurred.'}, res);
      err.handled = true;
      next(err);
    } else {
      render('section', {name: req.section.name, rows: rows, id: req.params.id}, res);
    }
  });
});

// drop a class
router.get('/:id/delete', function(req, res, next) {
  connection.query("DELETE FROM `enrollment` WHERE `section_id` = ? and `student_id` = ? LIMIT 1; \
                    DELETE \
                      `submissions`,`files` \
                    FROM \
                      `submissions` \
                      JOIN `files` ON `submissions`.`id` = `files`.`submission_id` \
                    WHERE `student_id` = ?", [req.params.id, req.user.id, req.user.id], function(err) {
    if(err) {
      next(err);
    } else {
      res.redirect('/student/section');
    }
  });
});

module.exports = router;
