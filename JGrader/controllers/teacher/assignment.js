var _ = require('lodash');

require('../../routes/common');

module.exports.create = function(teacherId, sectionId, name, desc, due, files, next) {
  // verify that teacher owns this section
  connection.query("SELECT (SELECT `teacher_id` FROM `sections` WHERE `id` = ?) = ? AS `result`", [sectionId, teacherId], function(err, rows) {
    if (err) return next(err);

    if (!rows[0].result) {
      return next(new Error('An unexpected error has occurred.'));
    }

    if (!desc || desc.length <= 0) desc = null;
    connection.query("INSERT INTO `assignments` VALUES(NULL, ?, ?, ?, ?)", [sectionId, name, desc, due], function(err, rows) {
      if (err) {
        err.userMessage = 'Invalid due date.';
        return next(err);
      }

      var assignmentID = rows.insertId;
      // insert files into db
      var query = "INSERT INTO `files-teachers` VALUES";
      var params = [];
      for (var i in files) {
        query += "(NULL, ?, ?, ?, ?),";
        params.push(assignmentID, files[i].name, files[i].buffer, files[i].mimetype);
      }
      if (params.length <= 0) return next();

      query = query.substring(0, query.length-1);
      connection.query(query, params, next);
    });
  });
}

module.exports.addFile = function(assignmentId, file, callback) {
  connection.query("SELECT COUNT(*) as `count` FROM `submissions` WHERE `assignment_id` = ?", [assignmentId], function(err, result) {
    if (err) return callback(err);

    if (result[0].count > 0) {
      var err = new Error();
      err.code = 1;
      callback(err);
    } else {
      connection.query("SELECT `name` FROM `files-teachers` WHERE `assignment_id` = ?", [assignmentId], function(err, result) {
        if (err) return callback(err);

        _.each(result, function(r) {
          if (r.name == file.name) {
            var err = new Error();
            err.code = 2;
            return callback(err);
          }
        });

        connection.query("INSERT INTO `files-teachers` VALUES(NULL,?,?,?,?)", [assignmentId, file.name, file.buffer, file.mimetype], callback);
      });
    }
  });
};

module.exports.removeFile = function(assignmentId, file, callback) {
  connection.query("SELECT COUNT(*) as `count` FROM `submissions` WHERE `assignment_id` = ?", [assignmentId], function(err, result) {
    if (err) return callback(err);

    if (result[0].count > 0) {
      var err = new Error();
      err.userMessage = 'You cannot remove files after students have already submitted code.';
      return callback(err);
    } else {
      connection.query("DELETE FROM `files-teachers` WHERE `assignment_id` = ? AND `name` = ?", [assignmentId, file], callback);
    }
  });
};
