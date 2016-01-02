// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

var strftime = require('strftime');
var bcrypt = require('bcrypt');
var _ = require('lodash');

require('./common');
var router = express.Router();
var db = require('../controllers/db');
var section    = require('./teacher/section');
var assignment = require('./teacher/assignment');
var submission = require('./teacher/submission');
var student    = require('./teacher/student');

var render = function(page, options, res) {
  options.page = -1;
  switch (page) {
    case 'notFound':
      options.title = options.type.charAt(0).toUpperCase() +
                      options.type.slice(1) + ' Not Found';
      break;
    case 'settings':
      options.title = 'Settings';
      options.shouldReset = res.locals.mustResetPass;
      break;
    case 'feedback':
      options.title = 'Feedback';
      break;
  }
  page = '../' + page;
  renderGenericTeacher(page, options, res);
};

// automatically authenticate teacher for every page in this section
router.use(function(req, res, next) {
  authTeacher(req.cookies.hash, req, res, next, function(id, mustResetPass) {
    req.user = {id: id};
    res.locals.mustResetPass = mustResetPass; // variable is accessible in ejs
    next();
  });
});

// main teacher page, redirects to section list
router.get('/', function(req, res) {
  res.redirect('/teacher/section'); // redirect to section list
});

router.use('/section', section);

router.get('/assignment.csv', function(req, res, next) {
  db.query("SELECT \
              `assignments`.`name`,\
              `sections`.`name` AS `sname`,\
              `students`.`fname`,\
              `students`.`lname`,\
              `submissions`.`grade` \
            FROM \
              `assignments` \
              JOIN `sections` \
                ON `assignments`.`section_id` = `sections`.`id` \
              JOIN `enrollment` \
                ON `enrollment`.`section_id` = `sections`.`id` \
              JOIN `students` \
                ON `students`.`id` = `enrollment`.`student_id` \
              LEFT JOIN `submissions` \
                ON `submissions`.`assignment_id` = `assignments`.`id` \
                AND `submissions`.`student_id` = `students`.`id` \
            WHERE `sections`.`teacher_id` = ? \
            ORDER BY \
              `assignments`.`name`,\
              `sections`.`name`,\
              `students`.`lname`,\
              `students`.`fname`", [req.user.id], function(err, rows) {
    res.setHeader('Content-Disposition',
                  'attachment; filename=assignments.csv');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Descrption', 'File Transfer');
    var output = 'Assignment,Section,Student,Grade\n';
    _.each(rows, function(row) {
      output += row.name + ',' + row.sname + ',' + row.fname + ' ' +
                row.lname + ',' + (row.grade ? row.grade : 'None') + '\n';
    });
    res.send(output);
  });
});
router.use('/assignment', assignment);

router.use('/submission', submission);

router.get('/student.csv', function(req, res, next) {
  db.query("SELECT \
              `assignments`.`name`,\
              `sections`.`name` AS `sname`,\
              `students`.`fname`,\
              `students`.`lname`,\
              `submissions`.`id`,\
              `submissions`.`grade` \
            FROM \
              `assignments` \
              JOIN `sections` \
                ON `assignments`.`section_id` = `sections`.`id` \
              JOIN `enrollment` \
                ON `enrollment`.`section_id` = `sections`.`id` \
              JOIN `students` \
                ON `students`.`id` = `enrollment`.`student_id` \
              LEFT JOIN `submissions` \
                ON `submissions`.`assignment_id` = `assignments`.`id` \
                AND `submissions`.`student_id` = `students`.`id` \
            WHERE `sections`.`teacher_id` = ? \
            ORDER BY \
              `students`.`lname`,\
              `students`.`fname`,\
              `sections`.`name`,\
              `assignments`.`name`",
            [req.user.id], function(err, rows) {
    res.setHeader('Content-Disposition', 'attachment; filename=students.csv');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Descrption', 'File Transfer');
    var output = 'Student,Section,Assignment,Grade\n';
    _.each(rows, function(row) {
      output += row.fname + ' ' + row.lname + ',' + row.sname + ',' +
                row.name + ',' +
                (row.grade || (row.id ? 'Not Graded' : 'Not Submitted')) + '\n';
    });
    res.send(output);
  });
});
router.use('/student', student);

// settings page
router.get('/settings', function(req, res, next) {
  db.query("SELECT `fname`,`lname`,`pass_reset_hash` \
            FROM `teachers` WHERE `id` = ?",
            [req.user.id], function(err, rows) {
    if (err) {
      render('notFound', {
        type: 'settings',
        error: 'An unexpected error has occurred.'
      }, res);
      err.handled = true;
      return next(err);
    }

    render('settings', {fname: rows[0].fname, lname: rows[0].lname}, res);
  });
});

router.post('/settings', function(req, res, next) {
  var fname = req.body.fname;
  var lname = req.body.lname;
  if (isSet(fname) && isSet(lname)) {
    var oldPass = req.body.oldpass;
    var newPass = req.body.newpass;
    if (isSet(oldPass) || isSet(newPass)) {
      if ((isSet(oldPass) || res.locals.mustResetPass) && isSet(newPass)) {
        var handler = function(err, rows) {
          if (err) {
            render('notFound', {
              type: 'settings',
              error: 'An unexpected error has occurred.'
            }, res);
            err.handled = true;
            return next(err);
          }

          if (rows.affectedRows <= 0) {
            render('settings', {
              fname: fname,
              lname: lname,
              error: 'Incorrect password.'
            }, res);
          } else {
            res.locals.mustResetPass = false;
            render('settings', {
              fname: fname,
              lname: lname,
              msg: 'Changes saved.'
            }, res);
          }
        };

        bcrypt.hash(newPass, 10, function(err, hash) {
          if (res.locals.mustResetPass) {
            db.query("UPDATE `teachers` \
                        SET `fname` = ?, \
                        `lname` = ?, \
                        `pass` = ?, \
                        `pass_reset_hash` = NULL \
                      WHERE \
                        `id` = ?",
                      [fname, lname, hash, req.user.id], handler);
          } else {
            db.query("SELECT `pass` FROM `teachers` \
                      WHERE `id` = ?",
                      [req.user.id], function(err, rows) {
              if (err) {
                render('notFound', {
                  type: 'settings',
                  error: 'An unexpected error has occurred.'
                }, res);
                err.handled = true;
                return next(err);
              }

              if (rows.length <= 0) {
                render('notFound', {
                  type: 'settings',
                  error: 'An unexpected error has occurred.'
                }, res);
              } else {
                bcrypt.compare(oldPass.toString(), rows[0].pass.toString(),
                               function(err, result) {
                  if (err) {
                    render('notFound', {
                      type: 'settings',
                      error: 'An unexpected error has occurred.'
                    }, res);
                    err.handled = true;
                    return next(err);
                  }

                  if (result) {
                    db.query("UPDATE `teachers` \
                                SET `fname` = ?, \
                                `lname` = ?, \
                                `pass` = ?, \
                                `pass_reset_hash` = NULL \
                              WHERE \
                                `id` = ?",
                              [fname, lname, hash, req.user.id],
                              handler);
                  } else {
                    render('settings', {
                      fname: fname,
                      lname: lname,
                      error: 'Incorrect password.'
                    }, res);
                  }
                });
              }
            });
          }
        });
      } else {
        render('settings', {
          fname: fname,
          lname: lname,
          error: 'All fields are required to change your password.'
        }, res);
      }
    } else {
      db.query("UPDATE `teachers` \
                SET `fname` = ?, `lname` = ? \
                WHERE `id` = ?",
                [fname, lname, req.user.id], function(err) {
        if (err) {
          render('notFound', {
            type: 'settings',
            error: 'An unexpected error has occurred.'
          }, res);
          err.handled = true;
          return next(err);
        }

        render('settings', {
          fname: fname,
          lname: lname,
          msg: 'Changes saved.'
        }, res);
      });
    }
  } else {
    if (!fname) fname = '';
    if (!lname) lname = '';
    render('settings', {
      fname: fname,
      lname: lname,
      error: 'You must set a valid name.'
    }, res);
  }
});

router.get('/feedback', function(req, res, next) {
  render('feedback', {}, res);
});

router.post('/feedback', function(req, res, next) {
  var type = req.body.type || 'other';
  if (!_.contains(['question', 'comment', 'complaint', 'other'])) {
    type = 'other';
  }

  db.query("SELECT `user`,`fname`,`lname` FROM `teachers` \
            WHERE `id` = ?", [req.user.id], function(err, result) {
    if (err) return next(err);

    db.query("INSERT INTO `feedback` \
              VALUES(NULL, ?, ?, ?, 'teacher', ?, ?, ?)",
              [
                result[0].user,
                result[0].fname,
                result[0].lname,
                req.headers['user-agent'],
                type,
                req.body.feedback
              ], function(err) {
      if (err) return next(err);

      var html = '';
      html += 'From: ';
      html += result[0].fname + ' ' + result[0].lname;
      html += ' (' + result[0].user + ')<br />';
      html += 'Type: Teacher<br />';
      html += 'Message:<br />';
      html += req.body.feedback;
      var mailOptions = {
        subject: 'Feedback: ' + type,
        'h:Reply-To': result[0].user,
        html: html
      };
      transporter.sendMail(mailOptions, function(err, info) {
        render('feedback', {success: 'Thank you for your feedback!'}, res);
      });
    });
  });
});

module.exports = router;
