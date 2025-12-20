const { query } = require("../config/database");
const { GAME_STATUS, GAME_CONSTANTS } = require("../utils/constants");
const { roundToTwo, paginate } = require("../utils/helpers");

class Game {
  /**
   * Créer une nouvelle partie
   */
  static async create(userId, betAmount, connection = query) {
    const sql = `
            INSERT INTO games (
                user_id,
                bet_amount,
                multiplier_reached,
                game_status,
                game_speed,
                started_at
            ) VALUES (?, ?, ?, ?, ?, NOW())
        `;

    const result = await connection(sql, [
      userId,
      roundToTwo(betAmount),
      1.0,
      GAME_STATUS.PLAYING,
      GAME_CONSTANTS.BASE_SPEED,
    ]);

    return {
      id: result.insertId,
      userId,
      betAmount: roundToTwo(betAmount),
      multiplier: 1.0,
      status: GAME_STATUS.PLAYING,
      startedAt: new Date(),
    };
  }

  /**
   * Trouver une partie par ID
   */
  static async findById(gameId, connection = query) {
    const sql = "SELECT * FROM games WHERE id = ?";
    const games = await connection(sql, [gameId]);
    return games[0] || null;
  }

  /**
   * Trouver la partie active d'un utilisateur
   */
  static async findActiveByUserId(userId, connection = query) {
    const sql = `SELECT * FROM games WHERE user_id = ? AND game_status = ? ORDER BY started_at DESC LIMIT 1`;
    const games = await connection(sql, [userId, GAME_STATUS.PLAYING]);
    return games[0] || null;
  }

  /**
   * Obtenir l'historique des parties d'un utilisateur
   */
  static async getHistory(userId, page = 1, limit = 10) {
    const { offset, limit: limitNum } = paginate(page, limit);

    const totalSql = `SELECT COUNT(*) as total FROM games WHERE user_id = ?`;
    const [totalResult] = await query(totalSql, [userId]);
    const total = totalResult.total;

    const sql = `
          SELECT 
              id, 
              bet_amount, 
              multiplier_reached, 
              win_amount, 
              game_status, 
              started_at, 
              ended_at 
          FROM games
          WHERE user_id = ?
          ORDER BY started_at DESC
          LIMIT ? OFFSET ?
      `;
    const data = await query(sql, [userId, limitNum, offset]);

    const sanitizedData = data.map((g) => ({
      ...g,
      bet_amount: parseFloat(g.bet_amount),
      multiplier_reached: parseFloat(g.multiplier_reached),
      win_amount: parseFloat(g.win_amount),
      win: g.game_status === GAME_STATUS.CASHED_OUT,
      loss: g.game_status === GAME_STATUS.CRASHED,
    }));

    return { data: sanitizedData, total };
  }

  /**
   * Obtenir les statistiques de jeu d'un utilisateur
   */
  static async getUserStats(userId) {
    const sql = `
            SELECT 
                COUNT(*) as total_games,
                SUM(CASE WHEN game_status = ? THEN 1 ELSE 0 END) as total_wins,
                SUM(CASE WHEN game_status = ? THEN 1 ELSE 0 END) as total_losses,
                SUM(bet_amount) as total_bets,
                SUM(win_amount) as total_payouts,
                MAX(multiplier_reached) as highest_multiplier,
                AVG(multiplier_reached) as avg_multiplier_played
            FROM games
            WHERE user_id = ?
        `;

    const stats = await query(sql, [
      GAME_STATUS.CASHED_OUT,
      GAME_STATUS.CRASHED,
      userId,
    ]);

    // Nettoyage et typage
    const result = stats[0] || {};
    return {
      totalGames: parseInt(result.total_games) || 0,
      totalWins: parseInt(result.total_wins) || 0,
      totalLosses: parseInt(result.total_losses) || 0,
      totalBets: parseFloat(result.total_bets) || 0,
      totalPayouts: parseFloat(result.total_payouts) || 0,
      highestMultiplier: parseFloat(result.highest_multiplier) || 0,
      avgMultiplierPlayed: parseFloat(result.avg_multiplier_played) || 0,
    };
  }

  /**
   * Obtenir le classement des meilleurs joueurs
   */
  static async getLeaderboard(limit = 10) {
    const sql = `
          SELECT 
              u.prenom,
              u.nom,
              MAX(g.multiplier_reached) as highest_multiplier,
              SUM(g.win_amount) - SUM(g.bet_amount) as net_profit
          FROM games g
          INNER JOIN users u ON g.user_id = u.id
          WHERE g.game_status IN (?, ?)
          GROUP BY u.id
          ORDER BY highest_multiplier DESC, net_profit DESC
          LIMIT ?
      `;
    const leaderboard = await query(sql, [
      GAME_STATUS.CASHED_OUT,
      GAME_STATUS.CRASHED,
      limit,
    ]);

    // Masquage et typage
    return leaderboard.map((l) => ({
      name: `${l.prenom} ${l.nom.charAt(0)}.`,
      highestMultiplier: parseFloat(l.highest_multiplier),
      netProfit: roundToTwo(parseFloat(l.net_profit)),
    }));
  }

  /**
   * Obtenir les meilleures parties récentes
   */
  static async getTopGames(limit = 10) {
    const sql = `
          SELECT 
              g.id,
              g.bet_amount,
              g.multiplier_reached,
              g.win_amount,
              g.started_at,
              u.prenom,
              u.nom
          FROM games g
          INNER JOIN users u ON g.user_id = u.id
          WHERE g.game_status = ?
          ORDER BY g.multiplier_reached DESC
          LIMIT ?
      `;
    const topGames = await query(sql, [GAME_STATUS.CASHED_OUT, limit]);

    // Masquage et typage
    return topGames.map((g) => ({
      gameId: g.id,
      name: `${g.prenom} ${g.nom.charAt(0)}.`,
      betAmount: parseFloat(g.bet_amount),
      multiplier: parseFloat(g.multiplier_reached),
      winAmount: parseFloat(g.win_amount),
      date: g.started_at,
    }));
  }

  /**
   * Obtenir les statistiques globales
   */
  static async getGlobalStats() {
    const sql = `
            SELECT 
                COUNT(*) as total_games,
                SUM(bet_amount) as total_bets,
                SUM(win_amount) as total_payouts,
                MAX(multiplier_reached) as highest_multiplier_ever,
                AVG(multiplier_reached) as avg_multiplier
            FROM games
        `;
    const stats = await query(sql);
    return stats[0] || null;
  }

  /**
   * Obtenir les parties actives actuellement
   */
  static async getActiveGames() {
    const sql = `
            SELECT 
                g.id,
                g.user_id,
                g.bet_amount,
                g.multiplier_reached,
                g.started_at,
                u.prenom,
                u.nom
            FROM games g
            INNER JOIN users u ON g.user_id = u.id
            WHERE g.game_status = ?
            ORDER BY g.started_at DESC
        `;
    const activeGames = await query(sql, [GAME_STATUS.PLAYING]);

    // Masquage et typage
    return activeGames.map((g) => ({
      gameId: g.id,
      name: `${g.prenom} ${g.nom.charAt(0)}.`,
      betAmount: parseFloat(g.bet_amount),
      multiplier: parseFloat(g.multiplier_reached),
      startedAt: g.started_at,
    }));
  }

  /**
   * Nettoyer les anciennes parties actives (en cas de crash)
   */
  static async cleanupStalledGames(timeoutMinutes = 30) {
    const sql = `
            UPDATE games 
            SET game_status = ?,
                ended_at = NOW()
            WHERE game_status = ?
            AND started_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)
        `;
    const result = await query(sql, [
      GAME_STATUS.CRASHED,
      GAME_STATUS.PLAYING,
      timeoutMinutes,
    ]);
    return result.affectedRows;
  }
}

module.exports = Game;
