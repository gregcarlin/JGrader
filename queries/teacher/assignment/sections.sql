SELECT * FROM `assignments`
JOIN `sections` ON `assignments`.`section_id` = `sections`.`id`
WHERE `assignments`.`id` = ? AND `sections`.`teacher_id` = ?
