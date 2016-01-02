// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

var bcrypt = require('bcrypt');

require('./common');
var router = express.Router();
var db = require('../controllers/db');

/* GET home page. */
router.get('/', function(req, res) {
  res.render('sign-in', {error: req.query.error, redirect: req.query.redirect});
});

// attempts to login to website with given database, calls finish() iff login information is incorrect
var login = function(db, email, pass, req, res, next, finish) {
  db.query("SELECT * FROM `" + db + "s` \
            WHERE `user` = ?", [email], function(err, rows) {
    if (err) {
      res.render('sign-in', {
        error: 'An unknown error has occurred. Please try again later.',
        email: email
      });
      err.handled = true;
      return next(err);
    }

    if (rows.length > 0) {
      bcrypt.compare(pass.toString(), rows[0].pass.toString(),
                     function(err, result) {
        if (result) {
          if (err) {
            res.render('sign-in', {
              error: 'An unknown error has occurred. Please try again later.',
              email: email
            });
            err.handled = true;
            return next(err);
          }

          signIn(db + 's', rows[0].id, res, function(err, rows) {
            if (err) {
              res.render('sign-in', {
                error: 'An unknown error has occurred. Please try again later.',
                email: email
              });
              err.handled = true;
              return next(err);
            }

            res.redirect(req.body.redirect ? req.body.redirect : ('/' + db)); // successful login
          });
        } else {
          finish(); // incorrect pass
        }
      });
    } else {
      finish(); // incorrect login info
    }
  });
};

router.post('/', function(req, res, next) {
  var email = req.body.email;
  var pass  = req.body.password;
  if (email && pass) {
    login('student', email, pass, req, res, next, function() {
      login('teacher', email, pass, req, res, next, function() {
        login('assistant', email, pass, req, res, next, function() {
          res.render('sign-in', {
            error: ('Incorrect email or password. ' +
                    '<a href="/forgot">Forgot your password?</a>'),
            email: email
          });
        });
      });
    });
  } else {
    res.render('sign-in', { error: 'All fields are required.', email: email });
  }
});

module.exports = router;
