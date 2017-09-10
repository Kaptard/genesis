'use strict';

const Command = require('../../Command.js');
const InvasionEmbed = require('../../embeds/InvasionEmbed.js');

/**
 * Displays the currently active Invasions
 */
class Invasions extends Command {
  /**
   * Constructs a callable command
   * @param {Genesis} bot  The bot object
   */
  constructor(bot) {
    super(bot, 'warframe.worldstate.invasions', 'invasion', 'Display the currently active Invasions');
    this.regex = new RegExp(`^${this.call}s?(?:\\s+on\\s+([pcsxb14]{2,3}))?$`, 'i');
  }

  /**
   * Run the command
   * @param {Message} message Messdsage with a command to handle, reply to,
   *                          or perform an action based on parameters.
   */
  async run(message) {
    const platformParam = message.strippedContent.match(this.regex)[1];
    const platform = platformParam || await this.bot.settings.getChannelPlatform(message.channel);
    const ws = await this.bot.caches[platform].getDataJson();
    const invasions = ws.invasions.filter(i => !i.completed);
    await this.messageManager.embed(message,
          new InvasionEmbed(this.bot, invasions), true, false);
  }
}

module.exports = Invasions;
