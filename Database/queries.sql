USE gaming_tournament_db;

SELECT t.team_name, p.gamer_tag
FROM teams t
JOIN team_members tm ON tm.team_id = t.team_id
JOIN players p ON p.player_id = tm.player_id
ORDER BY t.team_name;

SELECT tr.name, g.game_name, tr.competitor_type, tr.status
FROM tournaments tr
JOIN games g ON g.game_id = tr.game_id;

SELECT tr.name, COUNT(r.registration_id) AS entries, tr.max_participants
FROM tournaments tr
LEFT JOIN registrations r ON r.tournament_id = tr.tournament_id
GROUP BY tr.tournament_id, tr.name, tr.max_participants;

SELECT AVG(score1 + score2) AS avg_total_score, MAX(score1 + score2) AS highest_total
FROM results;

SELECT t.team_name, SUM(l.wins) AS total_wins
FROM leaderboard l
JOIN registrations r ON r.registration_id = l.registration_id
JOIN teams t ON t.team_id = r.team_id
GROUP BY t.team_id, t.team_name
ORDER BY total_wins DESC;

CREATE OR REPLACE VIEW v_tournament_leaderboard AS
SELECT l.tournament_id, tr.name AS tournament, l.rank_position,
       COALESCE(tm.team_name, p.gamer_tag) AS competitor,
       l.matches_played, l.wins, l.losses, l.draws, l.points
FROM leaderboard l
JOIN tournaments tr   ON tr.tournament_id = l.tournament_id
JOIN registrations r  ON r.registration_id = l.registration_id
LEFT JOIN teams tm    ON tm.team_id = r.team_id
LEFT JOIN players p   ON p.player_id = r.player_id;

CREATE OR REPLACE VIEW v_match_schedule AS
SELECT m.match_id, tr.name AS tournament, m.round_number, m.scheduled_at, m.status,
       COALESCE(t1.team_name, p1.gamer_tag) AS competitor1,
       COALESCE(t2.team_name, p2.gamer_tag) AS competitor2
FROM matches m
JOIN tournaments tr   ON tr.tournament_id = m.tournament_id
JOIN registrations r1 ON r1.registration_id = m.competitor1_id
LEFT JOIN teams t1    ON t1.team_id = r1.team_id
LEFT JOIN players p1  ON p1.player_id = r1.player_id
LEFT JOIN registrations r2 ON r2.registration_id = m.competitor2_id
LEFT JOIN teams t2    ON t2.team_id = r2.team_id
LEFT JOIN players p2  ON p2.player_id = r2.player_id;

DELIMITER //

DROP TRIGGER IF EXISTS trg_check_registration//
CREATE TRIGGER trg_check_registration
BEFORE INSERT ON registrations
FOR EACH ROW
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
END//

DROP TRIGGER IF EXISTS trg_check_winner//
CREATE TRIGGER trg_check_winner
BEFORE INSERT ON results
FOR EACH ROW
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
END//

DROP PROCEDURE IF EXISTS record_match_result//
CREATE PROCEDURE record_match_result(
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
END//

DELIMITER ;

