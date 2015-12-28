// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

require('../../routes/common');
var jgError = require('../../util/util').errorCode.jgError;

module.exports.list = function(studentId, callback) {
  connection.query("SELECT \
                      `sections`.`name`,\
                      `teachers`.`fname`,\
                      `teachers`.`lname`,\
                      `sections`.`id` \
                    FROM \
                      `enrollment`,\
                      `sections`,\
                      `teachers` \
                    WHERE \
                      `enrollment`.`section_id` = `sections`.`id` AND \
                      `sections`.`teacher_id` = `teachers`.`id` AND \
                      `enrollment`.`student_id` = ?",
                    [studentId], callback);
};

module.exports.enroll = function(studentId, sectionCode, callback) {
  if (!sectionCode) {
    return callback(jgError(9)); // no class code
  }

  connection.query("SELECT `id` FROM `sections` \
                    WHERE `code` = ?", [sectionCode], function(err, rows) {
    if (err) return callback(err);

    if (rows.length <= 0) {
      return callback(jgError(10)); // invalid class code
    }

    connection.query("SELECT * FROM `enrollment` \
                      WHERE `student_id` = ? AND `section_id` = ?",
                      [studentId, rows[0].id], function(err, result) {
      if (err) return callback(err);

      if (result.length > 0) {
        return callback(jgError(11));
      }

      connection.query("INSERT INTO `enrollment` \
                        VALUES(?, ?)",
                        [rows[0].id, studentId], function(err, result) {
        if (err) return callback(err);

        callback(null, rows[0].id);
      });
    });
  });
};

module.exports.verify = function(sectionId, studentId, callback) {
  connection.query("SELECT `sections`.* FROM `sections` \
                    JOIN `enrollment` \
                      ON `sections`.`id` = `enrollment`.`section_id` \
                    WHERE `sections`.`id` = ? \
                      AND `enrollment`.`student_id` = ?",
                    [sectionId, studentId], function(err, result) {
    if (err) return callback(err);
    if (result.length <= 0) return callback(null, null);

    callback(null, result[0]);
  });
};

module.exports.get = function(sectionId, studentId, callback) {
  connection.query("SELECT \
                      `assignments`.`id`,\
                      `assignments`.`name`,\
                      `assignments`.`description`,\
                      `assignments`.`due`,\
                      `submissions`.`submitted` \
                    FROM \
                      `assignments` \
                      LEFT JOIN `submissions` \
                        ON `assignments`.`id` = `submissions`.`assignment_id` \
                        AND `submissions`.`student_id` = ? \
                    WHERE `assignments`.`section_id` = ?",
                    [studentId, sectionId], callback);
};

module.exports.drop = function(sectionId, studentId, callback) {
  connection.query("DELETE FROM `enrollment` \
                      WHERE `section_id` = ? AND `student_id` = ? LIMIT 1; \
                    DELETE \
                      `submissions`,`files` \
                    FROM \
                      `submissions` \
                      JOIN `files` \
                        ON `submissions`.`id` = `files`.`submission_id` \
                    WHERE `student_id` = ?",
                    [sectionId, studentId, studentId], callback);
};
