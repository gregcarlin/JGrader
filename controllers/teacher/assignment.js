// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

var _ = require('lodash');

require('../../routes/common');
var db = require('../db');
var jgError = require('../../util/errorCode').jgError;
var stringStartsWith = require('../../util/general').stringStartsWith;
var queries = require('../../queries/queries');

module.exports.list = function(teacherId, callback) {
  db.query(queries.teacher.assignment.LIST, [teacherId], callback);
};

module.exports.listSections = function(teacherId, callback) {
  db.query(queries.teacher.assignment.LIST_SECTIONS, [teacherId], callback);
};

module.exports.create = function(teacherId, sectionId, name, desc,
                                 due, files, next) {
  // verify that teacher owns this section
  db.query("SELECT \
            (SELECT `teacher_id` FROM `sections` WHERE `id` = ?) = ? \
            AS `result`",
            [sectionId, teacherId], function(err, rows) {
    if (err) return next(err);

    if (!rows[0].result) {
      return next(new Error('An unexpected error has occurred.'));
    }

    if (!desc || desc.length <= 0) desc = null;
    db.query("INSERT INTO `assignments` VALUES(NULL, ?, ?, ?, ?)",
              [sectionId, name, desc, due], function(err, rows) {
      if (err) {
        err.jgCode = 2;
        return next(err);
      }

      var assignmentID = rows.insertId;
      // insert files into db
      var query = "INSERT INTO `files-teachers` VALUES";
      var params = [];
      for (var i in files) {
        query += "(NULL, ?, ?, ?, ?),";
        params.push(assignmentID, files[i].name,
                    files[i].buffer, files[i].mimetype);
      }
      if (params.length <= 0) return next();

      query = query.substring(0, query.length - 1);
      db.query(query, params, next);
    });
  });
};

module.exports.exportOne = function(assignmentId, callback) {
  db.query(queries.teacher.assignment.CSV_INFO, [assignmentId], function(err, rows) {
    if (err) return callback(err);

    var output = 'Student,Submitted,Grade,Late\n';
    _.each(rows, function(row) {
      output += row.fname + ' ' + row.lname + ',' +
                (row.submitted ? 'Yes' : 'No') + ',' +
                (row.grade ? row.grade : 'None') + ',' +
                (row.submitted ? (row.submitted > row.due ? 'Yes' : 'No') :
                 (row.due > Date.now() ? 'Yes' : 'Not Yet')) + '\n';
    });
    callback(null, output);
  });
};

module.exports.remove = function(assignmentId, callback) {
  db.query('DELETE FROM `assignments` WHERE `id` = ? LIMIT 1',
            [assignmentId], callback);
};

module.exports.addFile = function(assignmentId, file, callback) {
  db.query("SELECT COUNT(*) as `count` FROM `submissions` \
            WHERE `assignment_id` = ?",
            [assignmentId], function(err, result) {
    if (err) return callback(err);

    if (result[0].count > 0) {
      return callback(jgError(52));
    }

    db.query("SELECT `name` FROM `files-teachers` \
              WHERE `assignment_id` = ?",
              [assignmentId], function(err, result) {
      if (err) return callback(err);

      _.each(result, function(r) {
        if (r.name == file.name) {
          var err = new Error();
          err.code = 2;
          return callback(err);
        }
      });

      db.query("INSERT INTO `files-teachers` VALUES(NULL,?,?,?,?)",
                [assignmentId, file.name, file.buffer, file.mimetype],
                callback);
    });
  });
};

module.exports.removeFile = function(assignmentId, file, callback) {
  db.query("SELECT COUNT(*) as `count` FROM `submissions` \
            WHERE `assignment_id` = ?",
            [assignmentId], function(err, result) {
    if (err) return callback(err);

    if (result[0].count > 0) {
      return callback(jgError(51));
    }

    db.query("DELETE FROM `files-teachers` \
              WHERE `assignment_id` = ? AND `name` = ?",
              [assignmentId, file], callback);
  });
};

module.exports.setDescription = function(assignmentId, description, callback) {
  if (stringStartsWith(description, '<em>')) {
    return callback(jgError(1)); // invalid input
  }

  db.query("UPDATE `assignments` \
            SET `description` = ? \
            WHERE `id` = ?", [description, assignmentId], callback);
};

module.exports.setDue = function(assignmentId, due, callback) {
  db.query("UPDATE `assignments` SET `due` = ? \
            WHERE `id` = ?", [due, assignmentId], callback);
};
