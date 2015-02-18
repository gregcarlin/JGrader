// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

require('./common');
var router = express.Router();
var strftime = require('strftime');

var section    = require('./teacher/section');
var assignment = require('./teacher/assignment');
var submission = require('./teacher/submission');
var student    = require('./teacher/student');

var render = function(page, options, res) {
  options.page = -1;
  switch(page) {
    case 'notFound':
      options.title = options.type.charAt(0).toUpperCase() + options.type.slice(1) + ' Not Found';
      break;
    case 'settings':
      options.title = 'Settings';
      break;
    case 'feedback':
      options.title = 'Feedback';
      options.css = ['feedback'];
      break;
  }
  renderGenericTeacher(page, options, res);
}

// automatically authenticate teacher for every page in this section
router.use(function(req, res, next) {
  authTeacher(req.cookies.hash, res, function(id) {
    req.user = {id: id};
    next();
  });
});

// main teacher page, redirects to section list
router.get('/', function(req, res) {
  res.redirect('/teacher/section'); // redirect to section list
});

router.use('/section', section);

router.get('/assignment.csv', function(req, res) {
  connection.query("SELECT \
                      `assignments`.`name`,\
                      `sections`.`name` AS `sname`,\
                      `students`.`fname`,\
                      `students`.`lname`,\
                      `submissions`.`grade` \
                    FROM \
                      `assignments` \
                      JOIN `sections` ON `assignments`.`section_id` = `sections`.`id` \
                      JOIN `enrollment` ON `enrollment`.`section_id` = `sections`.`id` \
                      JOIN `students` ON `students`.`id` = `enrollment`.`student_id` \
                      LEFT JOIN `submissions` ON `submissions`.`assignment_id` = `assignments`.`id` AND `submissions`.`student_id` = `students`.`id` \
                    WHERE `sections`.`teacher_id` = ? \
                    ORDER BY \
                      `assignments`.`name`,\
                      `sections`.`name`,\
                      `students`.`lname`,\
                      `students`.`fname`", [req.user.id], function(err, rows) {
    res.setHeader('Content-Disposition', 'attachment; filename=assignments.csv');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Descrption', 'File Transfer');
    var output = 'Assignment,Section,Student,Grade\n';
    for(i in rows) {
      output += rows[i].name + ',' + rows[i].sname + ',' + rows[i].fname + ' ' + rows[i].lname + ',' + (rows[i].grade ? rows[i].grade : 'None') + '\n';
    }
    res.send(output);
  });
});
router.use('/assignment', assignment);

router.use('/submission', submission);

router.get('/student.csv', function(req, res) {
  connection.query("SELECT \
                      `assignments`.`name`,\
                      `sections`.`name` AS `sname`,\
                      `students`.`fname`,\
                      `students`.`lname`,\
                      `submissions`.`id`,\
                      `submissions`.`grade` \
                    FROM \
                      `assignments` \
                      JOIN `sections` ON `assignments`.`section_id` = `sections`.`id` \
                      JOIN `enrollment` ON `enrollment`.`section_id` = `sections`.`id` \
                      JOIN `students` ON `students`.`id` = `enrollment`.`student_id` \
                      LEFT JOIN `submissions` ON `submissions`.`assignment_id` = `assignments`.`id` AND `submissions`.`student_id` = `students`.`id` \
                    WHERE `sections`.`teacher_id` = ? \
                    ORDER BY \
                      `students`.`lname`,\
                      `students`.`fname`,\
                      `sections`.`name`,\
                      `assignments`.`name`", [req.user.id], function(err, rows) {
    res.setHeader('Content-Disposition', 'attachment; filename=students.csv');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Descrption', 'File Transfer');
    var output = 'Student,Section,Assignment,Grade\n';
    for(i in rows) {
      output += rows[i].fname + ' ' + rows[i].lname + ',' + rows[i].sname + ',' + rows[i].name + ',' + (rows[i].grade ? rows[i].grade : (rows[i].id ? 'Not Graded' : 'Not Submitted')) + '\n';
    }
    res.send(output);
  });
});
router.use('/student', student);

// settings page
router.get('/settings', function(req, res) {
  connection.query("SELECT `fname`,`lname` FROM `teachers` WHERE `id` = ?", [req.user.id], function(err, rows) {
    if(err) {
      render('notFound', {type: 'settings', error: 'An unexpected error has occurred.'}, res);
      throw err;
    } else {
      render('settings', {fname: rows[0].fname, lname: rows[0].lname}, res);
    }
  });
});

router.post('/settings', function(req, res) {
  var fname = req.param('fname');
  var lname = req.param('lname');
  if(isSet(fname) && isSet(lname)) {
    var oldPass = req.param('oldpass');
    var newPass = req.param('newpass');
    if(isSet(oldPass) || isSet(newPass)) {
      if(isSet(oldPass) && isSet(newPass)) {
        connection.query("UPDATE `teachers` SET `fname` = ?, `lname` = ?, `pass` = AES_ENCRYPT(?, ?) WHERE `id` = ? AND `pass` = AES_ENCRYPT(?, ?)", [fname, lname, newPass, creds.aes_key, req.user.id, oldPass, creds.aes_key], function(err, rows) {
          if(err) {
            render('notFound', {type: 'settings', error: 'An unexpected error has occurred.'}, res);
            throw err;
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
      connection.query("UPDATE `teachers` SET `fname` = ?, `lname` = ? WHERE `id` = ?", [fname, lname, req.user.id], function(err) {
        if(err) {
          render('notFound', {type: 'settings', error: 'An unexpected error has occurred.'}, res);
          throw err;
        } else {
          render('settings', {fname: fname, lname: lname, msg: 'Changes saved.'}, res);
        }
      });
    }
  } else {
    if(!fname) fname = '';
    if(!lname) lname = '';
    render('settings', {fname: fname, lname: lname, error: 'You must set a valid name.'}, res);
  }
});

router.get('/feedback', function(req, res) {
  render('feedback', {}, res);
});

router.post('/feedback', function(req, res) {
  var type = req.param('type');
  if(!type || (type != 'question' && type != 'comment' && type != 'complaint' && type != 'other')) {
    type = 'other';
  }
  connection.query("SELECT `user`,`fname`,`lname` FROM `teachers` WHERE `id` = ?", [req.user.id], function(err, result) {
    if(err) throw err;

    connection.query("INSERT INTO `feedback` VALUES(NULL, ?, ?, ?, 'teacher', ?, ?, ?)", [result[0].user, result[0].fname, result[0].lname, req.headers['user-agent'], type, req.param('feedback')], function(err) {
      if(err) throw err;
      render('feedback', {success: 'Thank you for your feedback!'}, res);
    });
  });
});

module.exports = router;
