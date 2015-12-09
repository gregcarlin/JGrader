SELECT
  `files`.`id`,
  `files`.`name`,
  `files`.`compiled`,
  `submissions`.`student_id`
FROM `submissions`,`assignments`,`sections`,`files`
WHERE
  `submissions`.`assignment_id` = `assignments`.`id` AND
  `assignments`.`section_id` = `sections`.`id` AND
  `submissions`.`id` = ? AND
  `sections`.`teacher_id` = ? AND
  `files`.`submission_id` = `submissions`.`id`
ORDER BY `files`.`id`
