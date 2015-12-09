SELECT
  `files`.`id`,
  `files`.`name`,
  `files`.`contents`,
  `files`.`compiled`,
  `submissions`.`student_id`
FROM `submissions`,`files`
WHERE
  `submissions`.`id` = ? AND
  `files`.`submission_id` = `submissions`.`id`
ORDER BY `files`.`id`
