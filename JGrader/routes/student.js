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
  res.redirect('/student/assignment');
});

router.get('/assignment', function(req, res) {
  authenticate(req.cookies.hash, res, function(id) {
    express().render('student/assignmentList.ejs', function(err, html) {
      if(err) {
        console.log(err);
      } else {
        res.render('student/genericDashboard', { page: 0, content: html });
      }
    });
  });
});

router.get('/section', function(req, res) {
  authenticate(req.cookies.hash, res, function(id) {
    express().render('student/sectionList.ejs', function(err, html) {
      if(err) {
        console.log(err);
      } else {
        res.render('student/genericDashboard', { page: 0, content: html });
      }
    });
  });
});

router.get('/section/joinSection', function(req, res) {
  authenticate(req.cookies.hash, res, function(id) {
    express().render('student/joinSection.ejs', function(err, html) {
      if(err) {
        console.log(err);
      } else {
        res.render('student/genericDashboard', { page: 0, content: html });
      }
    });
  });
});

router.post('/section/joinSection', function(req, res) {
  authenticate(req.cookies.hash, res, function(id) {
    sectionID = req.param('sectionID');
    if(sectionID) {
      connection.query("INSERT INTO `sections_students` VALUES(?, ?)", [id, sectionID], function(err, rows) {
        // todo: Need to handle errors
        res.redirect('/student/section');
      });
    }
  });
});

var authenticate = function(hash, res, finish) {
  if(hash) {
    connection.query("SELECT `id` FROM `sessions-students` WHERE `hash` = ?", [hash], function(err, rows) {
      if(err || rows.length <= 0) {
        res.redirect('/');
      } else {
        finish(rows[0].id);
      }
    });
  } else {
    res.redirect('/');
  }
}

module.exports = router;
