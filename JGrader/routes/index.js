// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

require('./common');
var router = express.Router();
var nodemailer = require('nodemailer');

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

// calls finish(err, found) when done, err is null if there is no err, found is true if found, false if not found
var findEmail = function(email, finish) {
  var find = function(db, cb) {
    connection.query("SELECT `id` FROM `" + db + "` WHERE `user` = ?", [email], function(err, rows) {
      if(err) {
        finish(err);
      } else if(rows.length >= 1) {
        finish(null, true);
      } else {
        cb();
      }
    });
  }

  find('students', function() {
    find('teachers', function() {
      find('assistants', function() {
        finish(null, false);
      });
    });
  });
};

router.post('/forgot', function(req, res) {
  if(!req.body.email) {
    res.render('forgot', {error: 'All fields are required.'});
  } else {
    findEmail(req.body.email, function(err, found) {
      if(err) {
        res.render('forgot', {error: 'An unknown error has occurred.'});
        throw err;
      } else if(!found) {
        res.render('forgot', {error: 'No account with that address exists.'});
      } else {
        console.log(creds.email_user);
        console.log(creds.email_pass);
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
          html: 'Talk to Greg or Brian.'
        };
        transporter.sendMail(mailOptions, function(err, info) {
          if(err) {
            res.render('forgot', {error: 'Unable to send email.'});
            throw err;
          } else {
            res.render('forgot', {success: 'An email has been sent with further instruction.'});
          }
        });
      }
    });
  }
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
  exec('git pull && npm install && forever restartall', {}, function(error, stdout, stderr) {
    res.json({stdout: stdout, stderr: stderr});
  });
}

router.get('/git-update', gitUpdate);
router.post('/git-update', gitUpdate);

module.exports = router;
