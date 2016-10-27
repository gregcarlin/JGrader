// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

var strftime = require('strftime');
var multer = require('multer');
var async = require('async');
var _ = require('lodash');
var fs = require('fs-extra');

require('../common');
var router = express.Router();
var db = require('../../controllers/db');
var errorCode = require('../../util/errorCode');
var codeRunner = require('../../controllers/codeRunner');
var assignment = require('../../controllers/teacher/assignment');
var queries = require('../../queries/queries');

var render = function(page, options, res) {
  options.page = 1;
  switch (page) {
    case 'notFound':
      options.title = 'Assignment Not Found';
      options.type = 'assignment';
      page = '../' + page;
      break;
    case 'assignmentList':
      options.title = 'Your Assignments';
      options.js = [
                    'tooltip',
                    'teacher/assignmentList',
                    'stupidtable.min',
                    'tablesort'
                   ];
      options.css = ['font-awesome.min'];
      options.strftime = strftime;
      break;
    case 'assignmentCreate':
      options.title = 'Create an Assignment';
      options.js = [
                    'teacher/jquery.datetimepicker',
                    'teacher/datepicker',
                    'dropzone',
                    'teacher/upload'
                   ];
      options.css = ['jquery.datetimepicker'];
      break;
    case 'assignment':
      // title must be set already
      options.js = [
                    'tooltip',
                    'strftime-min',
                    'teacher/edit',
                    'teacher/jquery.datetimepicker',
                    'teacher/datepicker',
                    'stupidtable.min',
                    'tablesort',
                    'dropzone',
                    'teacher/assignment'
                   ];
      options.css = ['jquery.datetimepicker', 'font-awesome.min'];
      options.strftime = strftime;
      break;
    case 'testCaseList':
      options.js = ['tooltip', 'teacher/testCaseList'];
      options.css = ['font-awesome.min'];
      break;
    case 'caseCreate':
      options.js = ['teacher/caseCreate'];
      break;
  }
  renderGenericTeacher(page, options, res);
};

// page that lists assignments
router.get('/', function(req, res, next) {
  assignment.list(req.user.id, function(err, assignments) {
    if (err) {
      render('assignmentList', {
        rows: [],
        error: 'An unexpected error has occurred.'
      }, res);
      err.handled = true;
      return next(err);
    }

    render('assignmentList', {rows: assignments}, res);
  });
});


// page for creating a new assignment
router.get('/create/:preselect?', function(req, res, next) {
  assignment.listSections(req.user.id, function(err, rows) {
    if (err) {
      render('assignmentCreate', {
        error: 'An unexpected error has occurred.',
        rows: []
      }, res);
      err.handled = true;
      return next(err);
    }

    if (rows.length <= 0) {
      render('assignmentCreate', {
        error: 'You must create a section before you can create an assignment.',
        rows: [],
        preselect: req.params.preselect
      }, res);
    } else {
      render('assignmentCreate', {
        rows: rows,
        preselect: req.params.preselect
      }, res);
    }
  });
});

router.use('/create', multer({
  inMemory: true,
  rename: function(fieldname, filename) {
    // don't rename
    return filename;
  },
  changeDest: function(dest, req, res) {
    var directory = './uploads-teacher/' + req.user.id + '/';
    fs.ensureDirSync(directory);
    return directory;
  }
}));

// handles request to create an assignment
router.post('/create', function(req, res, next) {
  var name = req.body.name;
  var desc = req.body.desc;
  var due  = req.body.due;
  var secs = req.body.section;
  if (!name || !due) {
    assignment.listSections(req.user.id, function(err, rows) {
      if (err) return next(err);

      render('assignmentCreate', {
        error: 'Name and due date must both be filled out.',
        rows: rows,
        name: name,
        desc: desc,
        due: due
      }, res);
    });
  } else if (!secs) {
    assignment.listSections(req.user.id, function(err, rows) {
      if (err) return next(err);

      render('assignmentCreate', {
        error: 'You must select at least one section.',
        rows: rows,
        name: name,
        desc: desc,
        due: due
      }, res);
    });
  } else {
    async.each(secs, function(sec, cb) {
      assignment.create(req.user.id, sec, name, desc, due, req.files, cb);
    }, function(err) {
      if (err && !(err.jgCode && err.jgCode < 300)) return next(err);

      if (err) {
        render('assignmentCreate', {
          error: errorCode(err.jgCode),
          name: name,
          desc: desc,
          due: due
        }, res);
        err.handled = true;
        return next(err);
      }

      res.redirect('/teacher/assignment');
    });
  }
});

router.use('/:id', function(req, res, next) {
  db.query({
    sql: queries.teacher.assignment.SECTIONS,
    nestTables: true,
    values: [req.params.id, req.user.id]
  }, function(err, result) {
    if (err) {
      render('notFound', {error: 'An unexpected error has occurred.'}, res);
      err.handled = true;
      return next(err);
    }
    if (result.length <= 0) {
      return render('notFound', {}, res);
    }

    req.assignment = result[0].assignments;
    req.section = result[0].sections;
    next();
  });
});

router.get('/:id.csv', function(req, res, next) {
  assignment.exportOne(req.params.id, function(err, output) {
    if (err) return next(err);

    res.setHeader('Content-Disposition', 'attachment; filename=assignment_' +
                  req.params.id + '.csv');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Description', 'File Transfer');
    res.send(output);
  });
});

router.get('/:id', function(req, res, next) {
  db.query(queries.teacher.assignment.INFO, [req.params.id, req.section.id], function(err, results) {
    if (err) {
      render('notFound', {error: 'An unexpected error has occurred.'}, res);
      err.handled = true;
      return next(err);
    }
    _.each(results, function(result) {
      result.passed_tests = result.passed_tests || 0;
      result.failed_tests = result.failed_tests || 0;
    });

    db.query("SELECT `name` FROM `files-teachers` \
              WHERE `assignment_id` = ?",
              [req.params.id], function(err, files) {
      if (err) {
        render('notFound', {error: 'An unexpected error has occurred.'}, res);
        err.handled = true;
        return next(err);
      }

      var submitted = 0;
      _.each(results, function(result) {
        if (result.submitted) submitted++;
      });

      render('assignment', {
        title: req.assignment.name,
        assignment: req.assignment,
        section: req.section,
        results: results,
        id: req.params.id,
        files: files,
        submitted: submitted
      }, res);
    });
  });
});

// detach a file from this assignment
router.get('/:id/remove/:file', function(req, res, next) {
  assignment.removeFile(req.params.id, req.params.file, function(err) {
    if (err) {
      res.redirect('/teacher/assignment/' + req.params.id + '?error=' +
                   (err.jgCode ? errorCode(jgCode) : errorCode(351, req.params.file)));
      err.handled = true;
      return next(err);
    }

    res.redirect('/teacher/assignment/' + req.params.id + '?success=' +
                 req.params.file + ' has been removed.');
  });
});

router.use('/:id/add', multer({
  inMemory: true,
  rename: function(fieldname, filename) {
    // don't rename
    return filename;
  }
}));

// add a new file to this assignment
router.post('/:id/add', function(req, res, next) {
  assignment.addFile(req.params.id, req.files.file, function(err) {
    if (err) {
      res.json({code: (err.code || -1)});
      err.handled = true;
      return next(err);
    }

    res.json({code: 0});
  });
});

// update description
router.post('/:id/updatedesc/:desc', function(req, res, next) {
  assignment.setDescription(req.params.id, req.params.desc, function(err) {
    if (err) {
      res.json({code: (err.jgCode || 300)});
      err.handled = true;
      return next(err);
    }

    res.json({code: 0, newValue: req.params.desc});
  });
});

// update description to nothing
router.post('/:id/updatedesc', function(req, res, next) {
  db.query("UPDATE `assignments` SET `description` = NULL \
            WHERE `id` = ?", [req.params.id], function(err, rows) {
    if (err) {
      res.json({code: -1}); // unknown error
      err.handled = true;
      return next(err);
    }

    res.json({code: 0, newValue: ''}); // success
  });
});

router.post('/:id/updatedue/:due', function(req, res, next) {
  assignment.setDue(req.params.id, req.params.due, function(err) {
    if (err) {
      res.json({code: (err.code || -1)}); // unknown error
      err.handled = true;
      return next(err);
    }

    res.json({code: 0, newValue: req.params.due});
  });
});

router.get('/:id/delete', function(req, res, next) {
  assignment.remove(req.params.id, function(err) {
    if (err) {
      render('notFound', {
        error: 'Unable to delete assignment. Please go back and try again.'
      }, res);
      err.handled = true;
      return next(err);
    }

    res.redirect('/teacher/assignment');
  });
});

router.get('/:id/testCase', function(req, res, next) {
  db.query('SELECT `name`,`id` \
            FROM `assignments` \
            WHERE `id` = ?',
            [req.params.id], function(err, assignment) {
    if (err) {
      render('notFound', {
        error: ('The server was unable to retrieve the test case information.' +
                ' Please try again.')
      }, res);
      err.handled = true;
      return next(err);
    }

    db.query('SELECT `id`,`input`,`output` \
              FROM `test-cases` \
              WHERE `assignment_id` = ?',
              [req.params.id], function(err, testCases) {
      if (err) {
        render('notFound', {
          error: ('The server was unable to retrieve the test case' +
                  ' information. Please try again.')
        }, res);
        err.handled = true;
        return next(err);
      }

      render('testCaseList', {
        testCases: testCases,
        assignment: assignment[0]
      }, res);
    });
  });
});

router.get('/:id/testCase/delete/:testID', function(req, res, next) {
  db.query('DELETE FROM `test-cases` \
            WHERE `assignment_id` = ? AND `id` = ? LIMIT 1',
            [req.params.id, req.params.testID],
            function(err, assignment) {
    if (err) {
      render('notFound', {
        error: ('The server was unable to delete the test case. ' +
                'Please try again.')
      }, res);
      err.handled = true;
      return next(err);
    }

    codeRunner.runTestsForAssignment(req.params.id, function(err) {
      if (err) {
        render('notFound', {
          error: ('The server was unable to delete the test case. ' +
                  'Please try again.')
        }, res);
        err.handled = true;
        return next(err);
      }

      res.redirect('/teacher/assignment/' + req.params.id + '/testCase');
    });
  });
});

router.get('/:id/caseCreate', function(req, res) {
  render('caseCreate', {}, res);
});

router.post('/:id/caseCreate', function(req, res, next) {
  if (req.body.in_case && req.body.out_case) {
    var string = '';
    var params = [];
    for (var i in req.body.in_case) {
      if (req.body.in_case[i] && i < req.body.out_case.length &&
          req.body.out_case[i]) {
        string += '(NULL, ?, ?, ?),';
        params.push(req.params.id);
        params.push(req.body.in_case[i]);
        params.push(req.body.out_case[i]);
      }
    }
    if (params.length > 0) {
      string = string.substr(0, string.length - 1);
      db.query('INSERT INTO `test-cases` VALUES ' + string, params,
                function(err, rows) {
        if (err) {
          render('notFound', {
            error: ('The server was unable to create the test case. ' +
                    'Please try again.')
          }, res);
          err.handled = true;
          return next(err);
        }

        codeRunner.runTestsForAssignment(req.params.id, function(err) {
          if (err) {
            render('notFound', {
              error: ('The server was unable to create the test case. ' +
                      'Please try again.')
            }, res);
            err.handled = true;
            return next(err);
          }

          res.redirect('/teacher/assignment/' + req.params.id + '/testCase');
        });
      });
    } else {
      // not enough data sent, don't add any cases and just redirect
      res.redirect('/teacher/assignment/' + req.params.id + '/testCase');
    }
  } else {
    // no data sent, don't add any cases and just redirect
    res.redirect('/teacher/assignment/' + req.params.id + '/testCase');
  }
});

router.get('/:id/runTestCases', function(req, res, next) {
  codeRunner.runTestsForAssignment(req.params.id, function(err) {
    if (err) return next(err);

    res.redirect('/teacher/assignment/' + req.params.id);
  });
});

module.exports = router;
