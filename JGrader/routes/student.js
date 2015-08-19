// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

require('./common');
var router = express.Router();
var bcrypt = require('bcrypt');

var assignment = require('./student/assignment');
var section    = require('./student/section');

var render = function(page, options, res) {
  options.page = -1;
  switch(page) {
    case 'notFound':
      options.title = options.type.charAt(0).toUpperCase() + options.type.slice(1) + ' Not Found';
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
  renderGenericStudent(page, options, res);
}

// automatically authenticate student for every page in this section
router.use(function(req, res, next) {
  authStudent(req.cookies.hash, req, res, next, function(id, mustResetPass) {
    req.user = {id: id};
    res.locals.mustResetPass = mustResetPass; // variable is accessible in ejs
    next();
  });
});

// No page so redirect to view the sections
router.get('/', function(req, res) {
  res.redirect('/student/section');
});

router.use('/assignment', assignment);
router.use('/section', section);

// settings page
router.get('/settings', function(req, res) {
  connection.query("SELECT `fname`,`lname`,`pass_reset_hash` FROM `students` WHERE `id` = ?", [req.user.id], function(err, rows) {
    if(err) {
      render('notFound', {type: 'settings', error: 'An unexpected error has occurred.'}, res);
      throw err;
    } else {
      render('settings', {fname: rows[0].fname, lname: rows[0].lname}, res);
    }
  });
});

// This sections recieves the post method from a students setting page. It parses what they wanted to change and changes it
// in the MySql Database
router.post('/settings', function(req, res, next) {
  // Takes in the users name and last name
  var fname = req.body.fname;
  var lname = req.body.lname;
  if(isSet(fname) && isSet(lname)) {
    var oldPass = req.body.oldpass;
    var newPass = req.body.newpass;
    if(isSet(oldPass) || isSet(newPass)) {
      if((isSet(oldPass) || res.locals.mustResetPass) && isSet(newPass)) {
        var handler = function(err, rows) {
          if(err) {
            render('notFound', {type: 'settings', error: 'An unexpected error has occurred.'}, res);
            err.handled = true;
            next(err);
          } else if(rows.affectedRows <= 0) {
            render('settings', {fname: fname, lname: lname, error: 'Incorrect password.'}, res);
          } else {
            res.locals.mustResetPass = false;
            render('settings', {fname: fname, lname: lname, msg: 'Changes saved.'}, res);
          }
        };
        bcrypt.hash(newPass, 10, function(err, hash) {
          if(res.locals.mustResetPass) {
            connection.query("UPDATE `students` \
                                SET `fname` = ?, \
                                `lname` = ?, \
                                `pass` = ?, \
                                `pass_reset_hash` = NULL \
                              WHERE \
                                `id` = ?", [fname, lname, hash, req.user.id], handler);
          } else {
            connection.query("SELECT `pass` FROM `students` WHERE `id` = ?", [req.user.id], function(err, rows) {
              if(err) {
                render('notFound', {type: 'settings', error: 'An unexpected error has occurred.'}, res);
                err.handled = true;
                next(err);
              } else if(rows.length <= 0) {
                render('notFound', {type: 'settings', error: 'An unexpected error has occurred.'}, res);
              } else {
                bcrypt.compare(oldPass.toString(), rows[0].pass.toString(), function(err, result) {
                  if(err) {
                    render('notFound', {type: 'settings', error: 'An unexpected error has occurred.'}, res);
                    err.handled = true;
                    next(err);
                  } else if(result) {
                    connection.query("UPDATE `students` \
                                        SET `fname` = ?, \
                                        `lname` = ?, \
                                        `pass` = ?, \
                                        `pass_reset_hash` = NULL \
                                      WHERE \
                                        `id` = ?", [fname, lname, hash, req.user.id], handler);
                  } else {
                    render('settings', {fname: fname, lname: lname, error: 'Incorrect password.'}, res);
                  }
                });
              }
            });
          }
        });
      } else {
        render('settings', {fname: fname, lname: lname, error: 'All fields are required to change your password.'}, res);
      }
    } else {
      connection.query("UPDATE `students` SET `fname` = ?, `lname` = ? WHERE `id` = ?", [fname, lname, req.user.id], function(err) {
        if(err) {
          render('notFound', {type: 'settings', error: 'An unexpected error has occurred.'}, res);
          err.handled = true;
          next(err);
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
  var type = req.body.type;
  if(!type || (type != 'question' && type != 'comment' && type != 'complaint' && type != 'other')) {
    type = 'other';
  }
  connection.query("SELECT `user`,`fname`,`lname` FROM `students` WHERE `id` = ?", [req.user.id], function(err, result) {
    if(err) throw err;

    connection.query("INSERT INTO `feedback` VALUES(NULL, ?, ?, ?, 'student', ?, ?, ?)", [result[0].user, result[0].fname, result[0].lname, req.headers['user-agent'], type, req.body.feedback], function(err) {
      if(err) throw err;

      var html = '';
      html += 'From: ' + result[0].fname + ' ' + result[0].lname + ' (' + result[0].user + ')<br />';
      html += 'Type: Student<br />';
      html += 'Message:<br />';
      html += req.body.feedback;
      var mailOptions = {
        subject: 'Feedback: ' + type,
        html: html
      };
      transporter.sendMail(mailOptions, function(err, info) {
        render('feedback', {success: 'Thank you for your feedback!'}, res);
      });
    });
  });
});

module.exports = router;
