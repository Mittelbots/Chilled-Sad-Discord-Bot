const config = require('../../../src/assets/json/_config/config.json');
const commandconfig = require('../../assets/json/command_config/command_config.json');
const cmd_help = require('../../../src/assets/json/command_config/command_help.json');
const {
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const {
    errorhandler
} = require('../../../utils/functions/errorhandler/errorhandler');
const {
    removeMention
} = require('../../../utils/functions/removeCharacters');
const {
    insertPermsToModroles,
    deletePermsFromModroles,
    updatePermsFromModroles
} = require('../../../utils/functions/insertDataToDatabase');
const database = require('../../db/db');
const {
    getFromCache,
    addToCache
} = require('../../../utils/functions/cache/cache');

module.exports.run = async (bot, message, args) => {
    if (config.deleteModCommandsAfterUsage == 'true') {
        message.delete().catch(err => {});
    }
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        message.delete().catch(err => {});
        return message.channel.send(`<@${message.author.id}> ${config.errormessages.nopermission}`).then(msg => {
            setTimeout(() => msg.delete(), 5000);
        }).catch(err => {});
    }

    let setting = args[0]

    //? ADD OR REMOVE MODROLES //
    if (setting === commandconfig.mods.modroles.command || setting === commandconfig.mods.modroles.alias) {

        let value = args[1];
        if (!value || value === '') return message.reply('No role provied!');

        const isadmin = 'isadmin';
        const isadminLabel = 'Admin';
        var db_isadmin;

        const ismod = 'ismod';
        const ismodLabel = 'Moderator';
        var db_ismod;

        const ishelper = 'ishelper';
        const ishelperLabel = 'Helper';
        var db_ishelper;

        const remove = 'remove';
        const removeLabel = 'Remove';


        var roleid;

        var status = false;

        args[1] = removeMention(args[1])

        const cache = await getFromCache({
            cacheName: 'modroles',
            param_id: message.guild.id
        });

        if (!cache) {
            await addToCache({
                value: {
                    name: "joinroles",
                    data: {
                        id: message.guild.id,
                        role_id: []
                    }
                }
            });
            await database.query(`SELECT * FROM ${message.guild.id}_guild_modroles WHERE role_id = ?`, [args[1]]).then(async res => {
                if (await res.length > 0) {
                    roleid = await res[0].role_id;
                    db_isadmin = await res[0].isadmin
                    db_ismod = await res[0].ismod
                    db_ishelper = await res[0].ishelper
                    status = true;
                }
            }).catch(err => {
                return errorhandler({
                    err,
                    fatal: true
                });
            });
        } else {
            for (let i in cache[0].modroles) {
                if (cache[0].modroles[i].role_id === args[1]) {
                    roleid = cache[0].modroles[i].role_id;
                    db_isadmin = cache[0].modroles[i].isadmin
                    db_ismod = cache[0].modroles[i].ismod
                    db_ishelper = cache[0].modroles[i].ishelper
                    status = true;
                }
            }
        }

        if (roleid == null) value = removeMention(value);
        else value = roleid;

        const role = await bot.guilds.cache.get(message.guild.id).roles.fetch(value)

        if (!role) {
            return message.reply(`I could't found any role with this id. Please provide a existing one. (User ID doesnt work!)`)
        }

        let modroleembed = new EmbedBuilder()
            .setTitle(`Choose setting for _${role.name}_. \n\nCurrent: **${(db_isadmin) ? 'Admin': (db_ismod) ? 'Moderator': (db_ishelper) ? 'Helper' : 'Not set yet'}**`)

        const isAdminButton = new ButtonBuilder()
            .setCustomId(isadmin)
            .setLabel(isadminLabel)
            .setStyle(ButtonStyle.Primary)

        const isModButton = new ButtonBuilder()
            .setCustomId(ismod)
            .setLabel(ismodLabel)
            .setStyle(ButtonStyle.Primary)

        const isHelperButton = new ButtonBuilder()
            .setCustomId(ishelper)
            .setLabel(ishelperLabel)
            .setStyle(ButtonStyle.Primary)

        const isRemoveButton = new ButtonBuilder()
            .setCustomId(remove)
            .setLabel(removeLabel)
            .setStyle(ButtonStyle.Danger)

        const row = new ActionRowBuilder()
        if (db_isadmin !== 1) {
            row.addComponents(isAdminButton);

            modroleembed.addFields([{
                name: 'Admin Permissions',
                value: 'This role can use commands like ban, unban, etc.',
                inline: true
            }])
        }
        if (db_ismod !== 1) {
            row.addComponents(isModButton);

            modroleembed.addFields([{
                name: 'Moderator Permissions',
                value: 'This role can use commands like mute, kick, etc.',
                inline: true
            }])
        }
        if (db_ishelper !== 1) {
            row.addComponents(isHelperButton);

            modroleembed.addFields([{
                name: 'Helper Permissions',
                value: 'This role can use commands like warn, mute, etc.',
                inline: true
            }])
        }
        if (db_isadmin !== undefined || db_ismod !== undefined || db_ishelper !== undefined) {
            row.addComponents(isRemoveButton);
        }

        let pass = true;
        const embedMessage = await message.channel.send({
                embeds: [modroleembed],
                components: [row]
            })
            .catch(err => {
                pass = false;
                return errorhandler({
                    err
                });
            })

        if (!pass) return;

        const collector = embedMessage.createMessageComponentCollector({
            filter: ({
                user
            }) => user.id === message.author.id,
            time: 15000,
            max: 1
        });

        collector.on('collect', async interaction => {
            if (interaction.customId === isadmin) {
                if (db_isadmin == 1) return;
                if (status) {
                    updatePermsFromModroles(message.guild.id, value, 1, 0, 0)
                } else {
                    insertPermsToModroles(message.guild.id, value, 1, 0, 0)
                }

                isAdminButton.setStyle(ButtonStyle.Success);

            } else if (interaction.customId === ismod) {
                if (db_ismod == 1) return;
                if (status) {
                    updatePermsFromModroles(message.guild.id, value, 0, 1, 0)
                } else {
                    insertPermsToModroles(message.guild.id, value, 0, 1, 0)
                }

                isModButton.setStyle(ButtonStyle.Success);

            } else if (interaction.customId === ishelper) {
                if (db_ishelper == 1) return;
                if (status) {
                    updatePermsFromModroles(message.guild.id, value, 0, 0, 1)
                } else {
                    insertPermsToModroles(message.guild.id, value, 0, 0, 1)
                }

                isHelperButton.setStyle(ButtonStyle.Success);

            } else {
                deletePermsFromModroles(message.guild.id, value)

                isRemoveButton.setStyle(ButtonStyle.Success);
            }

            isAdminButton.setDisabled(true)
            isModButton.setDisabled(true)
            isHelperButton.setDisabled(true)
            isRemoveButton.setDisabled(true)
            interaction.update({
                components: [row]
            });

        });

        collector.on('end', (collected, reason) => {
            if (reason == 'time') {
                embedMessage.edit({
                    content: '**Time limit reached**',
                    embeds: [modroleembed],
                    components: []
                });
            }

        });

    } else return
}

module.exports.help = cmd_help.admin.mods;