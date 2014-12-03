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
  res.render('teacher/teacherIndex', { title: 'Express' });
});

router.get('/createClass', function(req, res){
  res.render('teacher/createClass', { title: 'Express' });
});

router.post('/submitClass', function(req,res) {
  var cname = req.param('cname');
  if(came){
    exists(cname, req.cookies.hash, function(){
      connection.query("INSERT INTO `" + role + "s` VALUES(NULL, ?)");
    });
  }
});

router.post('/submitAssignment', function(req,res) {

});
module.exports = router;

var exists = function(cname, id, res, finish) {
  connection.query("SELECT `id` FROM `sections` WHERE `name` = ? AND 'teacher_id' = ?", [cname, id], function(err, rows) {
    if(err) {
      res.render('teacher/createClass', { error: 'An unknown error has occurred. Please try again later.'});
    } else if(rows.length > 0) {
      res.render('sign-up', { error: 'A class with that name already exists.'});
    } else {
      finish();
    }
  });
}
