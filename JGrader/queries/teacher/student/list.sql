SELECT
  `students`.`id`,
  `students`.`fname`,
  `students`.`lname`,
  `sections`.`id` AS `sid`,
  `sections`.`name` AS `sname`,
  `temp3`.`name` AS `aname`,
  `temp3`.`subid`,
  `temp4`.`avg`
FROM
  `students`
  JOIN `enrollment`
    ON `students`.`id` = `enrollment`.`student_id`
  JOIN `sections`
    ON `sections`.`id` = `enrollment`.`section_id`
  LEFT JOIN
    (SELECT `temp2`.* FROM
      (SELECT
        `student_id`,
        `assignments`.`section_id`,
        MAX(`submitted`) AS `max`
        FROM `submissions`
        JOIN `assignments`
          ON `submissions`.`assignment_id` =
              `assignments`.`id`
        WHERE
          TEACHER_OWNS_ASSIGNMENT(?,`assignments`.`id`)
        GROUP BY `student_id`,`assignments`.`section_id`)
          AS `temp`
      JOIN
      (SELECT
        `submissions`.`student_id`,
        `assignments`.`section_id`,
        `submissions`.`submitted`,
        `assignments`.`name`,
        `assignments`.`id`,
        `submissions`.`id` AS `subid`
        FROM `submissions`
          JOIN `assignments`
          ON `submissions`.`assignment_id` =
              `assignments`.`id`) AS `temp2`
      ON `temp`.`student_id` = `temp2`.`student_id` AND
          `temp`.`section_id` = `temp2`.`section_id` AND
          `temp2`.`submitted` = `temp`.`max`) AS `temp3`
  ON `temp3`.`student_id` = `students`.`id` AND
      `temp3`.`section_id` = `sections`.`id`
  LEFT JOIN
    (SELECT
      `submissions`.`id`,
      `submissions`.`student_id`,
      AVG(`submissions`.`grade`) AS `avg`,
      `assignments`.`section_id`
      FROM `submissions`
      JOIN `assignments`
      ON `submissions`.`assignment_id` =
          `assignments`.`id`
      WHERE TEACHER_OWNS_ASSIGNMENT(?,`assignment_id`)
      GROUP BY `student_id`,`section_id`) AS `temp4`
  ON `students`.`id` = `temp4`.`student_id` AND
      `sections`.`id` = `temp4`.`section_id`
WHERE `sections`.`teacher_id` = ?
