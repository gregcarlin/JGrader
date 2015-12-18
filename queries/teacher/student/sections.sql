SELECT `students`.*,`sections`.* FROM `students`
JOIN `enrollment` ON `students`.`id` = `enrollment`.`student_id`
JOIN `sections` ON `enrollment`.`section_id` = `sections`.`id`
WHERE `students`.`id` = ? AND `sections`.`teacher_id` = ?
