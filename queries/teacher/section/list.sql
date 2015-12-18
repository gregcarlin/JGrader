SELECT
  `sections`.`name`,
  `sections`.`id`,
  COUNT(`enrollment`.`student_id`) AS `count`,
  `assignments`.`name` AS `aname`,
  `assignments`.`id` AS `aid`
FROM `sections`
LEFT JOIN `enrollment`
  ON `sections`.`id` = `enrollment`.`section_id`
LEFT JOIN `assignments`
  ON `assignments`.`section_id` = `sections`.`id`
AND `assignments`.`due` =
  (SELECT MIN(`due`) FROM `assignments`
    WHERE `section_id` = `sections`.`id`
      AND `due` > NOW())
WHERE `sections`.`teacher_id` = ?
GROUP BY `sections`.`id`
ORDER BY `sections`.`name` ASC
