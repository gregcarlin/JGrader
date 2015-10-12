// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

require('../../routes/common');

module.exports.create = function(teacherId, name, callback) {
  connection.query("INSERT INTO `sections` VALUES(NULL, ?, ?, LEFT(UUID(), 5));\
                    SELECT LAST_INSERT_ID()",
                    [teacherId, name], function(err, rows) {
    if (err) {
      return err;
    }

    callback(null, rows[1][0]['LAST_INSERT_ID()']);
  });
};

module.exports.setName = function(sectionId, name, callback) {
  connection.query("UPDATE `sections` SET `name` = ? WHERE `id` = ?",
                   [name, sectionId], callback);
};

module.exports.remove = function(sectionId, callback) {
  connection.query('DELETE FROM `sections` WHERE `id` = ? LIMIT 1',
                   [sectionId], function(err, rows) {
    if (err) return callback(err);

    connection.query("DELETE FROM `enrollment` WHERE `section_id` = ?;\
                      DELETE `assignments`,`submissions`,`files` \
                        FROM `assignments` \
                        LEFT JOIN `submissions` \
                          ON `submissions`.`assignment_id` = \
                             `assignments`.`id` \
                        LEFT JOIN `files` \
                          ON `files`.`submission_id` = `submissions`.`id` \
                        WHERE `assignments`.`section_id` = ?",
                      [sectionId, sectionId], callback);
  });
};
