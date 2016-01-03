// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

var strftime = require('strftime');

require('../common');
var router = express.Router();
var db = require('../../controllers/db');
var section = require('../../controllers/teacher/section');
var queries = require('../../queries/queries');

var render = function(page, options, res) {
  options.page = 0;
  switch (page) {
    case 'notFound':
      options.title = 'Class Not Found';
      options.type = 'section';
      page = '../' + page;
      break;
    case 'sectionList':
      options.title = 'Your Classes';
      options.js = [
                    'tooltip',
                    'teacher/sectionList',
                    'stupidtable.min',
                    'tablesort'
                   ];
      options.css = ['font-awesome.min'];
      break;
    case 'sectionCreate':
      options.title = 'Create a Class';
      break;
    case 'section':
      // title must be set already
      options.js = ['tooltip', 'teacher/edit', 'stupidtable.min', 'tablesort'];
      options.css = ['font-awesome.min'];
      options.strftime = strftime;
      break;
  }
  renderGenericTeacher(page, options, res);
};

// page for listing sections
router.get('/', function(req, res, next) {
  db.query(queries.teacher.section.LIST, [req.user.id], function(err, rows) {
    if (err) {
      render('sectionList', {
        rows: [],
        error: 'An unexpected error has occurred.'
      }, res);
      err.handled = true;
      return next(err);
    }

    render('sectionList', {rows: rows}, res);
  });
});

// page for creating a new section
router.get('/create', function(req, res, next) {
  render('sectionCreate', {}, res);
});

// handles request to create a section
router.post('/create', function(req, res, next) {
  var name = req.body.name;
  if (!name || name.length <= 0) {
    return render('sectionCreate', {
      error: 'Name cannot be blank.',
      name: name
    }, res);
  }

  section.create(req.user.id, name, function(err, sectionId) {
    if (err) {
      render('sectionCreate', {
        error: ('An unknown error has occurred. ' +
                'Please try again later.'),
        name: name
      }, res);
      err.handled = true;
      return next(err);
    }

    res.redirect('/teacher/section/' + sectionId); // redirect teacher to page of newly created section
  });
});

router.use('/:id', function(req, res, next) {
  db.query("SELECT * FROM `sections` \
            WHERE `id` = ? AND `teacher_id` = ?",
            [req.params.id, req.user.id], function(err, result) {
    if (err) {
      render('notFound', {error: 'An unknown error has occurred.'}, res);
      err.handled = true;
      return next(err);
    }

    if (result.length <= 0) {
      render('notFound', {}, res);
    } else {
      req.section = result[0];
      next();
    }
  });
});

// page providing info on a specific section
router.get('/:id', function(req, res, next) {
  db.query(queries.teacher.section.INFO, [req.params.id, req.params.id], function(err, results) {
    if (err) {
      render('notFound', {error: 'Error getting section'}, res);
      err.handled = true;
      return next(err);
    }

    render('section', {
      title: req.section.name,
      sectionName: req.section.name,
      sectionID: req.params.id,
      sectionCode: req.section.code,
      rows: results
    }, res);
  });
});

// POST request to update name of section
router.post('/:id/updatename/:name', function(req, res) {
  section.setName(req.params.id, req.params.name, function(err) {
    if (err) {
      res.json({code: -1}); // unknown error
      err.handled = true;
      return next(err);
    }

    res.json({code: 0, newValue: req.params.name});
  });
});

// request for deleting a section
router.get('/:id/delete', function(req, res, next) {
  section.remove(req.params.id, function(err) {
    if (err) {
      render('notFound', {
        error: 'Unable to delete class. Please go back and try again.'
      }, res);
      err.handled = true;
      return next(err);
    }

    res.redirect('/teacher/section');
  });
});

module.exports = router;
