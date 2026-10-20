CREATE DATABASE IF NOT EXISTS gaming_tournament_db;
USE gaming_tournament_db;

DROP VIEW IF EXISTS v_match_schedule;
DROP VIEW IF EXISTS v_tournament_leaderboard;
DROP PROCEDURE IF EXISTS record_match_result;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS tournament_entries;
DROP TABLE IF EXISTS results;
DROP TABLE IF EXISTS leaderboard;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS registrations;
DROP TABLE IF EXISTS team_members;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS tournaments;
DROP TABLE IF EXISTS games;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  user_id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('player','admin') NOT NULL DEFAULT 'player',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY username (username),
  UNIQUE KEY email (email)
) ENGINE=InnoDB;

CREATE TABLE games (
  game_id INT NOT NULL AUTO_INCREMENT,
  game_name VARCHAR(100) NOT NULL,
  genre VARCHAR(50) DEFAULT NULL,
  platform VARCHAR(50) DEFAULT NULL,
  PRIMARY KEY (game_id),
  UNIQUE KEY game_name (game_name)
) ENGINE=InnoDB;

CREATE TABLE players (
  player_id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  gamer_tag VARCHAR(50) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  country VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (player_id),
  UNIQUE KEY user_id (user_id),
  UNIQUE KEY gamer_tag (gamer_tag),
  CONSTRAINT fk_players_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE teams (
  team_id INT NOT NULL AUTO_INCREMENT,
  team_name VARCHAR(100) NOT NULL,
  captain_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (team_id),
  UNIQUE KEY team_name (team_name),
  KEY fk_teams_captain (captain_id),
  CONSTRAINT fk_teams_captain FOREIGN KEY (captain_id) REFERENCES players (player_id)
) ENGINE=InnoDB;

CREATE TABLE team_members (
  team_id INT NOT NULL,
  player_id INT NOT NULL,
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (team_id, player_id),
  KEY fk_tm_player (player_id),
  CONSTRAINT fk_tm_player FOREIGN KEY (player_id) REFERENCES players (player_id) ON DELETE CASCADE,
  CONSTRAINT fk_tm_team FOREIGN KEY (team_id) REFERENCES teams (team_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE tournaments (
  tournament_id INT NOT NULL AUTO_INCREMENT,
  game_id INT NOT NULL,
  created_by INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  format ENUM('single_elimination','double_elimination','round_robin') NOT NULL DEFAULT 'single_elimination',
  competitor_type ENUM('solo','duo','squad','team') NOT NULL,
  max_participants INT NOT NULL,
  prize_pool DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('upcoming','registration_open','ongoing','completed','cancelled') NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tournament_id),
  KEY fk_tournaments_game (game_id),
  KEY fk_tournaments_admin (created_by),
  KEY idx_tournaments_status (status),
  CONSTRAINT fk_tournaments_admin FOREIGN KEY (created_by) REFERENCES users (user_id),
  CONSTRAINT fk_tournaments_game FOREIGN KEY (game_id) REFERENCES games (game_id),
  CONSTRAINT chk_tournament_capacity CHECK (max_participants >= 2),
  CONSTRAINT chk_tournament_dates CHECK (end_date >= start_date),
  CONSTRAINT chk_tournament_prize CHECK (prize_pool >= 0)
) ENGINE=InnoDB;

CREATE TABLE registrations (
  registration_id INT NOT NULL AUTO_INCREMENT,
  tournament_id INT NOT NULL,
  player_id INT DEFAULT NULL,
  team_id INT DEFAULT NULL,
  status ENUM('registered','confirmed','withdrawn','disqualified') NOT NULL DEFAULT 'registered',
  registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (registration_id),
  UNIQUE KEY uq_reg_in_tournament (registration_id, tournament_id),
  UNIQUE KEY uq_reg_player (tournament_id, player_id),
  UNIQUE KEY uq_reg_team (tournament_id, team_id),
  KEY fk_reg_player (player_id),
  KEY fk_reg_team (team_id),
  CONSTRAINT fk_reg_player FOREIGN KEY (player_id) REFERENCES players (player_id),
  CONSTRAINT fk_reg_team FOREIGN KEY (team_id) REFERENCES teams (team_id),
  CONSTRAINT fk_reg_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments (tournament_id),
  CONSTRAINT chk_reg_one_competitor CHECK (
    (player_id IS NOT NULL AND team_id IS NULL) OR (player_id IS NULL AND team_id IS NOT NULL)
  )
) ENGINE=InnoDB;

CREATE TABLE matches (
  match_id INT NOT NULL AUTO_INCREMENT,
  tournament_id INT NOT NULL,
  round_number INT NOT NULL DEFAULT 1,
  competitor1_id INT NOT NULL,
  competitor2_id INT DEFAULT NULL,
  scheduled_at DATETIME NOT NULL,
  status ENUM('scheduled','live','completed','cancelled') NOT NULL DEFAULT 'scheduled',
  PRIMARY KEY (match_id),
  KEY fk_match_comp1 (competitor1_id, tournament_id),
  KEY fk_match_comp2 (competitor2_id, tournament_id),
  KEY idx_matches_schedule (tournament_id, scheduled_at),
  CONSTRAINT fk_match_comp1 FOREIGN KEY (competitor1_id, tournament_id) REFERENCES registrations (registration_id, tournament_id),
  CONSTRAINT fk_match_comp2 FOREIGN KEY (competitor2_id, tournament_id) REFERENCES registrations (registration_id, tournament_id),
  CONSTRAINT fk_match_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments (tournament_id),
  CONSTRAINT chk_match_different CHECK (competitor1_id <> competitor2_id),
  CONSTRAINT chk_match_round CHECK (round_number >= 1)
) ENGINE=InnoDB;

CREATE TABLE leaderboard (
  leaderboard_id INT NOT NULL AUTO_INCREMENT,
  tournament_id INT NOT NULL,
  registration_id INT NOT NULL,
  matches_played INT NOT NULL DEFAULT 0,
  wins INT NOT NULL DEFAULT 0,
  losses INT NOT NULL DEFAULT 0,
  draws INT NOT NULL DEFAULT 0,
  points INT NOT NULL DEFAULT 0,
  rank_position INT DEFAULT NULL,
  PRIMARY KEY (leaderboard_id),
  UNIQUE KEY uq_lb_entry (tournament_id, registration_id),
  KEY fk_lb_registration (registration_id, tournament_id),
  KEY idx_lb_ranking (tournament_id, points DESC),
  CONSTRAINT fk_lb_registration FOREIGN KEY (registration_id, tournament_id) REFERENCES registrations (registration_id, tournament_id),
  CONSTRAINT chk_lb_values CHECK (matches_played >= 0 AND wins >= 0 AND losses >= 0 AND draws >= 0 AND points >= 0)
) ENGINE=InnoDB;

CREATE TABLE results (
  result_id INT NOT NULL AUTO_INCREMENT,
  match_id INT NOT NULL,
  winner_registration INT DEFAULT NULL,
  score1 INT NOT NULL DEFAULT 0,
  score2 INT NOT NULL DEFAULT 0,
  recorded_by INT NOT NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (result_id),
  UNIQUE KEY match_id (match_id),
  KEY fk_result_winner (winner_registration),
  KEY fk_result_admin (recorded_by),
  CONSTRAINT fk_result_admin FOREIGN KEY (recorded_by) REFERENCES users (user_id),
  CONSTRAINT fk_result_match FOREIGN KEY (match_id) REFERENCES matches (match_id) ON DELETE CASCADE,
  CONSTRAINT fk_result_winner FOREIGN KEY (winner_registration) REFERENCES registrations (registration_id),
  CONSTRAINT chk_result_scores CHECK (score1 >= 0 AND score2 >= 0)
) ENGINE=InnoDB;

CREATE TABLE tournament_entries (
  entry_id INT NOT NULL AUTO_INCREMENT,
  tournament_id INT NOT NULL,
  user_id INT DEFAULT NULL,
  player_name VARCHAR(50) NOT NULL,
  team_name VARCHAR(50) DEFAULT NULL,
  entry_type ENUM('solo','duo','squad') NOT NULL DEFAULT 'solo',
  registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (entry_id),
  KEY fk_entry_tournament (tournament_id),
  KEY idx_entries_user (user_id),
  CONSTRAINT fk_entry_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments (tournament_id) ON DELETE CASCADE,
  CONSTRAINT fk_entry_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE user_sessions (
  token_hash CHAR(64) NOT NULL,
  user_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  PRIMARY KEY (token_hash),
  KEY idx_sessions_user (user_id),
  CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO users VALUES
(1,'admin_master','admin@gametourney.com','hash_placeholder','admin','2026-10-18 11:23:16'),
(2,'shadow_x','aarav@gametourney.com','hash_placeholder','player','2026-10-18 11:23:16'),
(3,'blaze_queen','riya@gametourney.com','hash_placeholder','player','2026-10-18 11:23:16'),
(4,'nova_k','karan@gametourney.com','hash_placeholder','player','2026-10-18 11:23:16'),
(5,'viper_s','sneha@gametourney.com','hash_placeholder','player','2026-10-18 11:23:16'),
(6,'rogue_rd','rohan@gametourney.com','hash_placeholder','player','2026-10-18 11:23:16'),
(7,'titan_an','ananya@gametourney.com','hash_placeholder','player','2026-10-18 11:23:16'),
(8,'echo_vs','vikram@gametourney.com','hash_placeholder','player','2026-10-18 11:23:16'),
(9,'pixel_mr','meera@gametourney.com','hash_placeholder','player','2026-10-18 11:23:16'),
(10,'Starojas','oj@test1.com','scrypt$b1e3741a5cd1804183063571916bca3c$515bfd40daab87cfa2e148fd6f8a9914ce62a6707991b0c2ae1f4bc091a7b9e2669f0624ac3a6dc6bdf5696662906c9b92da4c6d644821d7cbafb8f31fc0492d','player','2026-10-19 20:36:23'),
(11,'Toshi','tosh@test2.com','scrypt$54af564b46cadb9babe5dd09667f3087$9ced9d9b7a15a72c9ec77828310083e9b155582e9777336d742ffe96594295983121682e8e3c21e7810c118787d51b0dac012cebbe575e58fbd2058f70d634f8','player','2026-10-19 20:39:15'),
(12,'Staroj','oj@toshi.com','scrypt$8ef625c16fcfabde93ffd7b72390faae$5dc3cb1a2c64b028fd4d45b68f9e4e6644920c4d66d5b061fc214c27fde4bb30bf092c871f11fba31a65432a2daddc2651e8dfe387682fdd83333b0484712089','player','2026-10-19 20:45:43');

INSERT INTO games VALUES
(1,'Valorant','FPS','PC'),
(2,'BGMI','Battle Royale','Mobile'),
(3,'EA SPORTS FC','Sports','PC/Console'),
(4,'Chess','Strategy','Online'),
(5,'Free Fire','Battle Royale','Mobile'),
(6,'Counter-Strike 2','FPS','PC'),
(7,'Call of Duty: Mobile','FPS','Mobile'),
(8,'PUBG: Battlegrounds','Battle Royale','PC/Console'),
(9,'Fortnite','Battle Royale','PC/Console'),
(10,'Rocket League','Sports','PC/Console');

INSERT INTO players VALUES
(1,2,'ShadowX','Aarav Sharma','India','2026-10-18 11:23:16'),
(2,3,'BlazeQueen','Riya Patel','India','2026-10-18 11:23:16'),
(3,4,'NovaK','Karan Mehta','India','2026-10-18 11:23:16'),
(4,5,'ViperS','Sneha Iyer','India','2026-10-18 11:23:16'),
(5,6,'RogueRD','Rohan Das','India','2026-10-18 11:23:16'),
(6,7,'TitanAN','Ananya Nair','India','2026-10-18 11:23:16'),
(7,8,'EchoVS','Vikram Singh','India','2026-10-18 11:23:16'),
(8,9,'PixelMR','Meera Reddy','India','2026-10-18 11:23:16');

INSERT INTO teams VALUES
(1,'Alpha Squad',1,'2026-10-18 11:23:16'),
(2,'Beta Blazers',3,'2026-10-18 11:23:16'),
(3,'Gamma Guardians',5,'2026-10-18 11:23:16'),
(4,'Delta Dragons',7,'2026-10-18 11:23:16');

INSERT INTO team_members VALUES
(1,1,'2026-10-18 11:23:16'),(1,2,'2026-10-18 11:23:16'),
(2,3,'2026-10-18 11:23:16'),(2,4,'2026-10-18 11:23:16'),
(3,5,'2026-10-18 11:23:16'),(3,6,'2026-10-18 11:23:16'),
(4,7,'2026-10-18 11:23:16'),(4,8,'2026-10-18 11:23:16');

INSERT INTO tournaments VALUES
(1,1,1,'Valorant Champions Cup','single_elimination','team',8,50000.00,'2026-10-10','2026-10-20','ongoing','2026-10-18 11:23:16'),
(2,4,1,'Chess Open Challenge','single_elimination','solo',16,10000.00,'2026-12-05','2026-12-07','registration_open','2026-10-18 11:23:16'),
(3,6,1,'Strike-Rush','single_elimination','team',32,50000.00,'2026-12-30','2026-12-30','registration_open','2026-10-19 13:08:20'),
(4,2,1,'100 v 1','single_elimination','team',101,2000.00,'2026-12-20','2026-12-20','upcoming','2026-10-19 17:53:38'),
(5,3,1,'Champions LEague','single_elimination','duo',64,50000.00,'2026-11-30','2026-11-30','registration_open','2026-10-19 20:38:11');

INSERT INTO registrations VALUES
(1,1,NULL,1,'confirmed','2026-10-18 11:23:16'),
(2,1,NULL,2,'confirmed','2026-10-18 11:23:16'),
(3,1,NULL,3,'confirmed','2026-10-18 11:23:16'),
(4,1,NULL,4,'confirmed','2026-10-18 11:23:16'),
(5,2,1,NULL,'confirmed','2026-10-18 11:23:16'),
(6,2,2,NULL,'confirmed','2026-10-18 11:23:16'),
(7,2,3,NULL,'confirmed','2026-10-18 11:23:16'),
(8,2,4,NULL,'confirmed','2026-10-18 11:23:16');

INSERT INTO matches VALUES
(1,1,1,1,2,'2026-10-12 18:00:00','completed'),
(2,1,1,3,4,'2026-10-12 20:00:00','completed'),
(3,1,2,1,3,'2026-10-18 19:00:00','scheduled'),
(4,2,1,5,6,'2026-12-05 16:00:00','scheduled'),
(5,2,1,7,8,'2026-12-05 17:30:00','scheduled');

INSERT INTO leaderboard VALUES
(1,1,3,1,1,0,0,3,1),
(2,1,1,1,1,0,0,3,2),
(3,1,2,1,0,1,0,0,3),
(4,1,4,1,0,1,0,0,4);

INSERT INTO results VALUES
(1,1,1,13,9,1,'2026-10-18 11:23:16'),
(2,2,3,13,7,1,'2026-10-18 11:23:16');

INSERT INTO tournament_entries VALUES
(1,2,NULL,'ojas',NULL,'solo','2026-10-19 19:35:03'),
(2,3,NULL,'ShadowX',NULL,'solo','2026-10-19 19:35:10'),
(3,2,NULL,'ShadowX','vipers','solo','2026-10-19 23:22:26'),
(4,5,10,'Starojas','Strikers','solo','2026-10-20 02:08:28'),
(5,2,11,'Toshi',NULL,'solo','2026-10-20 02:09:28'),
(6,3,12,'Staroj',NULL,'solo','2026-10-20 02:15:54'),
(7,5,11,'Viper','Strikers','duo','2026-10-20 02:32:59');

CREATE VIEW v_match_schedule AS
SELECT m.match_id,
       tr.name AS tournament,
       m.round_number,
       m.scheduled_at,
       m.status,
       COALESCE(t1.team_name, p1.gamer_tag) AS competitor1,
       COALESCE(t2.team_name, p2.gamer_tag) AS competitor2
FROM matches m
JOIN tournaments tr ON tr.tournament_id = m.tournament_id
JOIN registrations r1 ON r1.registration_id = m.competitor1_id
LEFT JOIN teams t1 ON t1.team_id = r1.team_id
LEFT JOIN players p1 ON p1.player_id = r1.player_id
LEFT JOIN registrations r2 ON r2.registration_id = m.competitor2_id
LEFT JOIN teams t2 ON t2.team_id = r2.team_id
LEFT JOIN players p2 ON p2.player_id = r2.player_id;

CREATE VIEW v_tournament_leaderboard AS
SELECT l.tournament_id,
       tr.name AS tournament,
       l.rank_position,
       COALESCE(tm.team_name, p.gamer_tag) AS competitor,
       l.matches_played,
       l.wins,
       l.losses,
       l.draws,
       l.points
FROM leaderboard l
JOIN tournaments tr ON tr.tournament_id = l.tournament_id
JOIN registrations r ON r.registration_id = l.registration_id
LEFT JOIN teams tm ON tm.team_id = r.team_id
LEFT JOIN players p ON p.player_id = r.player_id;

DELIMITER ;;

CREATE TRIGGER trg_check_registration BEFORE INSERT ON registrations FOR EACH ROW
BEGIN
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
END;;

CREATE TRIGGER trg_check_winner BEFORE INSERT ON results FOR EACH ROW
BEGIN
    DECLARE v_c1 INT;
    DECLARE v_c2 INT;

    SELECT competitor1_id, competitor2_id INTO v_c1, v_c2
    FROM matches WHERE match_id = NEW.match_id;

    IF NEW.winner_registration IS NOT NULL
       AND NEW.winner_registration <> v_c1
       AND (v_c2 IS NULL OR NEW.winner_registration <> v_c2) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Winner did not play in this match';
    END IF;
END;;

CREATE PROCEDURE record_match_result(
    IN p_match_id INT, IN p_winner INT,
    IN p_score1 INT, IN p_score2 INT, IN p_admin INT)
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
END;;

DELIMITER ;