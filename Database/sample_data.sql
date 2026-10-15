USE gaming_tournament_db;

INSERT INTO users (user_id, username, email, password_hash, role) VALUES
(1, 'admin_master', 'admin@gametourney.com',   'hash_placeholder', 'admin'),
(2, 'shadow_x',     'aarav@gametourney.com',   'hash_placeholder', 'player'),
(3, 'blaze_queen',  'riya@gametourney.com',    'hash_placeholder', 'player'),
(4, 'nova_k',       'karan@gametourney.com',   'hash_placeholder', 'player'),
(5, 'viper_s',      'sneha@gametourney.com',   'hash_placeholder', 'player'),
(6, 'rogue_rd',     'rohan@gametourney.com',   'hash_placeholder', 'player'),
(7, 'titan_an',     'ananya@gametourney.com',  'hash_placeholder', 'player'),
(8, 'echo_vs',      'vikram@gametourney.com',  'hash_placeholder', 'player'),
(9, 'pixel_mr',     'meera@gametourney.com',   'hash_placeholder', 'player');

INSERT INTO players (player_id, user_id, gamer_tag, full_name, country) VALUES
(1, 2, 'ShadowX',   'Aarav Sharma', 'India'),
(2, 3, 'BlazeQueen','Riya Patel',   'India'),
(3, 4, 'NovaK',     'Karan Mehta',  'India'),
(4, 5, 'ViperS',    'Sneha Iyer',   'India'),
(5, 6, 'RogueRD',   'Rohan Das',    'India'),
(6, 7, 'TitanAN',   'Ananya Nair',  'India'),
(7, 8, 'EchoVS',    'Vikram Singh', 'India'),
(8, 9, 'PixelMR',   'Meera Reddy',  'India');

INSERT INTO teams (team_id, team_name, captain_id) VALUES
(1, 'Alpha Squad',      1),
(2, 'Beta Blazers',     3),
(3, 'Gamma Guardians',  5),
(4, 'Delta Dragons',    7);

INSERT INTO team_members (team_id, player_id) VALUES
(1, 1), (1, 2),
(2, 3), (2, 4),
(3, 5), (3, 6),
(4, 7), (4, 8);

INSERT INTO tournaments
(tournament_id, game_id, created_by, name, format, competitor_type, max_participants, prize_pool, start_date, end_date, status) VALUES
(1, 1, 1, 'Valorant Champions Cup', 'single_elimination', 'team', 8,  50000.00, '2026-10-10', '2026-10-20', 'ongoing'),
(2, 4, 1, 'Chess Open Challenge',   'single_elimination', 'solo', 16, 10000.00, '2026-12-05', '2026-12-07', 'registration_open');

INSERT INTO registrations (registration_id, tournament_id, team_id, status) VALUES
(1, 1, 1, 'confirmed'),
(2, 1, 2, 'confirmed'),
(3, 1, 3, 'confirmed'),
(4, 1, 4, 'confirmed');
INSERT INTO registrations (registration_id, tournament_id, player_id, status) VALUES
(5, 2, 1, 'confirmed'),
(6, 2, 2, 'confirmed'),
(7, 2, 3, 'confirmed'),
(8, 2, 4, 'confirmed');

INSERT INTO matches
(match_id, tournament_id, round_number, competitor1_id, competitor2_id, scheduled_at, status) VALUES
(1, 1, 1, 1, 2, '2026-10-12 18:00:00', 'completed'),
(2, 1, 1, 3, 4, '2026-10-12 20:00:00', 'completed'),
(3, 1, 2, 1, 3, '2026-10-18 19:00:00', 'scheduled'),
(4, 2, 1, 5, 6, '2026-12-05 16:00:00', 'scheduled'),
(5, 2, 1, 7, 8, '2026-12-05 17:30:00', 'scheduled');

INSERT INTO results (match_id, winner_registration, score1, score2, recorded_by) VALUES
(1, 1, 13, 9, 1),
(2, 3, 13, 7, 1);

INSERT INTO leaderboard
(tournament_id, registration_id, matches_played, wins, losses, draws, points, rank_position) VALUES
(1, 3, 1, 1, 0, 0, 3, 1),
(1, 1, 1, 1, 0, 0, 3, 2),
(1, 2, 1, 0, 1, 0, 0, 3),
(1, 4, 1, 0, 1, 0, 0, 4);

