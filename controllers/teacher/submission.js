// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

var db = require('../db');
var jgError = require('../../util/errorCode').jgError;

module.exports.removeGrade = function(submissionId, callback) {
  db.query("UPDATE `submissions` SET `grade` = NULL WHERE `id` = ?",
            [submissionId], callback);
};

module.exports.setGrade = function(submissionId, grade, callback) {
  if (isNaN(grade)) {
    return callback(jgError(1)); // invalid input
  }

  db.query("UPDATE `submissions` SET `grade` = ? WHERE `id` = ?",
            [grade, submissionId], callback);
};
