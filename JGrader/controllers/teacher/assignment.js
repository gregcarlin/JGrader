require('../../routes/common');

module.exports.create = function(teacherID, sectionID, name, desc, due, files, next) {
  // verify that teacher owns this section
  connection.query("SELECT (SELECT `teacher_id` FROM `sections` WHERE `id` = ?) = ? AS `result`", [sectionID, teacherID], function(err, rows) {
    if (err) return next(err);

    if (!rows[0].result) {
      return next(new Error('An unexpected error has occurred.'));
    }

    if (!desc || desc.length <= 0) desc = null;
    connection.query("INSERT INTO `assignments` VALUES(NULL, ?, ?, ?, ?)", [sectionID, name, desc, due], function(err, rows) {
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
