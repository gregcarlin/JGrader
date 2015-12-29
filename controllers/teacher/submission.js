// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

var jgError = require('../../util/util').errorCode.jgError;

module.exports.removeGrade = function(submissionId, callback) {
  connection.query("UPDATE `submissions` SET `grade` = NULL WHERE `id` = ?",
                   [submissionId], callback);
};

module.exports.setGrade = function(submissionId, grade, callback) {
  if (isNaN(grade)) {
    return callback(jgError(1)); // invalid input
  }

  connection.query("UPDATE `submissions` SET `grade` = ? WHERE `id` = ?",
                   [grade, submissionId], callback);
};
