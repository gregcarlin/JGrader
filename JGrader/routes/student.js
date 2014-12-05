require('./common');
var router = express.Router();

router.get('/', function(req, res) {
  res.redirect('/student/section');
});

router.get('/assignment', function(req, res) {
  authStudent(req.cookies.hash, res, function(id) {
    renderGenericStudent('assignmentList', { page: 0 }, res);
  });
});

router.get('/section', function(req, res) {
  authenticate(req.cookies.hash, res, function(id) {
    findSection(id, res, function(rows){
      express().render('student/sectionList.ejs', { rows: rows }, function(err, html) {
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
  authStudent(req.cookies.hash, res, function(id) {
    renderGenericStudent('joinSection', { page: 0 });
  });
});

// Joins Class
router.post('/section/joinSection', function(req, res) {
  authStudent(req.cookies.hash, res, function(id) {
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

var findSectionID = function(id, res, finish) {
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

// Going to implement a for loop with this and findSectionID. Is there a way to do all that using mysql command??
var findSection = function(id, res, finish) {
  if(id){
    connection.query("SELECT `sections`.`name`,`teachers`.`fname`,`teachers`.`lname` FROM `enrollment`,`sections`,`teachers` WHERE `enrollment`.`section_id` = `sections`.`id` AND `sections`.`teacher_id` = `teachers`.`id` AND `enrollment`.`student_id` = ?", [id], function(err, rows) {
      if(err || rows.length <= 0) {
      } else {
        finish(rows);
      }
    });
  }
}
module.exports = router;
