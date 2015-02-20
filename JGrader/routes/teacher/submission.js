// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

require('../common');
var router = express.Router();
var strftime = require('strftime');

var render = function(page, options, res) {
  options.page = 1;
  switch(page) {
    case 'notFound':
      options.title = 'Submission Not Found';
      options.type = 'submission';
      break;
    case 'submission':
      // title must be set already
      options.js = ['prettify', 'teacher/submission', 'tooltip', 'teacher/edit'];
      options.css = ['prettify', 'font-awesome.min'];
      options.onload = 'prettyPrint()';
      options.strftime = strftime;
      break;
  }
  renderGenericTeacher(page, options, res);
}

router.get('/:id', function(req, res) {
  connection.query("SELECT \
                      `submissions`.`assignment_id`,\
                      `submissions`.`submitted`,\
                      `submissions`.`grade`,\
                      `students`.`id`,\
                      `students`.`fname`,\
                      `students`.`lname`,\
                      `assignments`.`id` AS `aid`,\
                      `assignments`.`name`,\
                      `assignments`.`due` \
                    FROM `submissions`,`students`,`assignments`,`sections` \
                    WHERE \
                      `students`.`id` = `submissions`.`student_id` AND \
                      `assignments`.`id` = `submissions`.`assignment_id` AND \
                      `submissions`.`id` = ? AND \
                      `assignments`.`section_id` = `sections`.`id` AND \
                      `sections`.`teacher_id` = ?", [req.params.id, req.user.id], function(err, subData) {
    if(err) {
      render('notFound', {error: 'An unexpected error has occurred.'}, res);
      throw err;
    } else if(subData.length <= 0) {
      render('notFound', {}, res);
    } else {
      connection.query("SELECT `id`,`name`,`contents` FROM `files` WHERE `submission_id` = ? ORDER BY `id`", [req.params.id], function(err, fileData) {
        if(err) {
          render('submission', {title: subData[0].fname + ' ' + subData[0].lname + "'s submission to " + subData[0].name, subData: subData[0], fileData: [], error: 'Unable to retrieve file data.'}, res);
          throw err;
        } else {
          render('submission', {title: subData[0].fname + ' ' + subData[0].lname + "'s submission to " + subData[0].name, subData: subData[0], fileData: fileData}, res);
        }
      });
    }
  });
});

router.post('/:id/updategrade/:grade', function(req, res) {
  // security to ensure this teacher owns this submission
  connection.query("SELECT \
                      `submissions`.`id` \
                    FROM \
                      `submissions`,`assignments`,`sections` \
                    WHERE \
                    `submissions`.`assignment_id` = `assignments`.`id` AND \
                    `assignments`.`section_id` = `sections`.`id` AND \
                    `submissions`.`id` = ? AND \
                    `sections`.`teacher_id` = ?", [req.params.id, req.user.id], function(err, rows) {
    if(isNaN(req.params.grade)) {
      res.json({code: 1}); // invalid input
    } else if(rows.length <= 0) {
      res.json({code: 2}); // invalid permissions
    } else {
      connection.query("UPDATE `submissions` SET `grade` = ? WHERE `id` = ?", [req.params.grade, req.params.id], function(err) {
        if(err) {
          res.json({code: -1}); // unknown error
        } else {
          res.json({code: 0, newValue: req.params.grade}); // success
        }
      });
    }
  });
});

router.post('/:id/run/:fileIndex', function(req, res) {
  // security to ensure this teacher owns this submission and file
  connection.query("SELECT \
                    `files`.`id`,\
                    `files`.`name`,\
                    `files`.`compiled` \
                  FROM `submissions`,`assignments`,`sections`,`files` \
                  WHERE \
                    `submissions`.`assignment_id` = `assignments`.`id` AND \
                    `assignments`.`section_id` = `sections`.`id` AND \
                    `submissions`.`id` = ? AND \
                    `sections`.`teacher_id` = ? AND \
                    `files`.`submission_id` = `submissions`.`id` \
                  ORDER BY `files`.`id`", [req.params.id, req.user.id], function(err, rows) {
    if(rows.length <= 0) {
      res.json({code: 2}); // invalid permissions
    } else {
      fs.mkdir('temp/', function(err) {
        if(err.code != 'EEXIST') throw err;

        for(i in rows) {
          var name = rows[i].name;
          rows[i].className = name.substring(0, name.length - 5);
          // note: working directory seems to be one with app.js in it
          fs.writeFileSync('temp/' + rows[i].className + '.class', rows[i].compiled);
        }

        var fileIndex = req.params.fileIndex;
        if(fileIndex < rows.length) {
          // note: 'nothing' should refer to an actual policy but it doesn't. referring to something that doesn't exist seems to be the same as referring to a policy that grants nothing.
          child = exec('cd temp/ && java -Djava.security.manager -Djava.security.policy==nothing ' + rows[req.params.fileIndex].className, {timeout: 10000 /* 10 seconds */}, function(error, stdout, stderr) {
            for(i in rows) {
              fs.unlinkSync('temp/' + rows[i].className + '.class');
            }
            if(error && error.killed) { // if timeout
              res.json({code: 0, out: '', err: 'Code took too long to execute! There may be an infinite loop somewhere.'});
            } else {
              res.json({code: 0, out: stdout, err: stderr});
            }
          });
          child.stdin.write(req.body.stdin);
          child.stdin.end(); // forces java process to end at end of stdin (otherwise it would just wait if more input was needed)
        } else {
          res.json({code: 1}); // invalid input
        }
      });
    }
  });
});

module.exports = router;
