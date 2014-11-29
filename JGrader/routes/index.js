var express = require('express');
var router  = express.Router();
var creds   = require('./credentials');
var crypto  = require('crypto');

var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : creds.mysql_host,
  port     : creds.mysql_port,
  database : creds.mysql_db,
  user     : creds.mysql_user,
  password : creds.mysql_pass
});
connection.connect(); // we should probably close this at some point [connection.end()]

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Sign In | JGrader' });
});

// attempts to login to website as teacher or student, calls finish(success/failure) when finished without error
var login = function(db, email, pass, res, finish) {
  connection.query("SELECT * FROM `" + db + "` WHERE `user` = ? AND `pass` = AES_ENCRYPT(?, '" + creds.aes_key + "')", [email, pass], function(err, rows) {
    if(err) {
      res.render('index', { title: 'Sign In | JGrader', error: 'An unknown error has occurred. Please try again later.', email: email });
    } else {
      if(rows.length > 0) {
        var hash = crypto.randomBytes(20).toString('hex'); // http://stackoverflow.com/a/14869745/720889
        res.cookie('hash', hash);
        connection.query('INSERT INTO `sessions-' + db + '` VALUES(?, ?)', [rows[0].id, hash], function(err, rows) {
          if(err) {
            res.render('index', { title: 'Sign In | JGrader', error: 'An unknown error has occurred. Please try again later.', email: email });
          } else {
            finish(true); // successful login
          }
        });
      } else {
        finish(false); // incorrect login info
      }
    }
  });
}

router.post('/', function(req, res) {
  var email = req.param('email');
  var pass = req.param('password');
  if(email && pass) {
    login('students', email, pass, res, function(status) {
      if(status) {
        // todo redirect to student login
      } else {
        login('teachers', email, pass, res, function(status) {
          if(status) {
            // todo redirect to teacher login
          } else {
            res.render('index', { title: 'Sign In | JGrader', error: 'Incorrect email or password.', email: email});
          }
        });
      }
    });
  } else {
    res.render('index', { title: 'Sign In | JGrader', error: 'All fields are required.', email: email });
  }
});

module.exports = router;
