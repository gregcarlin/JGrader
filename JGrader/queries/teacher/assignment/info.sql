SELECT
  `students`.`id`,
  `students`.`fname`,
  `students`.`lname`,
  `submissions`.`id` AS `subID`,
  `submissions`.`submitted`,
  `submissions`.`grade`,
  `submissions`.`main`,
  `failed-tests`.`count` AS `failed_tests`,
  `passed-tests`.`count` AS `passed_tests`
FROM `enrollment`,`students`
LEFT JOIN
  `submissions`
  ON `submissions`.`student_id` = `students`.`id`
    AND `submissions`.`assignment_id` = ?
LEFT JOIN
  (SELECT `submission_id`,COUNT(*) AS `count`
    FROM `test-case-results`
    WHERE `pass` = 0
    GROUP BY `submission_id`) AS `failed-tests`
  ON `failed-tests`.`submission_id` = `submissions`.`id`
LEFT JOIN
  (SELECT `submission_id`,COUNT(*) AS `count`
    FROM `test-case-results`
    WHERE `pass` = 1
    GROUP BY `submission_id`) AS `passed-tests`
  ON `passed-tests`.`submission_id` = `submissions`.`id`
WHERE
  `enrollment`.`student_id` = `students`.`id` AND
  `enrollment`.`section_id` = ?
ORDER BY `students`.`lname`,`students`.`fname`
