var express = require('express');
var router  = express.Router();
var creds   = require('./credentials');

var mysql      = require('mysql');
var connection = mysql.createConnection({
  host               : creds.mysql_host,
  port               : creds.mysql_port,
  database           : creds.mysql_db,
  user               : creds.mysql_user,
  password           : creds.mysql_pass,
  multipleStatements : true
});
connection.connect(); // we should probably close this at some point [connection.end()]

router.get('/', function(req, res) {
  res.redirect('/teacher/section'); // redirect to section list
});

// list sections
router.get('/section', function(req, res) {
  authenticate(req.cookies.hash, res, function(id) {
    connection.query("SELECT * FROM `sections` WHERE `teacher_id` = ?", [id], function(err, rows) {
      if(err) {
        throw err; // #yolo
      } else {
        renderGeneric('teacher/sectionList', { page: 0, rows: rows }, res);
      }
    });
  });
});

router.get('/section/create', function(req, res) {
  renderGeneric('teacher/sectionCreate', { page: 0 }, res);
});

// Creates class/section
router.post('/section/create', function(req, res) {
  authenticate(req.cookies.hash, res, function(id) {
    var name = req.param('name');
    if(name.length <= 0) {
      renderGeneric('teacher/sectionCreate', { page: 0, error: 'Name cannot be blank.', name: name }, res);
    } else {
      connection.query("INSERT INTO `sections` VALUES(NULL, ?, ?); SELECT LAST_INSERT_ID()", [id, name], function(err, rows) {
        if(err || rows.length <= 0) {
          renderGeneric('teacher/sectionCreate', { page: 0, error: 'An unknown error has occurred. Please try again later.', name: name }, res);
        } else {
          res.redirect('/teacher/section/' + rows[1][0]["LAST_INSERT_ID()"]); // redirect teacher to page of newly created section
        }
      });
    }
  });
});

router.get('/section/:id', function(req, res) {
  authenticate(req.cookies.hash, res, function(teacherID) {
    var sectionID = req.params.id;
    if(sectionID && sectionID.length > 0) {
      connection.query("SELECT * FROM `sections` WHERE `id` = ? AND `teacher_id` = ?", [sectionID, teacherID], function(err, rows) {
        if(err || rows.length <= 0) {
          renderGeneric('teacher/notFound', { page: 0, type: 'section' }, res);
        } else {
          renderGeneric('teacher/section', { page: 0, sectionName: rows[0].name }, res);
        }
      });
    } else {
      renderGeneric('teacher/notFound', { page: 0, type: 'section' }, res);
    }
    });
});

router.get('/assignment', function(req, res) {
  // todo design assignment list
});

router.get('/assignment/create', function(req, res) {
  renderGeneric('teacher/assignmentCreate', { page: 1 }, res);
});

router.post('/assignment/create', function(req,res) {
  // todo implement creation of assignment
});

router.get('/student', function(req, res) {
  // todo design student list
});

module.exports = router;

// convert a hash to a user id
var authenticate = function(hash, res, finish) {
  if(hash) {
    connection.query("SELECT `id` FROM `sessions-teachers` WHERE `hash` = ?", [hash], function(err, rows) {
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

var renderGeneric = function(page, vars, res) {
  express().render(page + '.ejs', vars, function(err, html) {
    if(err) {
      console.log(err);
    } else {
      vars.content = html;
      res.render('teacher/genericDashboard', vars);
    }
  });
}
