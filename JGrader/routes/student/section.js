// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

require('../common');
var router = express.Router();

var render = function(page, options, res) {
  options.page = 0;
  switch(page) {
    case 'notFound':
      options.title = 'Section Not Found';
      options.type = 'section';
      break;
    case 'sectionList':
      options.title = 'Your Sections';
      options.js = ['tooltip', 'student/sectionList'];
      options.css = ['font-awesome.min'];
      break;
    case 'section':
      // title should already be set
      options.js = ['tooltip', 'student/sectionList'];
      options.css = ['font-awesome.min'];
      break;
    case 'joinSection':
      options.title = 'Join a Section';
      break;
  }
  renderGenericStudent(page, options, res);
}

// Lists all of the current sections (classes)
router.get('/', function(req, res) {
  findSectionInfo(req.user.id, res, function(rows) {
    render('sectionList', {rows: rows}, res);
  });
});

var findSectionInfo = function(id, res, finish) {
  if(id){
    connection.query("SELECT `sections`.`name`,`teachers`.`fname`,`teachers`.`lname`,`sections`.`id` FROM `enrollment`,`sections`,`teachers` WHERE `enrollment`.`section_id` = `sections`.`id` AND `sections`.`teacher_id` = `teachers`.`id` AND `enrollment`.`student_id` = ?", [id], function(err, rows) {
      if(err) {
        render('notFound', {error: 'An unexpected error has occurred.'}, res);
        throw err;
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
router.post('/joinSection', function(req, res) {
  var sectionID = req.params.sectionID;
  if(isSet(sectionID)) {
    connection.query("SELECT `id` FROM `sections` WHERE `code` = ?", [sectionID], function(err, rows) {
      if(err) {
        render('joinSection', {error: 'An unknown error has occurred.'}, res);
        throw err;
      } else if(rows.length <= 0) {
        render('joinSection', {error: 'That is not a valid section code.'}, res);
      } else {
        connection.query("INSERT INTO `enrollment` VALUES(?, ?)", [rows[0].id, req.user.id], function(err, result) {
          if(err) {
            render('joinSection', {error: 'An unknown error has occurred.'}, res);
            throw err;
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

// Gets information for specific class
router.get('/:id', function(req, res) {
  var sectionID = req.params.id;
  connection.query("SELECT `sections`.`name` FROM `sections`,`enrollment` WHERE `sections`.`id` = ? AND `sections`.`id` = `enrollment`.`section_id` AND `enrollment`.`student_id` = ?", [sectionID, req.user.id], function(err, result) {
    if(err) {
      render('notFound', {error: 'An unexpected error has occurred.'}, res);
      throw err;
    } else if(result.length <= 0) {
      render('notFound', {}, res);
    } else {
      connection.query("SELECT `id`,`name`,`description`,`due` FROM `assignments` WHERE `section_id` = ?", [sectionID], function(err, rows) {
        if(err) {
          render('notFound', {error: 'An unexpected error has occurred.'}, res);
          throw err;
        } else {
          render('section', {name: result[0].name, rows: rows, id: sectionID}, res);
        }
      });
    }
  });
});

// drop a class
router.get('/:id/delete', function(req, res) {
  connection.query("DELETE FROM `enrollment` WHERE `section_id` = ? and `student_id` = ? LIMIT 1; DELETE `submissions`,`files` FROM `submissions` JOIN `files` ON `submissions`.`id` = `files`.`submission_id` WHERE `student_id` = ?", [req.params.id, req.user.id, req.user.id], function(err) {
    if(err) throw err;
    res.redirect('/student/section');
  });
});

module.exports = router;
