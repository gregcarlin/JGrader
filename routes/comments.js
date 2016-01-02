var _ = require('lodash');

var db = require('../controllers/db');
var comments = require('../controllers/comments');

var getComments = function(req, res, next, type) {
  comments.list(req.user.id, req.params.id, type, function(err, comments) {
    if (err) {
      res.json({ code: (err.jgCode || -1) });
      err.handled = true;
      return next(err);
    }

    res.json({code: 0, comments: comments});
  });
};

var postComment = function(req, res, next, type) {
  comments.post(req.body.tab, req.body.line, req.body.text, req.user.id, req.params.id, type, function(err, commentId, name) {
    if (err) {
      res.json({ code: (err.jgCode || -1) });
      err.handled = true;
      return next(err);
    }

    res.json({
      code: 0,
      id: commentId,
      tab: req.body.tab,
      line: req.body.line,
      timestamp: Date.now(),
      message: req.body.text,
      name: name,
      owns: true
    });
  });
};

var deleteComment = function(req, res, next, type) {
  comments.remove(req.user.id, req.params.commentId, type, function(err) {
    if (err) {
      res.json({ code: (err.jgCode || -1) });
      err.handled = true;
      return next(err);
    }

    res.json({ code: 0 });
  });
};

var editComment = function(req, res, next, type) {
  comments.edit(req.body.text, req.user.id, req.params.commentId, type, function(err) {
    if (err) {
      res.json({ code: (err.jgCode || -1) });
      err.handled = true;
      return next(err);
    }

    res.json({ code: 0 });
  });
};

// converts assignment ids from student requests to submission ids
var process = function(func, req, res, next, type) {
  if (type == 'student') {
    db.query("SELECT `id` FROM `submissions` \
              WHERE `assignment_id` = ? AND `student_id` = ?",
              [req.params.id, req.user.id], function(err, result) {
      if (err) return next(err);

      req.params.id = result[0].id;
      func(req, res, next, type);
    });
  } else {
    func(req, res, next, type);
  }
};

var setup = function(router, type) {
  router.get('/:id/comment', function(req, res, next) {
    process(getComments, req, res, next, type);
  });
  router.post('/:id/comment', function(req, res, next) {
    process(postComment, req, res, next, type);
  });
  router.post('/:id/comment/:commentId/delete', function(req, res, next) {
    process(deleteComment, req, res, next, type);
  });
  router.post('/:id/comment/:commentId/edit', function(req, res, next) {
    process(editComment, req, res, next, type);
  });
};

module.exports = {setup: setup};
