SELECT
  `assignments`.`id` AS `aid`,
  `assignments`.`name` AS `aname`,
  `assignments`.`due`,
  `sections`.`id` AS `sid`,
  `sections`.`name` AS `sname`,
  COUNT(`enrollment`.`student_id`) AS `total`,
  `temp0`.`complete`,`temp`.`graded`
FROM
  `assignments`
  JOIN `sections`
    ON `sections`.`id` = `assignments`.`section_id`
  LEFT JOIN `enrollment`
    ON `sections`.`id` = `enrollment`.`section_id`
  LEFT JOIN
    (SELECT `assignment_id`,COUNT(*) AS `complete`
      FROM `submissions` GROUP BY `assignment_id`)
      AS `temp0`
    ON `temp0`.`assignment_id` = `assignments`.`id`
  LEFT JOIN (SELECT `assignment_id`,COUNT(*) AS `graded`
    FROM `submissions` WHERE `grade` IS NOT NULL
    GROUP BY `assignment_id`) AS `temp`
    ON `temp`.`assignment_id` = `assignments`.`id`
WHERE `sections`.`teacher_id` = ?
GROUP BY `assignments`.`id`
ORDER BY
  `assignments`.`due` DESC,
  `assignments`.`name` ASC,
  `sections`.`name` ASC
