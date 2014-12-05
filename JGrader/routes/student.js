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
  authStudent(req.cookies.hash, res, function(id) {
    findSectionInfo(id, res, function(rows){
      renderGenericStudent('sectionList', { page: 0, rows: rows }, res);
    });
  });
});

router.get('/section/joinSection', function(req, res) {
  authStudent(req.cookies.hash, res, function(id) {
    renderGenericStudent('joinSection', { page: 0 });
  });
});

router.get('/section/:id', function(req, res) {
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
module.exports = router;
