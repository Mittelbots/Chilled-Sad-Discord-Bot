const {
    errorhandler
} = require("../errorhandler/errorhandler");
const {
    isMod
} = require("../isMod");

module.exports.checkMessage = async ({
    author,
    guild,
    target,
    bot,
    type
}) => {
    if (target.id === author.id) return `You can't ${type} yourself.`;
    if (target.id === bot.user.id) return `You cant't ${type} me.`;
    if (type === "mute" || type === "warn") {
        if (target.bot || target.system) return `You can't ${type} a bot!`;
    }
    const isAMod = await isMod({
        member: await guild.members.fetch(target.id),
        guild
    })
    if (isAMod) return `You can't ${type} a mod!`;

    if (type === "mute" || type === "ban" || type === "kick" || type === "unmute") {
        try {
            await guild.members.fetch();
            if (guild.members.cache.get(target.id).roles.highest.position > guild.members.resolve(bot.user).roles.highest.position) {
                return `The user has a higher role than the bot. I can't ${type} them.`;
            }
        } catch (err) {
            errorhandler({
                fatal: false,
                err
            });
        }
    }
}