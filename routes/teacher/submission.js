// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

var strftime = require('strftime');
var JSZip = require('jszip');

require('../common');
var router = express.Router();
var db = require('../../controllers/db');
var comments = require('../../controllers/comments');
var codeRunner = require('../../controllers/codeRunner');
var submission = require('../../controllers/teacher/submission');

var render = function(page, options, res) {
  options.page = 1;
  switch (page) {
    case 'notFound':
      options.title = 'Submission Not Found';
      options.type = 'submission';
      page = '../' + page;
      break;
    case 'submission':
      // title must be set already
      options.js = [
                    'prettify',
                    'teacher/submission',
                    'tooltip',
                    'teacher/edit',
                    'comments'
                   ];
      options.css = ['prettify', 'font-awesome.min'];
      options.strftime = strftime;
      break;
  }
  renderGenericTeacher(page, options, res);
};

router.use('/:id', function(req, res, next) {
  db.query({
    sql: queries.teacher.submission.JOINS,
    nestTables: true,
    values: [req.params.id, req.user.id]
  }, function(err, result) {
    if (err) {
      render('notFound', {error: 'An unexpected error has occurred.'}, res);
      err.handled = true;
      return next(err);
    }

    if (result.length <= 0) {
      render('notFound', {}, res);
    } else {
      req.submission = result[0].submissions;
      req.assignment = result[0].assignments;
      req.section = result[0].sections;
      next();
    }
  });
});

var handle = function(err, req, student, res, next) {
  render('submission', {
    title: student.fname + ' ' + student.lname + "'s submission to " +
           req.assignment.name,
    student: student,
    fileData: [],
    submission: req.submission,
    assignment: req.assignment,
    error: 'Unable to retrieve file data.',
    anyCompiled: true,
    teacherFiles: [],
    previous: -1,
    next: -1
  }, res);
  err.handled = true;
  next(err);
};

router.get('/:id', function(req, res, next) {
  db.query("SELECT `id`,`fname`,`lname` FROM `students` WHERE `id` = ?",
            [req.submission.student_id], function(err, students) {
    if (err) {
      render('notFound', {error: 'An unexpected error has occurred.'}, res);
      err.handled = true;
      return next(err);
    }

    db.query("SELECT `id`,`name`,`contents`,`compiled`,`mime` \
              FROM `files` \
              WHERE `submission_id` = ? ORDER BY `id`",
              [req.params.id], function(err, fileData) {
      if (err) return handle(err, req, students[0], res, next);

      db.query("SELECT `name` FROM `files-teachers` \
                WHERE `assignment_id` = ?",
                [req.assignment.id], function(err, teacherFiles) {
        if (err) return handle(err, req, students[0], res, next);

        var anyCompiled = false;
        for (var i = 0; i < fileData.length; i++) {
          fileData[i].display =
            isAscii(fileData[i].mime) ?
              fileData[i].contents :
              'This is a binary file. Download it to view it.';
          if (fileData[i].compiled) anyCompiled = true;

          var lastDot = fileData[i].name.lastIndexOf('.') + 1;
          if (lastDot >= fileData[i].name.length) lastDot = 0;
          fileData[i].extension = fileData[i].name.substring(lastDot);
          var imageExtensions = ['png', 'jpg', 'jpeg', 'gif'];
          if (imageExtensions.indexOf(fileData[i].extension) >= 0) {
            fileData[i].text = false;
            fileData[i].display = '<img src="data:image/' +
                                  fileData[i].extension + ';base64,';
            fileData[i].display += new Buffer(fileData[i].contents)
                                   .toString('base64');
            fileData[i].display += '" alt="' + fileData[i].name + '">';
          } else {
            fileData[i].text = true;
          }
        }
        var teacherNames = [];
        for (var i = 0; i < teacherFiles.length; i++) {
          teacherNames.push(teacherFiles[i].name);
        }
        db.query("SELECT \
                    `submissions`.`id` \
                  FROM \
                    `submissions` \
                    JOIN `students` \
                      ON `submissions`.`student_id` = `students`.`id` \
                  WHERE `submissions`.`assignment_id` = ? \
                  ORDER BY `students`.`lname`,`students`.`fname`",
                  [req.assignment.id], function(err, others) {
          if (err) return handle(err, req, students[0], res, next);

          var previous = -1;
          var next = -1;
          for (var i = 0; i < others.length; i++) {
            if (others[i].id == req.params.id) {
              if (i > 0) previous = others[i - 1].id;
              if (i < others.length - 1) next = others[i + 1].id;
              break;
            }
          }
          render('submission', {
            title: students[0].fname + ' ' + students[0].lname +
                   "'s submission to " + students[0].name,
            student: students[0],
            fileData: fileData,
            submission: req.submission,
            assignment: req.assignment,
            anyCompiled: anyCompiled,
            teacherFiles: teacherNames,
            previous: previous,
            next: next
          }, res);

        });

      });

    });

  });
});

router.post('/:id/updategrade', function(req, res, next) {
  submission.removeGrade(req.params.id, function(err) {
    if (err) {
      res.json({code: -1});
      err.handled = true;
      return next(err);
    }

    res.json({code: 0, newValue: '<em>Not graded.</em>'});
  });
});

router.post('/:id/updategrade/:grade', function(req, res, next) {
  submission.setGrade(req.params.id, req.params.grade, function(err) {
    if (err) {
      res.json({code: (err.jgCode || 300)}); // 300 = unknown error
      err.handled = true;
      return next(err);
    }

    res.json({code: 0, newValue: req.params.grade}); // success
  });
});

router.post('/:id/run/:fileIndex', function(req, res, next) {
  db.query(queries.teacher.submission.FILE,
           [req.params.id], function(err, rows) {
    if (err) {
      res.json({ code: -1 }); // unknown
      err.handled = true;
      return next(err);
    }

    if (rows.length <= 0) {
      return res.json({ code: 2 }); // invalid permissions
    }

    codeRunner.setupDirectory(rows, function(err, uniqueIds) {
      if (err) {
        res.json({code: -1}); // unknown
        err.handled = true;
        return next(err);
      }

      var uniqueId = uniqueIds[rows[0].student_id];

      var fileIndex = req.params.fileIndex;
      if (fileIndex >= rows.length || !rows[fileIndex].className) {
        return res.json({ code: 1 }); // invalid input
      }

      codeRunner.execute(uniqueId, rows[fileIndex].className, req.body.stdin,
                         function(err, stdout, stderr, overTime) {
        codeRunner.cleanup(uniqueId, function(err0) {
          var error = err || err0;
          if (error) {
            res.json({ code: -1 });
            error.handled = true;
            return next(error);
          }

          if (overTime) {
            stdout = '';
            stderr = 'Code took too long to execute! ' +
                     'There may be an infinite loop somewhere.';
          }

          res.json({
            code: 0,
            out: stdout,
            err: stderr
          });
        });
      });

    });

  });
});

router.get('/:id/test/:fileIndex', function(req, res, next) {
  db.query(queries.teacher.submission.FILE_EXTENDED,
           [req.params.id, req.user.id], function(err, files) {
    if (err) {
      res.json({code: -1});
      err.handled = true;
      return next(err);
    }

    db.query("SELECT `id`,`input`,`output` FROM `test-cases` \
              WHERE `assignment_id` = ?",
              [req.assignment.id], function(err, tests) {
      if (err) {
        res.json({code: -1});
        err.handled = true;
        return next(err);
      }

      codeRunner.setupDirectory(files, function(err, uniqueIds) {
        if (err) {
          res.json({ code: -1 });
          err.handled = true;
          return next(err);
        }

        if (req.params.fileIndex >= files.length) {
          return res.json({ code: 1 }); // invalid input
        }

        var uniqueId = uniqueIds[files[0].student_id];
        async.mapSeries(tests, function(test, callback) {
          codeRunner.execute(uniqueId, files[req.params.fileIndex].className,
                             test.input,
                             function(err, stdout, stderr, overTime) {
            if (err) {
              res.json({ code: -1 });
              err.handled = true;
              return callback(err);
            }

            if (overTime) {
              res.json({ code: 2 }); // code took too long to execute
            }

            if (stdout.length >= 1 &&
                stdout.charAt(stdout.length - 1) === '\n') {
              // truncate last new line character
              stdout = stdout.substring(0, stdout.length - 1);
            }
            callback(null, [stdout, stderr]);
          });
        }, function(err0, results) {
          codeRunner.cleanup(uniqueId, function(err1) {
            var err = err0 || err1;
            if (err) {
              res.json({code: -1});
              err.handled = true;
              return next(err);
            }

            var data = [];
            for (var i = 0; i < results.length; i++) {
              data.push({
                input: tests[i].input,
                expected: tests[i].output,
                result: results[i][0]
              });
            }
            res.json({ code: 0, results: data });
          });
        });

      });

    });

  });
});

router.get('/:id/download', function(req, res, next) {
  db.query(queries.teacher.submission.file,
           [req.params.id], function(err, rows) {
    if (err) return next(err);

    if (rows.length <= 0) {
      res.send('Sorry, an error has occurred.');
    } else {
      var zip = new JSZip();
      _.each(rows, function(row) {
        zip.file(row.name, row.contents);
      });
      var content = zip.generate({type: 'nodebuffer'});

      res.setHeader('Content-Disposition', 'attachment; filename=' +
                    req.params.id + '.zip');
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Description', 'File Transfer');
      res.send(content);
    }
  });
});

router.get('/:id/download/:fileIndex', function(req, res, next) {
  db.query(queries.teacher.submission.file, [req.params.id], function(err, rows) {
    if (err) return next(err);

    if (rows.length <= 0) {
      res.send('You do not have permission to download this file.');
    } else if (isNaN(req.params.fileIndex) ||
               req.params.fileIndex >= rows.length) {
      res.send('Sorry, an error has occurred.');
    } else {
      res.setHeader('Content-Disposition', 'attachment; filename=' +
                    rows[req.params.fileIndex].name);
      res.setHeader('Content-Description', 'File Transfer');
      res.send(rows[req.params.fileIndex].contents);
    }
  });
});

comments.setup(router, 'teacher');

module.exports = router;

