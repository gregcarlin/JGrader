SELECT
  `assignments`.`name`,
  `sections`.`name` AS `sname`,
  `submissions`.`id`,
  `submissions`.`grade`
FROM
  `assignments`
  JOIN `sections`
    ON `assignments`.`section_id` = `sections`.`id`
  JOIN `enrollment`
    ON `enrollment`.`section_id` = `sections`.`id`
  LEFT JOIN `submissions`
    ON `submissions`.`assignment_id` = `assignments`.`id`
    AND `submissions`.`student_id` =
        `enrollment`.`student_id`
WHERE `enrollment`.`student_id` = ?
AND `sections`.`teacher_id` = ?
