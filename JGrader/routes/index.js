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
  res.render('index', { title: 'JGrader' });
});

module.exports = router;
