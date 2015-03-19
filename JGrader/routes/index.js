// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

require('./common');
var router = express.Router();
var nodemailer = require('nodemailer');
var crypto = require('crypto');

/* GET home page. */
router.get('/', function(req, res) {
  var hash = req.cookies.hash;
  tryRedirect(hash, res, 'teacher', function() {
    tryRedirect(hash, res, 'student', function() {
      tryRedirect(hash, res, 'assistant', function() {
        res.render('index');
      });
    });
  });
});

router.get('/log-out', function(req, res) {
  var hash = req.cookies.hash;
  res.clearCookie('hash');
  // todo only delete from where we need to?
  connection.query("DELETE FROM `sessions-teachers` WHERE `hash` = ?", [hash]);
  connection.query("DELETE FROM `sessions-students` WHERE `hash` = ?", [hash]);
  connection.query("DELETE FROM `sessions-assistants` WHERE `hash` = ?", [hash]);
  res.redirect('/');
});

router.get('/forgot', function(req, res) {
  res.render('forgot');
});

// calls finish(err, db) when done, err is null if there is no err, found is the database name if found, null if not found
var findEmail = function(email, finish) {
  var find = function(db, cb) {
    connection.query("SELECT `id` FROM `" + db + "` WHERE `user` = ?", [email], function(err, rows) {
      if(err) {
        finish(err, null);
      } else if(rows.length >= 1) {
        finish(null, db, rows[0].id);
      } else {
        cb();
      }
    });
  }

  find('students', function() {
    find('teachers', function() {
      find('assistants', function() {
        finish(null, null, null);
      });
    });
  });
};

router.post('/forgot', function(req, res) {
  if(!req.body.email) {
    res.render('forgot', {error: 'All fields are required.'});
  } else {
    findEmail(req.body.email, function(err, db, id) {
      if(err) {
        res.render('forgot', {error: 'An unknown error has occurred.'});
        throw err;
      } else if(!db || !id) {
        res.render('forgot', {error: 'No account with that address exists.'});
      } else {
        var hash = crypto.randomBytes(20).toString('hex');
        var url = 'http://jgrader.com/forgot/' + db + '/' + hash;
        connection.query("UPDATE `" + db + "` SET `pass_reset_hash` = ? WHERE `id` = ?", [hash, id], function(err, result) {
          var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: creds.email_user,
              pass: creds.email_pass
            }
          });
          var mailOptions = {
            from: creds.email_user,
            to: req.body.email,
            subject: 'Password Recovery',
            html: 'Your password reset request has been received. If you would like to reset your password, please go to <a href="' + url + '">' + url + '</a>. If you did not want to reset your password, you can safely ignore this message.'
          };
          transporter.sendMail(mailOptions, function(err, info) {
            if(err) {
              res.render('forgot', {error: 'Unable to send email.'});
              throw err;
            } else {
              res.render('forgot', {success: 'An email has been sent with further instruction.'});
            }
          });
        });
      }
    });
  }
});

router.get('/forgot/:db/:hash', function(req, res) {
  connection.query("SELECT `id` FROM ?? WHERE `pass_reset_hash` = ?", [req.params.db, req.params.hash], function(err, rows) {
    if(err) {
      res.render('forgot', {error: 'An unknown error has occurred.'});
      // don't throw err because it might be caused by an incorrect database
      console.log(err);
    } else if(rows.length <= 0) {
      res.render('forgot', {error: 'Your account could not be found. Please try again.'});
    } else {
      signIn(req.params.db, rows[0].id, res, function(err, result) {
        if(err) {
          res.render('forgot', {error: 'An unknown error has occurred.'});
          throw err;
        } else {
          // user will be automatically redirected to their proper section
          res.redirect('/');
        }
      });
    }
  });
});

// if hash is set to a valid user in the given db they are redirected to that section, otherwise finish is called.
var tryRedirect = function(hash, res, db, finish) {
  logIn(hash, db + 's', function(id) {
    if(id) {
      res.redirect('/' + db);
    } else {
      finish();
    }
  });
}

var gitUpdate = function(req, res) {
  exec('git pull && forever stopall && npm install && npm start', {}, function(error, stdout, stderr) {
    res.json({stdout: stdout, stderr: stderr});
  });
}

router.get('/git-update', gitUpdate);
router.post('/git-update', gitUpdate);

module.exports = router;
