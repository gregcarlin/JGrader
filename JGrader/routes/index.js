var express = require('express');
var router  = express.Router();
var creds   = require('./credentials');

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
  res.render('index', { title: 'Express' });
});

router.post('/', function(req, res) {
  var email = req.param('email');
  var pass = req.param('password');
  if(email && pass) {
    connection.query('SELECT * FROM `students` WHERE `user` = ? AND `pass` = ?', [email, pass], function(err, rows) {
      if(err) {
        res.render('index', { title: 'Express', error: 'An unknown error has occurred. Please try again later.', email: email });
      } else {
        if(rows.length > 0) {
          var hash = crypto.randomBytes(20).toString('hex'); // http://stackoverflow.com/a/14869745/720889
          res.cookie('hash', hash);
          connection.query('INSERT INTO `sessions` VALUES(?, ?)', [rows[0].id, hash], function(err, rows) {
            if(err) {
              res.render('index', { title: 'Express', error: 'An unknown error has occurred. Please try again later.', email: email });
            } else {
              // todo redirect to login page
            }
          });
        } else {
          res.render('index', { title: 'Express', error: 'Incorrect username or password.', email: email });
        }
      }
    });
  } else {
    res.render('index', { title: 'Express', error: 'All fields are required.', email: email });
  }
});

module.exports = router;
