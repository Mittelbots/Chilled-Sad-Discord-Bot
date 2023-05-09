const { EmbedBuilder } = require('discord.js');
const { Automod } = require('../../../utils/functions/data/Automod');
const { errorhandler } = require('../../../utils/functions/errorhandler/errorhandler');
const { antiSpamConfig, antiSpamPerms } = require('../_config/admin/antispam');
const { removeMention } = require('../../../utils/functions/removeCharacters');

module.exports.run = async ({ main_interaction, bot }) => {
    const antiSpamSettings = await Automod.get(main_interaction.guild.id, 'antispam');

    const antiSpamEnabled = JSON.parse(main_interaction.options.getString('enabled'));
    const antiSpamAction = main_interaction.options.getString('action');

    const whitelistrolesInput = main_interaction.options.getString('whitelistroles') || '';
    const whitelistchannelsInput = main_interaction.options.getString('whitelistchannels') || '';

    const setting = {
        enabled: antiSpamEnabled,
        action: antiSpamAction,
        whitelistroles: antiSpamSettings.whitelistroles || [],
        whitelistchannels: antiSpamSettings.whitelistchannels || [],
    };

    whitelistrolesInput.split(',').forEach((role) => {
        const roleId = removeMention(role);
        if (setting.whitelistroles.includes(roleId)) {
            setting.whitelistroles.splice(setting.whitelistroles.indexOf(roleId), 1);
        } else {
            if (parseInt(roleId)) {
                setting.whitelistroles.push(roleId);
            }
        }
    });

    whitelistchannelsInput.split(',').forEach((channel) => {
        const channelId = removeMention(channel);
        if (setting.whitelistchannels.includes(channelId)) {
            setting.whitelistchannels.splice(setting.whitelistchannels.indexOf(channelId), 1);
        } else {
            if (!parseInt(channelId)) return;

            setting.whitelistchannels.push(channelId);
        }
    });

    Automod.update({
        guild_id: main_interaction.guild.id,
        value: setting,
        type: 'antispam',
    })
        .then(() => {
            errorhandler({
                fatal: false,
                message: `${main_interaction.guild.id} has been updated the antispam config.`,
            });

            const description = setting.enabled
                ? global.t.trans(
                      [
                          'success.automod.antispam.enabled',
                          setting.action,
                          setting.whitelistroles.map((role) => `<@&${role}>`).join(' ') || 'Empty',
                          setting.whitelistchannels.map((channel) => `<#${channel}>`).join(' ') ||
                              'Empty',
                      ],
                      main_interaction.guild.id
                  )
                : global.t.trans(['success.automod.antispam.disabled'], main_interaction.guild.id);

            main_interaction
                .reply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(description)
                            .setColor(global.t.trans(['general.colors.success'])),
                    ],
                    ephemeral: true,
                })
                .catch((err) => {});
        })
        .catch((err) => {
            main_interaction
                .reply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(
                                global.t.trans(
                                    ['error.generalWithMessage', err.message],
                                    main_interaction.guild.id
                                )
                            )
                            .setColor(global.t.trans(['general.colors.error'])),
                    ],
                    ephemeral: true,
                })
                .catch((err) => {});
        });
};

module.exports.data = antiSpamConfig;
module.exports.permissions = antiSpamPerms;
