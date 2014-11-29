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
  res.render('sign-up', {});
});

router.post('/', function(req, res) {
  var fname = req.param('fname');
  var lname = req.param('lname');
  var email = req.param('email');
  var pass  = req.param('password');
  var role  = req.param('role');
  if(fname && lname && email && pass && role && (role == 'student' || role == 'teacher')) {
    connection.query("SELECT `id` FROM `students` WHERE `user` = ?", [email], function(err, rows) {
      if(err) {
        res.render('sign-up', { error: 'An unknown error has occurred. Please try again later.', fname: fname, lname: lname, email: email, role: role });
      } else if(rows.length > 0) {
        res.render('sign-up', { error: 'An account with that email already exists.', fname: fname, lname: lname, email: email, role: role });
      } else {
        connection.query("SELECT `id` FROM `teachers` WHERE `user` = ?", [email], function(err, rows) {
          if(err) {
            res.render('sign-up', { error: 'An unknown error has occurred. Please try again later.', fname: fname, lname: lname, email: email, role: role });
          } else if(rows.length > 0) {
            res.render('sign-up', { error: 'An account with that email already exists.', fname: fname, lname: lname, email: email, role: role });
          } else {
            connection.query("INSERT INTO `" + role + "s` VALUES(NULL, ?, AES_ENCRYPT(?, '" + creds.aes_key + "'), ?, ?)", [email, pass, fname, lname], function(err, rows) {
              if(err) {
                res.render('sign-up', { error: 'An unknown error has occurred. Please try again later.', fname: fname, lname: lname, email: email, role: role });
              } else {
                connection.query("SELECT `id` FROM `" + role + "s` WHERE `user` = ?", [email], function(err, rows) {
                  if(err || rows.length <= 0) {
                    res.render('sign-up', { error: 'An unknown error has occurred. Please try again later.', fname: fname, lname: lname, email: email, role: role });
                  } else {
                    var hash = crypto.randomBytes(20).toString('hex'); // http://stackoverflow.com/a/14869745/720889
                    res.cookie('hash', hash);
                    connection.query('INSERT INTO `sessions-' + role + 's` VALUES(?, ?)', [rows[0].id, hash], function(err, rows) {
                      if(err) {
                        res.render('sign-up', { error: 'An unknown error has occurred. Please try again later.', fname: fname, lname: lname, email: email, role: role });
                      } else {
                        // todo redirect to dashboard
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
  } else {
    res.render('sign-up', { error: 'All fields are required.', fname: fname, lname: lname, email: email, role: role });
  }
});

module.exports = router;
