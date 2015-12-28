// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

require('../../routes/common');

module.exports.list = function(studentId, callback) {
  connection.query("SELECT `sections`.`name`,\
                           `teachers`.`fname`,\
                           `teachers`.`lname`,\
                           `assignments`.`name` AS `assignmentName`,\
                           `assignments`.`due`,\
                           `assignments`.`id`,\
                           `submissions`.`submitted` \
                    FROM `sections`, `teachers`,`enrollment`,`assignments` \
                    LEFT JOIN `submissions` \
                      ON `submissions`.`assignment_id` = `assignments`.`id` \
                      AND `submissions`.`student_id` = ? \
                    WHERE `enrollment`.`student_id` = ? \
                    AND `enrollment`.`section_id` = `assignments`.`section_id` \
                    AND `sections`.`id` = `enrollment`.`section_id` \
                    AND `sections`.`teacher_id`=`teachers`.`id`",
                    [studentId, studentId], callback);
};

module.exports.verify = function(assignmentId, studentId, callback) {
  connection.query({
      sql: "SELECT `assignments`.*,`sections`.* \
            FROM `assignments` \
            JOIN `sections` ON `assignments`.`section_id` = `sections`.`id` \
            JOIN `enrollment` ON `sections`.`id` = `enrollment`.`section_id` \
            WHERE `assignments`.`id` = ? AND `enrollment`.`student_id` = ?",
      nestTables: true,
      values: [assignmentId, studentId]
    }, function(err, result) {
      if (err) return callback(err);
      if (result.length <= 0) return callback(null, null, null);

      callback(null, result[0].assignments, result[0].sections);
  });
};

module.exports.get = function(assignmentId, studentId, callback) {
  connection.query("SELECT `name`,`contents`,`mime` FROM `files-teachers` \
                    WHERE `assignment_id` = ?",
                    [assignmentId], function(err, teacherFiles) {
    if (err) return callback(err);

    connection.query("SELECT `files`.`name`,\
                             `files`.`contents`,\
                             `files`.`mime`,\
                             `submissions`.`grade`,\
                             `submissions`.`submitted`,\
                             `files`.`compiled`,\
                             `submissions`.`main` \
                      FROM `files`, `students`, `assignments`, `submissions` \
                      WHERE `submissions`.`assignment_id` = `assignments`.`id` \
                        AND `submissions`.`student_id` = `students`.`id` \
                        AND `files`.`submission_id`= `submissions`.`id` \
                        AND `students`.`id` = ? AND `assignments`.`id` = ? \
                      ORDER BY `files`.`id`",
                      [studentId, assignmentId], function(err, fileData) {
      if (err) return callback(err);

      var anyCompiled = false;
      var anyMain = false;
      for (var i = 0; i < fileData.length; i++) {
        fileData[i].display =
          isAscii(fileData[i].mime) ?
            fileData[i].contents :
            'This is a binary file. Download it to view it.';
        if (fileData[i].compiled) anyCompiled = true;

        fileData[i].isMain = fileData[i].main == fileData[i].name;
        if (fileData[i].isMain) anyMain = true;

        var lastDot = fileData[i].name.lastIndexOf('.') + 1;
        if (lastDot >= fileData[i].name.length) lastDot = 0;
        fileData[i].extension = fileData[i].name.substring(lastDot);
        var imageExtensions = ['png', 'jpg', 'jpeg', 'gif'];
        if (imageExtensions.indexOf(fileData[i].extension) >= 0) {
          fileData[i].text = false;
          fileData[i].display = '<img src="data:image/' +
                                fileData[i].extension + ';base64,';
          fileData[i].display += new Buffer(fileData[i].contents)
                                  .toString('base64');
          fileData[i].display += '" alt="' + fileData[i].name + '">';
        } else {
          fileData[i].text = true;
        }
      }

      // Sends file data
      var teacherNames = [];
      for (var i = 0; i < teacherFiles.length; i++) {
        teacherNames.push(teacherFiles[i].name);
      }

      callback(null, {
        fileData: fileData,
        anyCompiled: anyCompiled,
        anyMain: anyMain,
        teacherFiles: teacherNames
      });
    });
  });
};
