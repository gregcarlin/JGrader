SELECT
  `students`.`fname`,
  `students`.`lname`,
  `submissions`.`grade`,
  `submissions`.`submitted`,
  `assignments`.`due`
FROM
  `students`
  JOIN `enrollment`
    ON `enrollment`.`student_id` = `students`.`id`
  JOIN `sections`
    ON `sections`.`id` = `enrollment`.`section_id`
  JOIN `assignments`
    ON `assignments`.`section_id` = `sections`.`id`
  LEFT JOIN `submissions`
    ON `submissions`.`assignment_id` = `assignments`.`id`
    AND `submissions`.`student_id` = `students`.`id`
WHERE `assignments`.`id` = ?
