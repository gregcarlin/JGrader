# ************************************************************
# Sequel Pro SQL dump
# Version 4499
#
# http://www.sequelpro.com/
# https://github.com/sequelpro/sequelpro
#
# Host: master-db.cxnpf0bz0ytm.us-east-1.rds.amazonaws.com (MySQL 5.6.23-log)
# Database: Jgrader
# Generation Time: 2015-12-18 01:56:44 +0000
# ************************************************************


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


# Dump of table assignments
# ------------------------------------------------------------

CREATE TABLE `assignments` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `section_id` int(10) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `due` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `section_id` (`section_id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;



# Dump of table assistants
# ------------------------------------------------------------

CREATE TABLE `assistants` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user` varchar(255) NOT NULL,
  `pass` blob NOT NULL,
  `fname` varchar(255) NOT NULL,
  `lname` varchar(255) NOT NULL,
  `pass_reset_hash` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user` (`user`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;



# Dump of table blog
# ------------------------------------------------------------

CREATE TABLE `blog` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `title` varchar(255) NOT NULL,
  `author` varchar(255) NOT NULL,
  `contents` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;



# Dump of table comments
# ------------------------------------------------------------

CREATE TABLE `comments` (
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
) ENGINE=MyISAM DEFAULT CHARSET=latin1;



# Dump of table enrollment
# ------------------------------------------------------------

CREATE TABLE `enrollment` (
  `section_id` int(10) unsigned NOT NULL,
  `student_id` int(10) unsigned NOT NULL,
  KEY `section_id` (`section_id`,`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;



# Dump of table feedback
# ------------------------------------------------------------

CREATE TABLE `feedback` (
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
) ENGINE=MyISAM DEFAULT CHARSET=latin1;



# Dump of table files
# ------------------------------------------------------------

CREATE TABLE `files` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `submission_id` int(10) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `contents` mediumblob NOT NULL,
  `compiled` mediumblob,
  `mime` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `submission_id` (`submission_id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;



# Dump of table files-teachers
# ------------------------------------------------------------

CREATE TABLE `files-teachers` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `assignment_id` int(10) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `contents` mediumblob NOT NULL,
  `mime` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `assignment_id` (`assignment_id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;



# Dump of table results
# ------------------------------------------------------------

CREATE TABLE `results` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `submission_id` int(11) NOT NULL,
  `isSuccess` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;



# Dump of table sections
# ------------------------------------------------------------

CREATE TABLE `sections` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `teacher_id` int(10) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(5) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `teacher_id` (`teacher_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;



# Dump of table sessions-assistants
# ------------------------------------------------------------

CREATE TABLE `sessions-assistants` (
  `id` int(10) unsigned NOT NULL,
  `hash` varchar(40) NOT NULL,
  UNIQUE KEY `hash` (`hash`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;



# Dump of table sessions-students
# ------------------------------------------------------------

CREATE TABLE `sessions-students` (
  `id` int(10) unsigned NOT NULL,
  `hash` varchar(40) NOT NULL,
  UNIQUE KEY `hash` (`hash`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;



# Dump of table sessions-teachers
# ------------------------------------------------------------

CREATE TABLE `sessions-teachers` (
  `id` int(10) unsigned NOT NULL,
  `hash` varchar(40) NOT NULL,
  UNIQUE KEY `hash` (`hash`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;



# Dump of table students
# ------------------------------------------------------------

CREATE TABLE `students` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user` varchar(255) NOT NULL,
  `pass` binary(60) NOT NULL,
  `fname` varchar(255) NOT NULL,
  `lname` varchar(255) NOT NULL,
  `pass_reset_hash` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user` (`user`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;



# Dump of table submissions
# ------------------------------------------------------------

CREATE TABLE `submissions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `assignment_id` int(10) unsigned NOT NULL,
  `student_id` int(10) unsigned NOT NULL,
  `submitted` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `grade` tinyint(3) unsigned DEFAULT NULL,
  `main` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `assignment_id` (`assignment_id`,`student_id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;



# Dump of table teachers
# ------------------------------------------------------------

CREATE TABLE `teachers` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user` varchar(255) NOT NULL,
  `pass` binary(60) NOT NULL,
  `fname` varchar(255) NOT NULL,
  `lname` varchar(255) NOT NULL,
  `pass_reset_hash` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user` (`user`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;



# Dump of table test-case-results
# ------------------------------------------------------------

CREATE TABLE `test-case-results` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `submission_id` int(10) unsigned NOT NULL,
  `test_case_id` int(10) unsigned NOT NULL,
  `result` text NOT NULL,
  `pass` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;



# Dump of table test-cases
# ------------------------------------------------------------

CREATE TABLE `test-cases` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `assignment_id` int(11) NOT NULL,
  `input` varchar(256) NOT NULL,
  `output` varchar(256) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;




--
-- Dumping routines (FUNCTION) for database 'Jgrader'
--
DELIMITER ;;

# Dump of FUNCTION TEACHER_OWNS_ASSIGNMENT
# ------------------------------------------------------------

/*!50003 SET SESSION SQL_MODE="NO_ENGINE_SUBSTITUTION"*/;;
/*!50003 CREATE*/ /*!50020 DEFINER=`jgroot`@`%`*/ /*!50003 FUNCTION `TEACHER_OWNS_ASSIGNMENT`(`teacher_id` INT UNSIGNED, `assignment_id` INT UNSIGNED) RETURNS tinyint(1)
    READS SQL DATA
    DETERMINISTIC
    COMMENT '1 if given teacher owns given assignment, 0 otherwise'
RETURN (SELECT COUNT(*) FROM `assignments`,`sections` WHERE `assignments`.`section_id` = `sections`.`id` AND `sections`.`teacher_id` = teacher_id AND `assignments`.`id` = assignment_id) */;;

/*!50003 SET SESSION SQL_MODE=@OLD_SQL_MODE */;;
DELIMITER ;

/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
