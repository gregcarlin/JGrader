// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

require('../common');
var router = express.Router();
var strftime = require('strftime');

var section = require('../../controllers/student/section');
var errorCode = require('../../util/util').errorCode;

var render = function(page, options, res) {
  options.page = 0;
  switch (page) {
    case 'notFound':
      options.title = 'Class Not Found';
      options.type = 'class';
      page = '../' + page;
      break;
    case 'sectionList':
      options.title = 'Your Classes';
      options.js = ['tooltip', 'student/sectionList'];
      options.css = ['font-awesome.min'];
      break;
    case 'section':
      // title should already be set
      options.js = ['tooltip', 'student/sectionList'];
      options.css = ['font-awesome.min'];
      options.strftime = strftime;
      break;
    case 'joinSection':
      options.title = 'Join a Class';
      break;
  }
  renderGenericStudent(page, options, res);
};

// Lists all of the current sections (classes)
router.get('/', function(req, res, next) {
  section.list(req.user.id, function(err, rows) {
    if (err) {
      render('notFound', {error: 'An unexpected error has occurred.'}, res);
      err.handled = true;
      return next(err);
    }

    render('sectionList', {rows: rows}, res);
  });
});

// Asks user for class password
router.get('/joinSection/:code?', function(req, res, next) {
  render('joinSection', {code: req.params.code}, res);
});

// Joins Class
router.post('/joinSection', function(req, res, next) {
  section.enroll(req.user.id, req.body.sectionID, function(err, sectionId) {
    if (err) {
      render('joinSection', {
        error: errorCode(err.jgCode || 301)
      }, res);
      err.handled = true;
      return next(err);
    }

    res.redirect('/student/section/' + sectionId);
  });
});

router.use('/:id', function(req, res, next) {
  section.verify(req.params.id, req.user.id, function(err, section) {
    if (err) {
      render('notFound', {error: 'An unexpected error has occurred.'}, res);
      err.handled = true;
      return next(err);
    }

    if (!section) {
      render('notFound', {}, res);
    } else {
      req.section = section;
      next();
    }
  });
});

// Gets information for specific class
router.get('/:id', function(req, res, next) {
  section.get(req.params.id, req.user.id, function(err, rows) {
    if (err) {
      render('notFound', {error: 'An unexpected error has occurred.'}, res);
      err.handled = true;
      return next(err);
    }

    render('section', {
      name: req.section.name,
      rows: rows,
      id: req.params.id
    }, res);
  });
});

// drop a class
router.get('/:id/delete', function(req, res, next) {
  section.drop(req.params.id, req.user.id, function(err) {
    if (err) return next(err);

    res.redirect('/student/section');
  });
});

module.exports = router;
