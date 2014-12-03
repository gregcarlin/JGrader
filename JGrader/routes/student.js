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
  res.redirect('/student/section');
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
    findSections(id, res, function(rows){
      express().render('student/sectionList.ejs', rows, function(err, html) {
        if(err) {
          console.log(err);
        } else {
          res.render('student/genericDashboard', { page: 0, content: html });
        }
      });
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

// Joins Class
router.post('/section/joinSection', function(req, res) {
  authenticate(req.cookies.hash, res, function(id) {
    sectionID = req.param('sectionID');
    if(sectionID) {
      connection.query("INSERT INTO `enrollment` VALUES(?, ?)", [sectionID, id], function(err, rows) {
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

var findSections = function(id, res, finish) {
  if(id){
    connection.query("SELECT `section_id` FROM `enrollment` WHERE `student_id` = ?", [id], function(err, rows) {
      if(err || rows.length <= 0) {
        // express().render('student/sectionList.ejs', function(err, html) {
        //   if(err) {
        //     console.log(err);
        //   } else {
        //     res.render('student/genericDashboard', { page: 0, content: html });
        //   }
        // });
      } else {
        finish(rows);
      }
    });
  }
}
module.exports = router;
