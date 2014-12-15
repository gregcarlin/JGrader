require('./common');
var router = express.Router();
var multer  = require('multer');
var fs = require('fs');
var moment = require('moment');

router.get('/', function(req, res) {
  res.redirect('/student/section');
});

router.get('/assignment', function(req, res) {
  authStudent(req.cookies.hash, res, function(id) {
    connection.query("SELECT `sections`.`name`,`teachers`.`fname`,`teachers`.`lname`,`assignments`.`name` AS `assignmentName`,`assignments`.`description`,`assignments`.`due`, `assignments`.`id` FROM `sections`, `teachers`, `assignments`,`enrollment` WHERE `enrollment`.`student_id` = ? AND `enrollment`.`section_id` = `assignments`.`section_id` AND `sections`.`id` = `enrollment`.`section_id` AND `sections`.`teacher_id`=`teachers`.`id`", [id], function(err, rows) {
      // todo: Need to handle errors
      if(err) {
        res.redirect('/student/section');
      } else {
        renderGenericStudent('assignmentList', { rows: rows, page: 1 }, res);
      }
    });
  });
});

router.get('/assignment/:id', function(req, res) {
  authStudent(req.cookies.hash, res, function(id) {
    var assignmentID = req.params.id;
    if(id) {
      connection.query("SELECT `assignments`.`id`,`assignments`.`name`,`assignments`.`description`,`assignments`.`due` FROM `enrollment`,`assignments`,`sections` WHERE `enrollment`.`section_id` = `sections`.`id` AND `sections`.`id` = `assignments`.`section_id` AND `enrollment`.`student_id` = ? AND `assignments`.`id` = ?", [id, assignmentID], function(err, rows) {
        // todo: Need to handle errors
        if(err) {
          res.redirect('/student/assignment');
        } else {
          renderGenericStudent('assignment', { rows: rows, page: 1 }, res);
        }
      });
    }
    renderGenericStudent('assignment', { page: 1 });
  });
});

router.post('/assignment/:id/submit', function(req, res) {
  authStudent(req.cookies.hash, res, function(id) {
    var assignmentID = req.params.id;
    //console.log(req.files);
    if(req.files){
      connection.query("SELECT `submissions`.`id` FROM `submissions` WHERE `submissions`.`student_id` = ? AND `submissions`.`assignment_id` = ?", [id, req.params.id], function(err, rows) {
        if(rows.length==0){
          var timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
          connection.query("INSERT INTO `submissions` VALUES(NULL, ?, ?, ?, NULL)", [req.params.id, id,timestamp], function(err, rows) {
            if(err){
              // Need error support
              res.redirect('/student/assignment');
            }
            submitFiles(0, req.files, function(err) {
              if(err){
                // Need error support
                res.redirect('/student/assignment');
              } else {
                res.send(req.body);
              }
            });
          });
        } else {
          console.log(req.files);
          submitFiles(0, req.files, function(err) {
            if(err){
              // Need error support
              res.redirect('/student/assignment');
            } else {
              res.send(req.body);
            }
          });
        }
      });
    }
  });
});

router.get('/section', function(req, res) {
  authStudent(req.cookies.hash, res, function(id) {
    findSectionInfo(id, res, function(rows){
      renderGenericStudent('sectionList', { page: 0, rows: rows }, res);
    });
  });
});

router.get('/section/joinSection', function(req, res) {
  authStudent(req.cookies.hash, res, function(id) {
    renderGenericStudent('joinSection', { page: 0 }, res);
  });
});

router.get('/section/:id', function(req, res) {
  authStudent(req.cookies.hash, res, function(studentID) {
    sectionID = req.params.id;
      connection.query("SELECT `assignments`.`id`,`assignments`.`name`,`assignments`.`description`,`assignments`.`due`,`sections`.`name` AS `sectionName` FROM `assignments`, `enrollment`,`sections` WHERE `assignments`.`section_id` = `enrollment`.`section_id` AND `enrollment`.`student_id` = ? AND `sections`.`id` = `enrollment`.`section_id` AND `enrollment`.`section_id` = ?", [studentID,sectionID], function(err, rows) {
        // todo: Need to handle errors
        if(err) {
        res.redirect('/student/section');
      } else {
            renderGenericStudent('section', { rows: rows, page: 0 }, res);
        }
      });
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

var findSectionInfo = function(id, res, finish) {
  if(id){
    connection.query("SELECT `sections`.`name`,`teachers`.`fname`,`teachers`.`lname`,`sections`.`id` FROM `enrollment`,`sections`,`teachers` WHERE `enrollment`.`section_id` = `sections`.`id` AND `sections`.`teacher_id` = `teachers`.`id` AND `enrollment`.`student_id` = ?", [id], function(err, rows) {
      if(err || rows.length <= 0) {
      } else {
        finish(rows);
      }
    });
  }
}

var submitFiles = function(i, files, finish) {
  console.log('start \n' + i + '\n' + files[0]);
  if(i < files.length) {
      connection.query("SELECT `submissions`.`id`, `students`.`fname` FROM `students`,`submissions` WHERE `students`.`id` = ?  AND `submissions`.`student_id` = `students`.`id` AND `submissions`.`assignment_id` = ?", [id,req.params.id], function(err, rows) {
        console.log('select');
        if(err){
          finish(err);
        } else {
          console.log('insert');
          connection.query("INSERT INTO `files` VALUES(NULL,?,?,?)", [rows[0].id, rows[0].fname,req.files[i].buffer.toString()], function(err, rows) {
            if(err){
              return finish(err);
            } else {
              submitFiles(i+1, files, finish);
            }
          });
        }
      });
  } else {
    finish();
  }
}

module.exports = router;
