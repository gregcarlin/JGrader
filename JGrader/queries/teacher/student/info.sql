SELECT
  `submissions`.`id`,
  `submissions`.`grade`,
  `submissions`.`submitted`,
  `assignments`.`name`,
  `assignments`.`due`,
  `sections`.`name` AS `sname`,
  `sections`.`id` AS `sid`
FROM
  `assignments`
  JOIN `sections`
    ON `assignments`.`section_id` = `sections`.`id`
  JOIN `enrollment`
    ON `enrollment`.`section_id` = `sections`.`id`
  LEFT JOIN `submissions`
    ON `assignments`.`id` = `submissions`.`assignment_id`
    AND `submissions`.`student_id` =
        `enrollment`.`student_id`
WHERE `enrollment`.`student_id` = ?
AND `sections`.`teacher_id` = ?
