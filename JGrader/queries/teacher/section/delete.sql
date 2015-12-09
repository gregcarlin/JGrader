DELETE FROM `enrollment` WHERE `section_id` = ?;
DELETE `assignments`,`submissions`,`files`
  FROM `assignments`
  LEFT JOIN `submissions`
    ON `submissions`.`assignment_id` =
        `assignments`.`id`
  LEFT JOIN `files`
    ON `files`.`submission_id` = `submissions`.`id`
  WHERE `assignments`.`section_id` = ?
