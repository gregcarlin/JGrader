SELECT * FROM `submissions`
JOIN `assignments`
  ON `submissions`.`assignment_id` = `assignments`.`id`
JOIN `sections`
  ON `assignments`.`section_id` = `sections`.`id`
WHERE `submissions`.`id` = ? AND `sections`.`teacher_id` = ?
