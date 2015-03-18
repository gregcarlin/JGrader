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
        connection.query('UPDATE `' + db + '` SET `pass` = AES_ENCRYPT(?,?) WHERE `id` = ?', [hash, creds.aes_key, id], function(err, result) {
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
            html: 'Your new password is ' + hash + '. Please <a href="http://www.jgrader.com/sign-in">log in</a> and change this as soon as possible.'
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
  exec('git pull && npm install && forever stopall && npm start', {}, function(error, stdout, stderr) {
    res.json({stdout: stdout, stderr: stderr});
  });
}

router.get('/git-update', gitUpdate);
router.post('/git-update', gitUpdate);

module.exports = router;
