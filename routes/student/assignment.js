// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

require('../common');
var router = express.Router();
var multer = require('multer');
var strftime = require('strftime');
var _ = require('lodash');
var async = require('async');
var exec = require('child_process').exec;
var fs = require('fs-extra');

var assignment = require('../../controllers/student/assignment');
var comments = require('../../controllers/comments');
var codeRunner = require('../../controllers/codeRunner');
var errorCode = require('../../util/errorCode');

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
      options.js = ['tooltip'];
      options.css = ['font-awesome.min'];
      options.strftime = strftime;
      break;
    case 'assignment':
      // title should already be set
      options.js = ['dropzone', 'student/submit', 'tooltip'];
      options.css = ['font-awesome.min'];
      options.strftime = strftime;
      break;
    case 'assignmentComplete':
      // title should already be set
      options.js = ['prettify', 'student/submitted', 'comments', 'tooltip'];
      options.css = ['prettify', 'font-awesome.min'];
      options.strftime = strftime;
      break;
  }
  renderGenericStudent(page, options, res);
};

// The page that lists the assignments
router.get('/', function(req, res, next) {
  assignment.list(req.user.id, function(err, rows) {
    if (err) {
      render('assignmentList', {
        rows: [],
        error: 'An unexpected error has occurred.'
      }, res);
      err.handled = true;
      return next(err);
    }

    render('assignmentList', {rows: rows}, res);
  });
});

router.use('/:id', function(req, res, next) {
  assignment.verify(req.params.id, req.user.id, function(err, assignment, section) {
      if (err) {
        render('notFound', {error: 'An unexpected error has occurred.'}, res);
        err.handled = true;
        return next(err);
      }

      if (!assignment || !section) {
        render('notFound', {}, res);
      } else {
        req.assignment = assignment;
        req.section = section;
        next();
      }
    });
});

// Gets the assignment information based on id
router.get('/:id', function(req, res, next) {
  assignment.get(req.params.id, req.user.id, function(err, data) {
    if (err) {
      render('notFound', {error: 'An unexpected error has occurred.'}, res);
      err.handled = true;
      return next(err);
    }

    if (data.fileData.length == 0) {
      render('assignment', {
        title: req.assignment.name,
        assignment: req.assignment,
        teacherFiles: data.teacherFiles
      }, res);
    } else {
      render('assignmentComplete', _.extend(data, {
        title: req.assignment.name,
        assignment: req.assignment
      }), res);
    }
  });
});

router.use('/:id/submit', multer({
  inMemory: false,
  putSingleFilesInArray: true,
  rename: function(fieldname, filename) {
    // don't rename
    return filename;
  },
  changeDest: function(dest, req, res) {
    var directory = './temp/' + req.user.id + '/';
    // note: i tried the async version of this but i got weird errors
    fs.ensureDirSync(directory);
    return directory;
  }
}));

router.post('/:id/submit', function(req, res, next) {
  assignment.submit(req.params.id, req.user.id, req.files, function(err) {
    if (err) {
      if (req.body.fallback) {
        res.redirect('/student/assignment/' + req.params.id + '?error=' + errorCode(err.jgCode || 301));
      } else {
        res.json({ code: err.jgCode });
      }
      err.handled = true;
      return next(err);
    }

    if (req.body.fallback) {
      return res.redirect('/student/assignment/' + req.params.id);
    } else {
      return res.json({ code: 0 });
    }
  });
});

router.get('/:id/resubmit', function(req, res, next) {
  connection.query("SELECT `submissions`.`id` \
                    FROM `submissions` \
                    WHERE `submissions`.`student_id` = ? \
                    AND `submissions`.`assignment_id` = ?",
                    [req.user.id, req.params.id], function(err, rows) {
    if (err) {
      res.redirect('/student/assignment');
      err.handled = true;
      return next(err);
    }

    if (rows.length == 0) {
      // User has not submitted so cannot resubmit
      console.error('USER ' + req.user.id +
                    ' IS TRYING TO RESUBMIT BUT SHOULDNT BE');
      res.redirect('/student/assignment');
    } else {
      // Means user has already submitted and is able to resubmit
      connection.query("DELETE FROM `files` WHERE `submission_id` = ?; \
                        DELETE FROM `submissions` \
                            WHERE `assignment_id` = ? \
                            AND `student_id` = ?; \
                        DELETE FROM `comments` WHERE `submission_id` = ?",
                        [rows[0].id, req.params.id, req.user.id, rows[0].id],
                        function(err, rows) {
        if (err) {
          res.redirect('/student/assignment/');
          err.handled = true;
          return next(err);
        }

        res.redirect('/student/assignment/' + req.params.id);
      });
    }
  });
});

router.get('/:id/chooseMain/:file', function(req, res, next) {
  assignment.chooseMain(req.params.id, req.user.id, req.params.file, function(err) {
    if (err) {
      res.redirect('/student/assignment/' + req.params.id +
                  '?error=' + errorCode(err.jgCode || 400));
      err.handled = true;
      return next(err);
    }

    res.redirect('/student/assignment/' + req.params.id);
  });
});

comments.setup(router, 'student');

module.exports = router;
