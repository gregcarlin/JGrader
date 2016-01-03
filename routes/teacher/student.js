// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

var strftime = require('strftime');
var _ = require('lodash');

require('../common');
var router = express.Router();
var db = require('../../controllers/db');
var errorCode = require('../../util/errorCode');
var student = require('../../controllers/teacher/student');
var queries = require('../../queries/queries');

var render = function(page, options, res) {
  options.page = 2;
  switch (page) {
    case 'notFound':
      options.title = 'Student Not Found';
      options.type = 'student';
      page = '../' + page;
      break;
    case 'studentList':
      options.title = 'Your Students';
      options.js = [
                    'tooltip',
                    'teacher/studentList',
                    'stupidtable.min',
                    'tablesort'
                   ];
      options.css = ['font-awesome.min'];
      break;
    case 'student':
      // title must be set already
      options.js = ['tooltip', 'stupidtable.min', 'tablesort'];
      options.css = ['font-awesome.min'];
      options.strftime = strftime;
      break;
    case 'studentInvite':
      options.title = 'Invite Students';
      break;
  }
  renderGenericTeacher(page, options, res);
};

router.get('/', function(req, res, next) {
  db.query(queries.teacher.student.LIST, [req.user.id, req.user.id, req.user.id], function(err, rows) {
    if (err) {
      render('notFound', {error: 'An unexpected error has occurred.'}, res);
      err.handled = true;
      return next(err);
    }

    render('studentList', {rows: rows}, res);
  });
});

router.get('/invite', function(req, res, next) {
  db.query("SELECT `id`,`name` FROM `sections` WHERE `teacher_id` = ? \
            ORDER BY `name` ASC", [req.user.id], function(err, rows) {
    if (err) {
      render('studentInvite', {error: 'An unknown error has occurred.'}, res);
      err.handled = true;
      return next(err);
    }

    render('studentInvite', {sections: rows}, res);
  });
});

router.post('/invite', function(req, res, next) {
  db.query("SELECT `id`,`name` FROM `sections` WHERE `teacher_id` = ? \
            ORDER BY `name` ASC", [req.user.id], function(err, rows) {
    if (err) {
      render('studentInvite', {error: 'An unknown error has occurred.'}, res);
      err.handled = true;
      return next(err);
    }

    if (!req.body.emails) {
      render('studentInvite', {
        error: 'No emails were specified so no invitations were sent.',
        sections: rows
      }, res);
    }

    student.invite(req.body.section, req.user.id, req.body.emails, function(err, sent) {
      if (err) {
        render('studentInvite', {
          error: errorCode(err.jgCode || 300),
          sections: rows
        }, res);
        err.handled = true;
        return next(err);
      }

      render('studentInvite', {
        success: 'Invitations have been sent to the following ' +
                  'addresses: ' + sent,
        sections: rows
      }, res);
    });
  });
});

router.use('/:id', function(req, res, next) {
  db.query({
    sql: queries.teacher.student.SECTIONS,
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
      req.student = result[0].students;
      req.sections = [];
      _.each(result, function(r) {
        req.sections[i] = r.sections;
      });
      next();
    }
  });
});

router.get('/:id.csv', function(req, res, next) {
  db.query(queries.teacher.student.CSV_INFO, [req.params.id, req.user.id], function(err, rows) {
    if (err) return next(err);

    res.setHeader('Content-Disposition', 'attachment; filename=student_' +
                  req.params.id + '.csv');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Descrption', 'File Transfer');
    var output = 'Assignment,Section,Grade\n';
    _.each(rows, function(row) {
      output += row.name + ',' + row.sname + ',' +
                (row.grade || (row.id ? 'Not Graded' : 'Not Submitted')) + '\n';
    });
    res.send(output);
  });
});

router.get('/:id', function(req, res, next) {
  db.query(queries.teacher.student.INFO, [req.params.id, req.user.id], function(err, rows) {
    if (err) {
      render('notFound', {error: 'An unexpected error has occurred.'}, res);
      err.handled = true;
      return next(err);
    }

    var name = req.student.fname + ' ' + req.student.lname;
    render('student', {
      title: name,
      name: name,
      rows: rows,
      id: req.params.id
    }, res);
  });
});

router.get('/:id/:section/delete', function(req, res, next) {
  db.query("DELETE FROM `enrollment` \
            WHERE `student_id` = ? AND `section_id` = ? LIMIT 1",
            [req.params.id, req.params.section],
            function(err, result) {
    if (err) {
      render('notFound', {
        error: 'Unable to remove student. Please go back and try again.'
      }, res);
      err.handled = true;
      return next(err);
    }

    res.redirect('/teacher/student');
  });
});

module.exports = router;
