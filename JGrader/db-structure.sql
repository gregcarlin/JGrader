SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `SECTIONS_WITH_STUDENT`(`teacher_id` INT, `student_id` INT) RETURNS int(10) unsigned
    READS SQL DATA
    DETERMINISTIC
    COMMENT 'How many sections a given teacher has with a given student'
RETURN (SELECT COUNT(*) FROM `sections`,`enrollment` WHERE `enrollment`.`section_id` = `sections`.`id` AND `enrollment`.`student_id` = student_id AND `sections`.`teacher_id` = teacher_id)$$

CREATE DEFINER=`root`@`localhost` FUNCTION `TEACHER_OWNS_ASSIGNMENT`(`teacher_id` INT UNSIGNED, `assignment_id` INT UNSIGNED) RETURNS tinyint(1)
    READS SQL DATA
    DETERMINISTIC
    COMMENT '1 if given teacher owns given assignment, 0 otherwise'
RETURN (SELECT COUNT(*) FROM `assignments`,`sections` WHERE `assignments`.`section_id` = `sections`.`id` AND `sections`.`teacher_id` = teacher_id AND `assignments`.`id` = assignment_id)$$

DELIMITER ;

CREATE TABLE IF NOT EXISTS `assignments` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `section_id` int(10) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `due` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `section_id` (`section_id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 AUTO_INCREMENT=269 ;

CREATE TABLE IF NOT EXISTS `assistants` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user` varchar(255) NOT NULL,
  `pass` blob NOT NULL,
  `fname` varchar(255) NOT NULL,
  `lname` varchar(255) NOT NULL,
  `pass_reset_hash` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user` (`user`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 AUTO_INCREMENT=2 ;

CREATE TABLE IF NOT EXISTS `blog` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `title` varchar(255) NOT NULL,
  `author` varchar(255) NOT NULL,
  `contents` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 AUTO_INCREMENT=2 ;

CREATE TABLE IF NOT EXISTS `comments` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `submission_id` int(10) unsigned NOT NULL,
  `tab` int(10) unsigned NOT NULL,
  `line` int(10) unsigned NOT NULL,
  `commenter_type` enum('teacher','student','assistant') NOT NULL,
  `commenter_id` int(10) unsigned NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `message` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `submission_id` (`submission_id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 AUTO_INCREMENT=213 ;

CREATE TABLE IF NOT EXISTS `enrollment` (
  `section_id` int(10) unsigned NOT NULL,
  `student_id` int(10) unsigned NOT NULL,
  KEY `section_id` (`section_id`,`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `feedback` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user` varchar(255) NOT NULL,
  `fname` varchar(255) NOT NULL,
  `lname` varchar(255) NOT NULL,
  `user_type` enum('teacher','student','assistant') NOT NULL,
  `user_agent` varchar(255) NOT NULL,
  `report_type` enum('question','comment','complaint','other') NOT NULL,
  `text` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user` (`user`,`user_type`,`report_type`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 AUTO_INCREMENT=49 ;

CREATE TABLE IF NOT EXISTS `files` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `submission_id` int(10) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `contents` mediumblob NOT NULL,
  `compiled` mediumblob,
  `mime` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `submission_id` (`submission_id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 AUTO_INCREMENT=1978 ;

CREATE TABLE IF NOT EXISTS `files-teachers` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `assignment_id` int(10) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `contents` mediumblob NOT NULL,
  `mime` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `assignment_id` (`assignment_id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 AUTO_INCREMENT=39 ;

CREATE TABLE IF NOT EXISTS `results` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `submission_id` int(11) NOT NULL,
  `isSuccess` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;

CREATE TABLE IF NOT EXISTS `sections` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `teacher_id` int(10) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(5) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `teacher_id` (`teacher_id`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 AUTO_INCREMENT=125 ;

CREATE TABLE IF NOT EXISTS `sessions-assistants` (
  `id` int(10) unsigned NOT NULL,
  `hash` varchar(40) NOT NULL,
  UNIQUE KEY `hash` (`hash`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `sessions-students` (
  `id` int(10) unsigned NOT NULL,
  `hash` varchar(40) NOT NULL,
  UNIQUE KEY `hash` (`hash`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `sessions-teachers` (
  `id` int(10) unsigned NOT NULL,
  `hash` varchar(40) NOT NULL,
  UNIQUE KEY `hash` (`hash`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `students` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user` varchar(255) NOT NULL,
  `pass` binary(60) NOT NULL,
  `fname` varchar(255) NOT NULL,
  `lname` varchar(255) NOT NULL,
  `pass_reset_hash` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user` (`user`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 AUTO_INCREMENT=342 ;

CREATE TABLE IF NOT EXISTS `submissions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `assignment_id` int(10) unsigned NOT NULL,
  `student_id` int(10) unsigned NOT NULL,
  `submitted` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `grade` tinyint(3) unsigned DEFAULT NULL,
  `main` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `assignment_id` (`assignment_id`,`student_id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 AUTO_INCREMENT=1103 ;

CREATE TABLE IF NOT EXISTS `teachers` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user` varchar(255) NOT NULL,
  `pass` binary(60) NOT NULL,
  `fname` varchar(255) NOT NULL,
  `lname` varchar(255) NOT NULL,
  `pass_reset_hash` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user` (`user`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 AUTO_INCREMENT=119 ;

CREATE TABLE IF NOT EXISTS `test-case-results` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `submission_id` int(10) unsigned NOT NULL,
  `test_case_id` int(10) unsigned NOT NULL,
  `result` text NOT NULL,
  `pass` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;

CREATE TABLE IF NOT EXISTS `test-cases` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `assignment_id` int(11) NOT NULL,
  `input` varchar(256) NOT NULL,
  `output` varchar(256) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 AUTO_INCREMENT=150 ;

