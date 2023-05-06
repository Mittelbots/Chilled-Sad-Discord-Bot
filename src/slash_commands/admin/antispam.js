const { EmbedBuilder } = require('discord.js');
const { Automod } = require('../../../utils/functions/data/Automod');
const { anitSpamConfig, anitSpamPerms } = require('../_config/admin/antispam');
const { errorhandler } = require('../../../utils/functions/errorhandler/errorhandler');

module.exports.run = async ({ main_interaction, bot }) => {
    const setting = await Automod.get(main_interaction.guild.id);

    const antiSpamEnabled = JSON.parse(main_interaction.options.getString('enabled'));
    const antiSpamAction = main_interaction.options.getString('action');

    setting.antispam.action = main_interaction.options.getString('action');

    if (!setting.antispam) {
        setting.antispam = {
            enabled: antiSpamEnabled,
            action: antiSpamAction,
        };
    }

    setting.antispam.enabled = antiSpamEnabled;
    setting.antispam.action = antiSpamAction;

    Automod.update({
        guild_id: main_interaction.guild.id,
        value: setting,
        type: setting.antispam.action,
    })
        .then(() => {
            errorhandler({
                fatal: false,
                message: `${main_interaction.guild.id} has been updated the antispam config.`,
            });

            const description = setting.antispam.enabled
                ? global.t.trans(
                      ['success.automod.antispam.enabled', setting.antispam.action],
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

module.exports.data = anitSpamConfig;
module.exports.permissions = anitSpamPerms;
