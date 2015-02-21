// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

require('./common');
var router = express.Router();
var crypto  = require('crypto');

/* GET home page. */
router.get('/', function(req, res) {
  res.render('sign-in', {error: req.query.error});
});

// attempts to login to website with given database, calls finish() iff login information is incorrect
var login = function(db, email, pass, res, finish) {
  connection.query("SELECT * FROM `" + db + "s` WHERE `user` = ? AND `pass` = AES_ENCRYPT(?, '" + creds.aes_key + "')", [email, pass], function(err, rows) {
    if(err) {
      res.render('sign-in', { error: 'An unknown error has occurred. Please try again later.', email: email });
      console.log(err); // To see whats wrong on server
    } else {
      if(rows.length > 0) {
        var hash = crypto.randomBytes(20).toString('hex'); // http://stackoverflow.com/a/14869745/720889
        res.cookie('hash', hash);
        connection.query('INSERT INTO `sessions-' + db + 's` VALUES(?, ?)', [rows[0].id, hash], function(err, rows) {
          if(err) {
            res.render('sign-in', { error: 'An unknown error has occurred. Please try again later.', email: email });
          } else {
            res.redirect('/' + db); // successful login
          }
        });
      } else {
        finish(); // incorrect login info
      }
    }
  });
}

router.post('/', function(req, res) {
  var email = req.body.email;
  var pass  = req.body.password;
  if(email && pass) {
    login('student', email, pass, res, function() {
      login('teacher', email, pass, res, function() {
        login('assistant', email, pass, res, function() {
          res.render('sign-in', { error: 'Incorrect email or password.', email: email});
        });
      });
    });
  } else {
    res.render('sign-in', { error: 'All fields are required.', email: email });
  }
});

module.exports = router;
