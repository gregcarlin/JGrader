var _ = require('lodash');

var getComments = function(req, res, next, type) {
  connection.query("SELECT \
                      `comments`.`id`,\
                      `comments`.`tab`,\
                      `comments`.`line`,\
                      `comments`.`commenter_type`,\
                      `comments`.`commenter_id`,\
                      `comments`.`timestamp`,\
                      `comments`.`message`,\
                      `teachers`.`fname` AS `tfname`,\
                      `teachers`.`lname` AS `tlname`,\
                      `students`.`fname` AS `sfname`,\
                      `students`.`lname` AS `slname`,\
                      `assistants`.`fname` AS `afname`,\
                      `assistants`.`lname` AS `alname` \
                    FROM `comments` \
                    JOIN `submissions` \
                      ON `comments`.`submission_id` = `submissions`.`id` \
                    JOIN `assignments` \
                      ON `submissions`.`assignment_id` = `assignments`.`id` \
                    JOIN `sections` \
                      ON `assignments`.`section_id` = `sections`.`id` \
                    LEFT JOIN `teachers` \
                      ON `teachers`.`id` = `comments`.`commenter_id` \
                    LEFT JOIN `students` \
                      ON `students`.`id` = `comments`.`commenter_id` \
                    LEFT JOIN `assistants` \
                      ON `assistants`.`id` = `comments`.`commenter_id` \
                    WHERE (\
                      (`sections`.`teacher_id` = ? AND \
                       'teacher' = '" + type + "') OR \
                      (`submissions`.`student_id` = ? AND \
                       'student' = '" + type + "')) AND \
                      `comments`.`submission_id` = ?",
                    [req.user.id, req.user.id, req.params.id],
                    function(err, rows) {
    if (err) {
      res.json({ code: -1 });
      err.handled = true;
      return next(err);
    }

    _.each(rows, function(row) {
      switch (row.commenter_type) {
        case 'teacher':
          row.name = row.tfname + ' ' + row.tlname;
          break;
        case 'student':
          row.name = row.sfname + ' ' + row.slname;
          break;
        case 'assistant':
          row.name = row.afname + ' ' + row.alname;
          break;
      }
      row.owns = type == row.commenter_type && req.user.id == row.commenter_id;
      delete row.tfname;
      delete row.tlname;
      delete row.sfname;
      delete row.slname;
      delete row.afname;
      delete row.alname;
      delete row.commenter_type;
      delete row.commenter_id;
    });

    res.json({code: 0, comments: rows});
  });
};

// used in postComment to ensure that a user has permission to post a comment
var security = function(req, type, finish) {
  switch (type) {
    case 'teacher':
      connection.query("SELECT * \
                        FROM `submissions`,`assignments`,`sections` \
                        WHERE \
                          `submissions`.`assignment_id` = \
                            `assignments`.`id` AND \
                          `assignments`.`section_id` = `sections`.`id` AND \
                          `submissions`.`id` = ? AND \
                          `sections`.`teacher_id` = ?",
                          [req.params.id, req.user.id], finish);
      break;
    case 'student':
      connection.query("SELECT * FROM `submissions` \
                        WHERE `id` = ? AND `student_id` = ?",
                        [req.params.id, req.user.id], finish);
      break;
    case 'assistant':
      // todo when assistants are implemented
      break;
  }
};

var postComment = function(req, res, next, type) {
  if (req.body.tab && req.body.line && req.body.text) {
    security(req, type, function(err, result) {
      if (err) {
        res.json({ code: -1 });
        err.handled = true;
        return next(err);
      }

      if (result.length <= 0) {
        return res.json({code: 2}); // invalid permissions (i think this is the right code)
      }

      connection.query("INSERT INTO `comments` \
                        VALUES(NULL, ?, ?, ?, '" + type + "', ?, \
                          CURRENT_TIMESTAMP(), ?)",
                        [req.params.id, req.body.tab, req.body.line,
                         req.user.id, req.body.text],
                        function(err, result) {
        if (err) {
          res.json({ code: -1 });
          err.handled = true;
          return next(err);
        }

        connection.query("SELECT `fname`,`lname` FROM `" + type + "s` \
                          WHERE `id` = ?",
                         [req.user.id], function(err, user) {
          if (err) {
            res.json({ code: -2 }); // it semi worked, but page needs to be reloaded
            err.handled = true;
            return next(err);
          }

          res.json({
            code: 0,
            id: result.insertId,
            tab: req.body.tab,
            line: req.body.line,
            timestamp: Date.now(),
            message: req.body.text,
            name: (user[0].fname + ' ' + user[0].lname),
            owns: true
          });
        });
      });
    });
  } else {
    res.json({code: 1}); // missing data. i'm just making up codes here
  }
};

var deleteComment = function(req, res, next, type) {
  // security to ensure this user owns this submission
  connection.query("DELETE FROM `comments` \
                    WHERE `id` = ? AND \
                          `commenter_type` = ? AND \
                          `commenter_id` = ?",
                   [req.params.commentId, type, req.user.id],
                   function(err, result) {
    if (err) {
      res.json({ code: -1 });
      err.handled = true;
      return next(err);
    }

    res.json({code: 0});
  });
};

var editComment = function(req, res, next, type) {
  if (req.body.text) {
    connection.query("UPDATE `comments` SET `message` = ? \
                      WHERE `id` = ? AND \
                            `commenter_type` = ? AND \
                            `commenter_id` = ?",
                     [req.body.text, req.params.commentId, type, req.user.id],
                     function(err, result) {
      if (err) {
        res.json({ code: -1 });
        err.handled = true;
        return next(err);
      }

      res.json({code: 0});
    });
  } else {
    res.json({code: 1}); // missing data, i guess
  }
};

// converts assignment ids from student requests to submission ids
var process = function(func, req, res, next, type) {
  if (type == 'student') {
    connection.query("SELECT `id` FROM `submissions` \
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
