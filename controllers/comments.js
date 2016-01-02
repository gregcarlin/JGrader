var _ = require('lodash');

var db = require('./db');
var jgError = require('../util/errorCode').jgError;

module.exports.list = function(userId, submissionId, type, callback) {
  db.query("SELECT \
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
            [userId, userId, submissionId],
            function(err, rows) {
    if (err) return callback(err);

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
      row.owns = type == row.commenter_type && userId == row.commenter_id;
      delete row.tfname;
      delete row.tlname;
      delete row.sfname;
      delete row.slname;
      delete row.afname;
      delete row.alname;
      delete row.commenter_type;
      delete row.commenter_id;
    });

    callback(null, rows);
  });
};

// used in postComment to ensure that a user has permission to post a comment
var security = function(userId, submissionId, type, finish) {
  switch (type) {
    case 'teacher':
      db.query("SELECT * \
                FROM `submissions`,`assignments`,`sections` \
                WHERE \
                  `submissions`.`assignment_id` = \
                    `assignments`.`id` AND \
                  `assignments`.`section_id` = `sections`.`id` AND \
                  `submissions`.`id` = ? AND \
                  `sections`.`teacher_id` = ?",
                [submissionId, userId], finish);
      break;
    case 'student':
      db.query("SELECT * FROM `submissions` \
                WHERE `id` = ? AND `student_id` = ?",
                [submissionId, userId], finish);
      break;
    case 'assistant':
      // todo when assistants are implemented
      break;
  }
};

module.exports.post = function(tab, line, text, userId, submissionId, type, callback) {
  if (!tab || !line || !text) {
    return callback(jgError(12)); // missing data
  }

  security(userId, submissionId, type, function(err, result) {
    if (err) return callback(err);

    if (result.length <= 0) {
      return callback(jgError(13)); // invalid permissions
    }

    db.query("INSERT INTO `comments` \
              VALUES(NULL, ?, ?, ?, '" + type + "', ?, \
                CURRENT_TIMESTAMP(), ?)",
              [submissionId, tab, line, userId, text],
              function(err, result) {
      if (err) return callback(err);

      db.query("SELECT `fname`,`lname` FROM `" + type + "s` \
                WHERE `id` = ?",
                [userId], function(err, user) {
        if (err) return callback(jgError(451)); // it semi worked, but page needs to be reloaded

        callback(null, result.insertId, user[0].fname + ' ' + user[0].lname);
      });
    });
  });
};

module.exports.remove = function(userId, commentId, type, callback) {
  // security to ensure this user owns this submission
  db.query("DELETE FROM `comments` \
            WHERE `id` = ? AND \
              `commenter_type` = ? AND \
              `commenter_id` = ?",
            [commentId, type, userId], callback);
};

module.exports.edit = function(text, userId, commentId, type, callback) {
  if (!text) return callback(jgError(12)); // missing data

  db.query("UPDATE `comments` SET `message` = ? \
            WHERE `id` = ? AND \
              `commenter_type` = ? AND \
              `commenter_id` = ?",
            [text, commentId, type, userId], callback);
};
