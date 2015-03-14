var type = '';

var getComments = function(req, res) {
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
                    JOIN `submissions` ON `comments`.`submission_id` = `submissions`.`id` \
                    JOIN `assignments` ON `submissions`.`assignment_id` = `assignments`.`id` \
                    JOIN `sections` ON `assignments`.`section_id` = `sections`.`id` \
                    LEFT JOIN `teachers` ON `teachers`.`id` = `comments`.`commenter_id` \
                    LEFT JOIN `students` ON `students`.`id` = `comments`.`commenter_id` \
                    LEFT JOIN `assistants` ON `assistants`.`id` = `comments`.`commenter_id` \
                    WHERE `sections`.`teacher_id` = ? AND `comments`.`submission_id` = ?", [req.user.id, req.params.id], function(err, rows) {
    if(err) {
      res.json({code: -1});
      throw err;
    } else if(rows.length <= 0) {
      res.json({code: 2}); // invalid permissions (code may or may not be correct, see post method below as well)
    } else {
      for(i in rows) {
        switch(rows[i].commenter_type) {
          case 'teacher':
            rows[i].name = rows[i].tfname + ' ' + rows[i].tlname;
            break;
          case 'student':
            rows[i].name = rows[i].sfname + ' ' + rows[i].slname;
            break;
          case 'assistant':
            rows[i].name = rows[i].afname + ' ' + rows[i].alname;
            break;
        }
        rows[i].owns = type == rows[i].commenter_type && req.user.id == rows[i].commenter_id;
        delete rows[i].tfname;
        delete rows[i].tlname;
        delete rows[i].sfname;
        delete rows[i].slname;
        delete rows[i].afname;
        delete rows[i].alname;
        delete rows[i].commenter_type;
        delete rows[i].commenter_id;
      }
      res.json({code: 0, comments: rows});
    }
  });
};

// used in postComment to ensure that a user has permission to post a comment
var security = function(req, finish) {
  switch(type) {
    case 'teacher':
      connection.query("SELECT * \
                        FROM `submissions`,`assignments`,`sections` \
                        WHERE \
                          `submissions`.`assignment_id` = `assignments`.`id` AND \
                          `assignments`.`section_id` = `sections`.`id` AND \
                          `submissions`.`id` = ? AND \
                          `sections`.`teacher_id` = ?", [req.params.id, req.user.id], finish);
      break;
    case 'student':
      connection.query("SELECT * \
                        FROM `submissions`,`assignments`,`sections`,`enrollment` \
                        WHERE \
                          `submissions`.`assignment_id` = `assignments`.`id` AND \
                          `assignments`.`section_id` = `sections`.`id` AND \
                          `sections`.`id` = `enrollment`.`section_id` AND \
                          `submissions`.`id` = ? AND \
                          `enrollment`.`student_id` = ?", [req.params.id, req.user.id], finish);
      break;
    case 'assistant':
      // todo when assistants are implemented
      break;
  }
};

var postComment = function(req, res) {
  if(req.body.tab && req.body.line && req.body.text) {
    security(req, function(err, result) {
      if(err) {
        res.json({code: -1});
        throw err;
      } else if(result.length <= 0) {
        res.json({code: 2}); // invalid permissions (i think this is the right code)
      } else {
        var now = Date.now();
        connection.query("INSERT INTO `comments` VALUES(NULL, ?, ?, ?, '" + type + "', ?, FROM_UNIXTIME(?), ?)", [req.params.id, req.body.tab, req.body.line, req.user.id, now, req.body.text], function(err, result) {
          if(err) {
            res.json({code: -1});
            throw err;
          } else {
            connection.query("SELECT `fname`,`lname` FROM `" + type + "s` WHERE `id` = ?", [req.user.id], function(err, user) {
              if(err) {
                res.json({code: -2}); // it semi worked, but page needs to be reloaded
                throw err;
              } else {
                res.json({code: 0, id: result.insertId, tab: req.body.tab, line: req.body.line, timestamp: now, message: req.body.text, name: (user[0].fname + ' ' + user[0].lname), owns: true});
              }
            });
          }
        });
      }
    });
  } else {
    res.json({code: 1}); // missing data. i'm just making up codes here
  }
};

var deleteComment = function(req, res) {
  // security to ensure this user owns this submission
  connection.query("DELETE FROM `comments` WHERE `id` = ? AND `commenter_type` = ? AND `commenter_id` = ?", [req.params.commentId, type, req.user.id], function(err, result) {
    if(err) {
      res.json({code: -1});
      throw err;
    } else {
      res.json({code: 0});
    }
  });
};

var editComment = function(req, res) {
  if(req.body.text) {
    connection.query("UPDATE `comments` SET `message` = ? WHERE `id` = ? AND `commenter_type` = ? AND `commenter_id` = ?", [req.body.text, req.params.commentId, type, req.user.id], function(err, result) {
      if(err) {
        res.json({code: -1});
        throw err;
      } else {
        res.json({code: 0});
      }
    });
  } else {
    res.json({code: 1}); // missing data, i guess
  }
};

var setup = function(router, dbType) {
  type = dbType;
  router.get('/:id/comment', getComments);
  router.post('/:id/comment', postComment);
  router.post('/:id/comment/:commentId/delete', deleteComment);
  router.post('/:id/comment/:commentId/edit', editComment);
};

module.exports = {setup: setup};
