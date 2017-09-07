'use strict';

const request = require('request-promise');

const carbonToken = process.env.DISCORD_CARBON_TOKEN;
const botsDiscordPwToken = process.env.DISCORD_BOTS_WEB_TOKEN;
const botsDiscordPwUser = process.env.DISCORD_BOTS_WEB_USER;
const updateInterval = process.env.TRACKERS_UPDATE_INTERVAL || 3660000;
const cachetToken = process.env.CACHET_TOKEN;
const cachetHost = process.env.CACHET_HOST;
const metricId = process.env.CACHET_BOT_METRIC_ID;
const heartBeatTime = process.env.CACHET_HEARTBEAT || 600000;

/**
 * Describes a tracking service for updating remote sites
 * with server count for this bot
 */
class Tracker {
  /**
   * Constructs a simple tracking service with the given logger
   * @param {Logger} logger          Simple logger for logging information
   * @param {Client} client Discord Client for fetching statistucs from
   * @param {ShardClientUtil} shardUtil Discord shard client util
   * used to fetch shard count of all shards
   */
  constructor(logger, client, shardUtil, { shardId = 0, shardCount = 1 }) {
    this.logger = logger;
    this.client = client;
    this.shardUtil = shardUtil;
    this.shardId = shardId;
    this.shardCount = shardCount;


    if (carbonToken && this.shardId === 0) {
      setInterval(() => this.updateCarbonitex(this.shardUtil), updateInterval);
    }
    if (botsDiscordPwToken && botsDiscordPwUser) {
      setInterval(() => this.updateDiscordBotsWeb(this.client.guilds.size), updateInterval);
    }
    if (cachetToken && cachetHost && metricId) {
      setInterval(() => this.postHeartBeat(), heartBeatTime);
    }
  }

  /**
   * Updates carbonitex.net if the corresponding token is provided
   * @param {ShardClientUtil} shardUtil Discord shard client util used
   * to fetch shard count of all shards
   */
  async updateCarbonitex(shardUtil) {
    if (carbonToken) {
      const results = await shardUtil.fetchClientValues('guilds.size');
      const guildsLen = results.reduce((prev, val) => prev + val, 0);
      this.logger.debug('Updating Carbonitex');
      this.logger.debug(`${this.client.user.username} is on ${guildsLen} servers`);
      const requestBody = {
        url: 'https://www.carbonitex.net/discord/data/botdata.php',
        body: {
          key: carbonToken,
          servercount: guildsLen,
        },
        json: true,
      };
      try {
        const parsedBody = await request(requestBody);
        this.logger.debug(parsedBody);
      } catch (err) {
        this.logger.error(`Error updating carbonitex. Token: ${carbonToken} | Error Code: ${err.statusCode} | Guilds: ${guildsLen}`);
      }
    }
  }

  /**
   * Updates bots.discord.pw if the corresponding token is provided
   * @param   {number}  guildsLen number of guilds that this bot is present on
   */
  async updateDiscordBotsWeb(guildsLen) {
    if (botsDiscordPwToken && botsDiscordPwUser) {
      this.logger.debug('Updating discord bots');
      this.logger.debug(`${this.client.username} is on ${guildsLen} servers`);
      const requestBody = {
        method: 'POST',
        url: `https://bots.discord.pw/api/bots/${botsDiscordPwUser}/stats`,
        headers: {
          Authorization: botsDiscordPwToken,
          'Content-Type': 'application/json',
        },
        body: {
          shard_id: parseInt(this.shardId, 10),
          shard_count: parseInt(this.shardCount, 10),
          server_count: parseInt(guildsLen, 10),
        },
        json: true,
      };
      try {
        const parsedBody = await request(requestBody);
        this.logger.debug(parsedBody);
      } catch (err) {
        this.logger.error(`Error updating Bots.Discord.pw. Token: ${botsDiscordPwToken} | User: ${botsDiscordPwUser} | Error Code: ${err.statusCode}`);
      }
    }
  }

  /**
   * Update all trackers
   * @param {number} guildsLen Number of guilds that this bot is present on
   */
  updateAll(guildsLen) {
    this.updateCarbonitex(guildsLen);
    this.updateDiscordBotsWeb(guildsLen);
  }

  /**
   * Post the cachet heartbeat for the shardCount
   */
  async postHeartBeat() {
    const requestBody = {
      method: 'POST',
      url: `${cachetHost}/api/v1/metrics/${metricId}/points`,
      headers: {
        'Content-Type': 'application/json',
        'X-Cachet-Token': cachetToken,
      },
      body: {
        value: 1,
      },
      json: true,
    };
    const parsedBody = await request(requestBody);
    this.logger.debug(parsedBody);
  }
}

module.exports = Tracker;
