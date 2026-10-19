-- MySQL dump 10.13  Distrib 9.7.1, for macos15 (arm64)
--
-- Host: localhost    Database: gaming_tournament_db
-- ------------------------------------------------------
-- Server version	9.7.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `gaming_tournament_db`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `gaming_tournament_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `gaming_tournament_db`;

--
-- Table structure for table `games`
--

DROP TABLE IF EXISTS `games`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `games` (
  `game_id` int NOT NULL AUTO_INCREMENT,
  `game_name` varchar(100) NOT NULL,
  `genre` varchar(50) DEFAULT NULL,
  `platform` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`game_id`),
  UNIQUE KEY `game_name` (`game_name`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `games`
--

LOCK TABLES `games` WRITE;
/*!40000 ALTER TABLE `games` DISABLE KEYS */;
INSERT INTO `games` VALUES (1,'Valorant','FPS','PC'),(2,'BGMI','Battle Royale','Mobile'),(3,'EA SPORTS FC','Sports','PC/Console'),(4,'Chess','Strategy','Online'),(5,'Free Fire','Battle Royale','Mobile'),(6,'Counter-Strike 2','FPS','PC'),(7,'Call of Duty: Mobile','FPS','Mobile'),(8,'PUBG: Battlegrounds','Battle Royale','PC/Console'),(9,'Fortnite','Battle Royale','PC/Console'),(10,'Rocket League','Sports','PC/Console');
/*!40000 ALTER TABLE `games` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leaderboard`
--

DROP TABLE IF EXISTS `leaderboard`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leaderboard` (
  `leaderboard_id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `registration_id` int NOT NULL,
  `matches_played` int NOT NULL DEFAULT '0',
  `wins` int NOT NULL DEFAULT '0',
  `losses` int NOT NULL DEFAULT '0',
  `draws` int NOT NULL DEFAULT '0',
  `points` int NOT NULL DEFAULT '0',
  `rank_position` int DEFAULT NULL,
  PRIMARY KEY (`leaderboard_id`),
  UNIQUE KEY `uq_lb_entry` (`tournament_id`,`registration_id`),
  KEY `fk_lb_registration` (`registration_id`,`tournament_id`),
  KEY `idx_lb_ranking` (`tournament_id`,`points` DESC),
  CONSTRAINT `fk_lb_registration` FOREIGN KEY (`registration_id`, `tournament_id`) REFERENCES `registrations` (`registration_id`, `tournament_id`),
  CONSTRAINT `chk_lb_values` CHECK (((`matches_played` >= 0) and (`wins` >= 0) and (`losses` >= 0) and (`draws` >= 0) and (`points` >= 0)))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leaderboard`
--

LOCK TABLES `leaderboard` WRITE;
/*!40000 ALTER TABLE `leaderboard` DISABLE KEYS */;
INSERT INTO `leaderboard` VALUES (1,1,3,1,1,0,0,3,1),(2,1,1,1,1,0,0,3,2),(3,1,2,1,0,1,0,0,3),(4,1,4,1,0,1,0,0,4);
/*!40000 ALTER TABLE `leaderboard` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `matches`
--

DROP TABLE IF EXISTS `matches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `matches` (
  `match_id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `round_number` int NOT NULL DEFAULT '1',
  `competitor1_id` int NOT NULL,
  `competitor2_id` int DEFAULT NULL,
  `scheduled_at` datetime NOT NULL,
  `status` enum('scheduled','live','completed','cancelled') NOT NULL DEFAULT 'scheduled',
  PRIMARY KEY (`match_id`),
  KEY `fk_match_comp1` (`competitor1_id`,`tournament_id`),
  KEY `fk_match_comp2` (`competitor2_id`,`tournament_id`),
  KEY `idx_matches_schedule` (`tournament_id`,`scheduled_at`),
  CONSTRAINT `fk_match_comp1` FOREIGN KEY (`competitor1_id`, `tournament_id`) REFERENCES `registrations` (`registration_id`, `tournament_id`),
  CONSTRAINT `fk_match_comp2` FOREIGN KEY (`competitor2_id`, `tournament_id`) REFERENCES `registrations` (`registration_id`, `tournament_id`),
  CONSTRAINT `fk_match_tournament` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`tournament_id`),
  CONSTRAINT `chk_match_different` CHECK ((`competitor1_id` <> `competitor2_id`)),
  CONSTRAINT `chk_match_round` CHECK ((`round_number` >= 1))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `matches`
--

LOCK TABLES `matches` WRITE;
/*!40000 ALTER TABLE `matches` DISABLE KEYS */;
INSERT INTO `matches` VALUES (1,1,1,1,2,'2026-10-12 18:00:00','completed'),(2,1,1,3,4,'2026-10-12 20:00:00','completed'),(3,1,2,1,3,'2026-10-18 19:00:00','scheduled'),(4,2,1,5,6,'2026-12-05 16:00:00','scheduled'),(5,2,1,7,8,'2026-12-05 17:30:00','scheduled');
/*!40000 ALTER TABLE `matches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `players`
--

DROP TABLE IF EXISTS `players`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `players` (
  `player_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `gamer_tag` varchar(50) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `country` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`player_id`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `gamer_tag` (`gamer_tag`),
  CONSTRAINT `fk_players_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `players`
--

LOCK TABLES `players` WRITE;
/*!40000 ALTER TABLE `players` DISABLE KEYS */;
INSERT INTO `players` VALUES (1,2,'ShadowX','Aarav Sharma','India','2026-10-18 11:23:16'),(2,3,'BlazeQueen','Riya Patel','India','2026-10-18 11:23:16'),(3,4,'NovaK','Karan Mehta','India','2026-10-18 11:23:16'),(4,5,'ViperS','Sneha Iyer','India','2026-10-18 11:23:16'),(5,6,'RogueRD','Rohan Das','India','2026-10-18 11:23:16'),(6,7,'TitanAN','Ananya Nair','India','2026-10-18 11:23:16'),(7,8,'EchoVS','Vikram Singh','India','2026-10-18 11:23:16'),(8,9,'PixelMR','Meera Reddy','India','2026-10-18 11:23:16');
/*!40000 ALTER TABLE `players` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `registrations`
--

DROP TABLE IF EXISTS `registrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registrations` (
  `registration_id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `player_id` int DEFAULT NULL,
  `team_id` int DEFAULT NULL,
  `status` enum('registered','confirmed','withdrawn','disqualified') NOT NULL DEFAULT 'registered',
  `registered_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`registration_id`),
  UNIQUE KEY `uq_reg_in_tournament` (`registration_id`,`tournament_id`),
  UNIQUE KEY `uq_reg_player` (`tournament_id`,`player_id`),
  UNIQUE KEY `uq_reg_team` (`tournament_id`,`team_id`),
  KEY `fk_reg_player` (`player_id`),
  KEY `fk_reg_team` (`team_id`),
  CONSTRAINT `fk_reg_player` FOREIGN KEY (`player_id`) REFERENCES `players` (`player_id`),
  CONSTRAINT `fk_reg_team` FOREIGN KEY (`team_id`) REFERENCES `teams` (`team_id`),
  CONSTRAINT `fk_reg_tournament` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`tournament_id`),
  CONSTRAINT `chk_reg_one_competitor` CHECK ((((`player_id` is not null) and (`team_id` is null)) or ((`player_id` is null) and (`team_id` is not null))))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `registrations`
--

LOCK TABLES `registrations` WRITE;
/*!40000 ALTER TABLE `registrations` DISABLE KEYS */;
INSERT INTO `registrations` VALUES (1,1,NULL,1,'confirmed','2026-10-18 11:23:16'),(2,1,NULL,2,'confirmed','2026-10-18 11:23:16'),(3,1,NULL,3,'confirmed','2026-10-18 11:23:16'),(4,1,NULL,4,'confirmed','2026-10-18 11:23:16'),(5,2,1,NULL,'confirmed','2026-10-18 11:23:16'),(6,2,2,NULL,'confirmed','2026-10-18 11:23:16'),(7,2,3,NULL,'confirmed','2026-10-18 11:23:16'),(8,2,4,NULL,'confirmed','2026-10-18 11:23:16');
/*!40000 ALTER TABLE `registrations` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_check_registration` BEFORE INSERT ON `registrations` FOR EACH ROW BEGIN
    DECLARE v_type VARCHAR(10);
    DECLARE v_max INT;
    DECLARE v_count INT;

    SELECT competitor_type, max_participants INTO v_type, v_max
    FROM tournaments WHERE tournament_id = NEW.tournament_id;

    IF v_type = 'solo' AND NEW.player_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This is a solo tournament: register a player';
    END IF;
    IF v_type = 'team' AND NEW.team_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This is a team tournament: register a team';
    END IF;

    SELECT COUNT(*) INTO v_count FROM registrations
    WHERE tournament_id = NEW.tournament_id AND status <> 'withdrawn';
    IF v_count >= v_max THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tournament is full';
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `results`
--

DROP TABLE IF EXISTS `results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `results` (
  `result_id` int NOT NULL AUTO_INCREMENT,
  `match_id` int NOT NULL,
  `winner_registration` int DEFAULT NULL,
  `score1` int NOT NULL DEFAULT '0',
  `score2` int NOT NULL DEFAULT '0',
  `recorded_by` int NOT NULL,
  `recorded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`result_id`),
  UNIQUE KEY `match_id` (`match_id`),
  KEY `fk_result_winner` (`winner_registration`),
  KEY `fk_result_admin` (`recorded_by`),
  CONSTRAINT `fk_result_admin` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`user_id`),
  CONSTRAINT `fk_result_match` FOREIGN KEY (`match_id`) REFERENCES `matches` (`match_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_result_winner` FOREIGN KEY (`winner_registration`) REFERENCES `registrations` (`registration_id`),
  CONSTRAINT `chk_result_scores` CHECK (((`score1` >= 0) and (`score2` >= 0)))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `results`
--

LOCK TABLES `results` WRITE;
/*!40000 ALTER TABLE `results` DISABLE KEYS */;
INSERT INTO `results` VALUES (1,1,1,13,9,1,'2026-10-18 11:23:16'),(2,2,3,13,7,1,'2026-10-18 11:23:16');
/*!40000 ALTER TABLE `results` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_check_winner` BEFORE INSERT ON `results` FOR EACH ROW BEGIN
    DECLARE v_c1 INT;
    DECLARE v_c2 INT;

    SELECT competitor1_id, competitor2_id INTO v_c1, v_c2
    FROM matches WHERE match_id = NEW.match_id;

    IF NEW.winner_registration IS NOT NULL
       AND NEW.winner_registration <> v_c1
       AND (v_c2 IS NULL OR NEW.winner_registration <> v_c2) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Winner did not play in this match';
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `team_members`
--

DROP TABLE IF EXISTS `team_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team_members` (
  `team_id` int NOT NULL,
  `player_id` int NOT NULL,
  `joined_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`team_id`,`player_id`),
  KEY `fk_tm_player` (`player_id`),
  CONSTRAINT `fk_tm_player` FOREIGN KEY (`player_id`) REFERENCES `players` (`player_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tm_team` FOREIGN KEY (`team_id`) REFERENCES `teams` (`team_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_members`
--

LOCK TABLES `team_members` WRITE;
/*!40000 ALTER TABLE `team_members` DISABLE KEYS */;
INSERT INTO `team_members` VALUES (1,1,'2026-10-18 11:23:16'),(1,2,'2026-10-18 11:23:16'),(2,3,'2026-10-18 11:23:16'),(2,4,'2026-10-18 11:23:16'),(3,5,'2026-10-18 11:23:16'),(3,6,'2026-10-18 11:23:16'),(4,7,'2026-10-18 11:23:16'),(4,8,'2026-10-18 11:23:16');
/*!40000 ALTER TABLE `team_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teams`
--

DROP TABLE IF EXISTS `teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teams` (
  `team_id` int NOT NULL AUTO_INCREMENT,
  `team_name` varchar(100) NOT NULL,
  `captain_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`team_id`),
  UNIQUE KEY `team_name` (`team_name`),
  KEY `fk_teams_captain` (`captain_id`),
  CONSTRAINT `fk_teams_captain` FOREIGN KEY (`captain_id`) REFERENCES `players` (`player_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teams`
--

LOCK TABLES `teams` WRITE;
/*!40000 ALTER TABLE `teams` DISABLE KEYS */;
INSERT INTO `teams` VALUES (1,'Alpha Squad',1,'2026-10-18 11:23:16'),(2,'Beta Blazers',3,'2026-10-18 11:23:16'),(3,'Gamma Guardians',5,'2026-10-18 11:23:16'),(4,'Delta Dragons',7,'2026-10-18 11:23:16');
/*!40000 ALTER TABLE `teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournament_entries`
--

DROP TABLE IF EXISTS `tournament_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournament_entries` (
  `entry_id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `player_name` varchar(50) NOT NULL,
  `team_name` varchar(50) DEFAULT NULL,
  `entry_type` enum('solo','duo','squad') NOT NULL DEFAULT 'solo',
  `registered_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`entry_id`),
  KEY `fk_entry_tournament` (`tournament_id`),
  KEY `idx_entries_user` (`user_id`),
  CONSTRAINT `fk_entry_tournament` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`tournament_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_entry_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournament_entries`
--

LOCK TABLES `tournament_entries` WRITE;
/*!40000 ALTER TABLE `tournament_entries` DISABLE KEYS */;
INSERT INTO `tournament_entries` VALUES (1,2,NULL,'ojas',NULL,'solo','2026-10-19 19:35:03'),(2,3,NULL,'ShadowX',NULL,'solo','2026-10-19 19:35:10'),(3,2,NULL,'ShadowX','vipers','solo','2026-10-19 23:22:26'),(4,5,10,'Starojas','Strikers','solo','2026-10-20 02:08:28'),(5,2,11,'Toshi',NULL,'solo','2026-10-20 02:09:28'),(6,3,12,'Staroj',NULL,'solo','2026-10-20 02:15:54'),(7,5,11,'Viper','Strikers','duo','2026-10-20 02:32:59');
/*!40000 ALTER TABLE `tournament_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournaments`
--

DROP TABLE IF EXISTS `tournaments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournaments` (
  `tournament_id` int NOT NULL AUTO_INCREMENT,
  `game_id` int NOT NULL,
  `created_by` int NOT NULL,
  `name` varchar(150) NOT NULL,
  `format` enum('single_elimination','double_elimination','round_robin') NOT NULL DEFAULT 'single_elimination',
  `competitor_type` enum('solo','duo','squad','team') NOT NULL,
  `max_participants` int NOT NULL,
  `prize_pool` decimal(10,2) NOT NULL DEFAULT '0.00',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('upcoming','registration_open','ongoing','completed','cancelled') NOT NULL DEFAULT 'upcoming',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tournament_id`),
  KEY `fk_tournaments_game` (`game_id`),
  KEY `fk_tournaments_admin` (`created_by`),
  KEY `idx_tournaments_status` (`status`),
  CONSTRAINT `fk_tournaments_admin` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`),
  CONSTRAINT `fk_tournaments_game` FOREIGN KEY (`game_id`) REFERENCES `games` (`game_id`),
  CONSTRAINT `chk_tournament_capacity` CHECK ((`max_participants` >= 2)),
  CONSTRAINT `chk_tournament_dates` CHECK ((`end_date` >= `start_date`)),
  CONSTRAINT `chk_tournament_prize` CHECK ((`prize_pool` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournaments`
--

LOCK TABLES `tournaments` WRITE;
/*!40000 ALTER TABLE `tournaments` DISABLE KEYS */;
INSERT INTO `tournaments` VALUES (1,1,1,'Valorant Champions Cup','single_elimination','team',8,50000.00,'2026-10-10','2026-10-20','ongoing','2026-10-18 11:23:16'),(2,4,1,'Chess Open Challenge','single_elimination','solo',16,10000.00,'2026-12-05','2026-12-07','registration_open','2026-10-18 11:23:16'),(3,6,1,'Strike-Rush','single_elimination','team',32,50000.00,'2026-12-30','2026-12-30','registration_open','2026-10-19 13:08:20'),(4,2,1,'100 v 1','single_elimination','team',101,2000.00,'2026-12-20','2026-12-20','upcoming','2026-10-19 17:53:38'),(5,3,1,'Champions LEague','single_elimination','duo',64,50000.00,'2026-11-30','2026-11-30','registration_open','2026-10-19 20:38:11');
/*!40000 ALTER TABLE `tournaments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_sessions`
--

DROP TABLE IF EXISTS `user_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_sessions` (
  `token_hash` char(64) NOT NULL,
  `user_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime NOT NULL,
  PRIMARY KEY (`token_hash`),
  KEY `idx_sessions_user` (`user_id`),
  CONSTRAINT `fk_session_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_sessions`
--

LOCK TABLES `user_sessions` WRITE;
/*!40000 ALTER TABLE `user_sessions` DISABLE KEYS */;
INSERT INTO `user_sessions` VALUES ('e98f419315354d08e3354453f56dded2198db4ca7cb86989f03b8e7d75187e59',11,'2026-10-20 02:16:39','2026-10-27 02:16:39');
/*!40000 ALTER TABLE `user_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('player','admin') NOT NULL DEFAULT 'player',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin_master','admin@gametourney.com','hash_placeholder','admin','2026-10-18 11:23:16'),(2,'shadow_x','aarav@gametourney.com','hash_placeholder','player','2026-10-18 11:23:16'),(3,'blaze_queen','riya@gametourney.com','hash_placeholder','player','2026-10-18 11:23:16'),(4,'nova_k','karan@gametourney.com','hash_placeholder','player','2026-10-18 11:23:16'),(5,'viper_s','sneha@gametourney.com','hash_placeholder','player','2026-10-18 11:23:16'),(6,'rogue_rd','rohan@gametourney.com','hash_placeholder','player','2026-10-18 11:23:16'),(7,'titan_an','ananya@gametourney.com','hash_placeholder','player','2026-10-18 11:23:16'),(8,'echo_vs','vikram@gametourney.com','hash_placeholder','player','2026-10-18 11:23:16'),(9,'pixel_mr','meera@gametourney.com','hash_placeholder','player','2026-10-18 11:23:16'),(10,'Starojas','oj@test1.com','scrypt$b1e3741a5cd1804183063571916bca3c$515bfd40daab87cfa2e148fd6f8a9914ce62a6707991b0c2ae1f4bc091a7b9e2669f0624ac3a6dc6bdf5696662906c9b92da4c6d644821d7cbafb8f31fc0492d','player','2026-10-19 20:36:23'),(11,'Toshi','tosh@test2.com','scrypt$54af564b46cadb9babe5dd09667f3087$9ced9d9b7a15a72c9ec77828310083e9b155582e9777336d742ffe96594295983121682e8e3c21e7810c118787d51b0dac012cebbe575e58fbd2058f70d634f8','player','2026-10-19 20:39:15'),(12,'Staroj','oj@toshi.com','scrypt$8ef625c16fcfabde93ffd7b72390faae$5dc3cb1a2c64b028fd4d45b68f9e4e6644920c4d66d5b061fc214c27fde4bb30bf092c871f11fba31a65432a2daddc2651e8dfe387682fdd83333b0484712089','player','2026-10-19 20:45:43');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `v_match_schedule`
--

DROP TABLE IF EXISTS `v_match_schedule`;
/*!50001 DROP VIEW IF EXISTS `v_match_schedule`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_match_schedule` AS SELECT 
 1 AS `match_id`,
 1 AS `tournament`,
 1 AS `round_number`,
 1 AS `scheduled_at`,
 1 AS `status`,
 1 AS `competitor1`,
 1 AS `competitor2`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_tournament_leaderboard`
--

DROP TABLE IF EXISTS `v_tournament_leaderboard`;
/*!50001 DROP VIEW IF EXISTS `v_tournament_leaderboard`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_tournament_leaderboard` AS SELECT 
 1 AS `tournament_id`,
 1 AS `tournament`,
 1 AS `rank_position`,
 1 AS `competitor`,
 1 AS `matches_played`,
 1 AS `wins`,
 1 AS `losses`,
 1 AS `draws`,
 1 AS `points`*/;
SET character_set_client = @saved_cs_client;

--
-- Dumping routines for database 'gaming_tournament_db'
--
/*!50003 DROP PROCEDURE IF EXISTS `record_match_result` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `record_match_result`(
    IN p_match_id INT, IN p_winner INT,
    IN p_score1 INT,   IN p_score2 INT, IN p_admin INT)
BEGIN
    DECLARE v_t  INT;
    DECLARE v_c1 INT;
    DECLARE v_c2 INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT tournament_id, competitor1_id, competitor2_id INTO v_t, v_c1, v_c2
    FROM matches WHERE match_id = p_match_id FOR UPDATE;

    IF v_t IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Match not found';
    END IF;

    INSERT INTO results (match_id, winner_registration, score1, score2, recorded_by)
    VALUES (p_match_id, p_winner, p_score1, p_score2, p_admin);

    UPDATE matches SET status = 'completed' WHERE match_id = p_match_id;

    INSERT IGNORE INTO leaderboard (tournament_id, registration_id) VALUES (v_t, v_c1);
    UPDATE leaderboard SET
        matches_played = matches_played + 1,
        wins   = wins   + IF(p_winner = v_c1, 1, 0),
        losses = losses + IF(p_winner IS NOT NULL AND p_winner <> v_c1, 1, 0),
        draws  = draws  + IF(p_winner IS NULL, 1, 0),
        points = points + IF(p_winner = v_c1, 3, IF(p_winner IS NULL, 1, 0))
    WHERE tournament_id = v_t AND registration_id = v_c1;

    IF v_c2 IS NOT NULL THEN
        INSERT IGNORE INTO leaderboard (tournament_id, registration_id) VALUES (v_t, v_c2);
        UPDATE leaderboard SET
            matches_played = matches_played + 1,
            wins   = wins   + IF(p_winner = v_c2, 1, 0),
            losses = losses + IF(p_winner IS NOT NULL AND p_winner <> v_c2, 1, 0),
            draws  = draws  + IF(p_winner IS NULL, 1, 0),
            points = points + IF(p_winner = v_c2, 3, IF(p_winner IS NULL, 1, 0))
        WHERE tournament_id = v_t AND registration_id = v_c2;
    END IF;

    UPDATE leaderboard l
    JOIN (SELECT leaderboard_id,
                 RANK() OVER (ORDER BY points DESC, wins DESC) AS rnk
          FROM leaderboard WHERE tournament_id = v_t) x
      ON x.leaderboard_id = l.leaderboard_id
    SET l.rank_position = x.rnk;

    COMMIT;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Current Database: `gaming_tournament_db`
--

USE `gaming_tournament_db`;

--
-- Final view structure for view `v_match_schedule`
--

/*!50001 DROP VIEW IF EXISTS `v_match_schedule`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_match_schedule` AS select `m`.`match_id` AS `match_id`,`tr`.`name` AS `tournament`,`m`.`round_number` AS `round_number`,`m`.`scheduled_at` AS `scheduled_at`,`m`.`status` AS `status`,coalesce(`t1`.`team_name`,`p1`.`gamer_tag`) AS `competitor1`,coalesce(`t2`.`team_name`,`p2`.`gamer_tag`) AS `competitor2` from (((((((`matches` `m` join `tournaments` `tr` on((`tr`.`tournament_id` = `m`.`tournament_id`))) join `registrations` `r1` on((`r1`.`registration_id` = `m`.`competitor1_id`))) left join `teams` `t1` on((`t1`.`team_id` = `r1`.`team_id`))) left join `players` `p1` on((`p1`.`player_id` = `r1`.`player_id`))) left join `registrations` `r2` on((`r2`.`registration_id` = `m`.`competitor2_id`))) left join `teams` `t2` on((`t2`.`team_id` = `r2`.`team_id`))) left join `players` `p2` on((`p2`.`player_id` = `r2`.`player_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_tournament_leaderboard`
--

/*!50001 DROP VIEW IF EXISTS `v_tournament_leaderboard`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_tournament_leaderboard` AS select `l`.`tournament_id` AS `tournament_id`,`tr`.`name` AS `tournament`,`l`.`rank_position` AS `rank_position`,coalesce(`tm`.`team_name`,`p`.`gamer_tag`) AS `competitor`,`l`.`matches_played` AS `matches_played`,`l`.`wins` AS `wins`,`l`.`losses` AS `losses`,`l`.`draws` AS `draws`,`l`.`points` AS `points` from ((((`leaderboard` `l` join `tournaments` `tr` on((`tr`.`tournament_id` = `l`.`tournament_id`))) join `registrations` `r` on((`r`.`registration_id` = `l`.`registration_id`))) left join `teams` `tm` on((`tm`.`team_id` = `r`.`team_id`))) left join `players` `p` on((`p`.`player_id` = `r`.`player_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-20  2:34:15
