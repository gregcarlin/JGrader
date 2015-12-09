SELECT
  `assignments`.`id` AS `aid`,
  `assignments`.`name` AS `aname`,
  `assignments`.`due`,
  COUNT(`enrollment`.`student_id`) AS `total`,
  `temp0`.`complete`,`temp`.`graded`
FROM
  `assignments`
  LEFT JOIN `enrollment` ON `enrollment`.`section_id` = ?
  LEFT JOIN
    (SELECT `assignment_id`,COUNT(*) AS `complete`
      FROM `submissions` GROUP BY `assignment_id`)
    AS `temp0`
    ON `temp0`.`assignment_id` = `assignments`.`id`
  LEFT JOIN
    (SELECT `assignment_id`,COUNT(*) AS `graded`
      FROM `submissions` WHERE `grade` IS NOT NULL
      GROUP BY `assignment_id`) AS `temp`
    ON `temp`.`assignment_id` = `assignments`.`id`
WHERE `assignments`.`section_id` = ?
GROUP BY `assignments`.`id`
ORDER BY
  `assignments`.`due` DESC,
  `assignments`.`name` ASC
