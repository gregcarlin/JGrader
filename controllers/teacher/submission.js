// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

module.exports.removeGrade = function(submissionId, callback) {
  connection.query("UPDATE `submissions` SET `grade` = NULL WHERE `id` = ?",
                   [submissionId], callback);
};

module.exports.setGrade = function(submissionId, grade, callback) {
  if (isNaN(grade)) {
    var err = new Error();
    err.code = 1; // invalid input
    return callback(err);
  }

  connection.query("UPDATE `submissions` SET `grade` = ? WHERE `id` = ?",
                   [grade, submissionId], callback);
};
