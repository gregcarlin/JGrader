// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

require('./common');
var router = express.Router();
var bcrypt = require('bcrypt');

/* GET home page. */
router.get('/', function(req, res) {
  res.render('sign-up', {error: req.query.error, redirect: req.query.redirect});
});

// checks if a user exists in a given database. calls finish() iff user doesn't exist.
var exists = function(user, db, req, res, next, finish) {
  connection.query("SELECT `id` FROM `" + db + "` WHERE `user` = ?", [user.email], function(err, rows) {
    if (err) {
      res.render('sign-up', { error: 'An unknown error has occurred. Please try again later.', user: user, redirect: req.query.redirect });
      err.handled = true;
      return next(err);
    }

    if (rows.length > 0) {
      res.render('sign-up', { error: 'An account with that email already exists.', user: user, redirect: req.query.redirect });
    } else {
      finish();
    }
  });
}

router.post('/', function(req, res, next) {
  var user = {};
  user.fname = req.body.fname;
  user.lname = req.body.lname;
  user.email = req.body.email;
  user.pass  = req.body.password;
  user.role  = req.body.role;
  if (user.fname && user.lname && user.email && user.pass && user.role && (user.role == 'student' || user.role == 'teacher' || user.role == 'assistant')) {
    exists(user, 'students', req, res, next, function() {
      exists(user, 'teachers', req, res, next, function() {
        exists(user, 'assistants', req, res, next, function() {
          bcrypt.hash(user.pass, 10, function(err, hash) {
            if (err) {
              res.render('sign-up', { error: 'An unknown error has occurred. Please try again later.', user: user, redirect: req.body.redirect });
              err.handled = true;
              return next(err);
            }

            connection.query("INSERT INTO `" + user.role + "s` VALUES(NULL, ?, ?, ?, ?, NULL)", [user.email, hash, user.fname, user.lname], function(err, rows) {
              if (err) {
                res.render('sign-up', { error: 'An unknown error has occurred. Please try again later.', user: user, redirect: req.body.redirect });
                err.handled = true;
                return next(err);
              }

              connection.query("SELECT `id` FROM `" + user.role + "s` WHERE `user` = ?", [user.email], function(err, rows) {
                if (err || rows.length <= 0) {
                  res.render('sign-up', { error: 'An unknown error has occurred. Please try again later.', user: user, redirect: req.body.redirect });
                  err.handled = true;
                  return next(err);
                }

                signIn(user.role + 's', rows[0].id, res, function(err, rows) {
                  if (err) {
                    res.render('sign-up', { error: 'An unknown error has occurred. Please try again later.', user: user, redirect: req.body.redirect });
                    err.handled = true;
                    return next(err);
                  }

                  res.redirect(req.body.redirect ? req.body.redirect : ('/' + user.role));
                });
              });
            });

          });
        });
      });
    });
  } else {
    res.render('sign-up', { error: 'All fields are required.', user: user, redirect: req.body.redirect });
  }
});

module.exports = router;

