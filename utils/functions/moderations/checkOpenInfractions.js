const { errorhandler } = require('../errorhandler/errorhandler');
const { Infractions } = require('../data/Infractions');
const { getMutedRole } = require('../roles/getMutedRole');

async function isMuted({ user, guild, bot }) {
    return new Promise(async (resolve) => {
        let open_infractions = await Infractions.getOpen({
            user_id: user.id,
            guild_id: guild.id,
        });
        open_infractions = open_infractions.filter((inf) => inf.mute);
        const mutedRole = await getMutedRole(bot.guilds.cache.get(guild.id));
        if (mutedRole.error) return resolve(mutedRole);

        const member = guild.members.cache.get(user.id);

        if (!member)
            return resolve({
                error: true,
                message: 'No member found!',
            });

        if (open_infractions.length > 0 && (await member.roles.cache.has(mutedRole))) {
            open_infractions.forEach((inf) => {
                const currentdate = new Date().getTime();
                const till_date = inf.till_date.getTime();
                if (currentdate - till_date <= 0) {
                    return resolve({
                        error: false,
                        isMuted: true,
                    });
                } else {
                    return resolve({
                        error: false,
                        isMuted: false,
                    });
                }
            });
        } else {
            return resolve({
                error: false,
                isMuted: false,
            });
        }
    });
}

async function isOnBanList({ user, guild }) {
    const fetchedLogs = await guild.fetchAuditLogs({
        type: 22,
    });
    var banLog = await fetchedLogs.entries.filter((entry) => entry.target.id === user.id);

    if (banLog) {
        banLog = banLog.first();
        var { executor, target, reason } = banLog;
    }

    return await guild.bans
        .fetch()
        .then(async (bans) => {
            let list = bans.filter((ban) => ban.user.id === user.id);

            if (list.size < 0) return [false];
            else return [true, reason, executor];
        })
        .catch((err) => {
            errorhandler({
                fatal: false,
                err,
            });
            return [false];
        });
}

async function isBanned(member, guild) {
    let banList = await guild.bans.fetch();

    const open_infractions = await Infractions.getOpen({
        user_id: member.id,
        guild_id: guild.id,
    });

    const banned = open_infractions.filter((inf) => inf.ban === 1);

    if (banned.length > 0) {
        const isUserOnBanList = banList.get(member.id);

        banned.forEach((inf) => {
            const currentdate = new Date().getTime();
            const till_date = inf.till_date.getTime();
            if (currentdate - till_date <= 0 || isUserOnBanList !== undefined) {
                return {
                    error: false,
                    isBanned: true,
                };
            } else {
                return {
                    error: false,
                    isBanned: false,
                };
            }
        });
    } else {
        return {
            error: false,
            isBanned: false,
        };
    }
}

module.exports = {
    isMuted,
    isBanned,
    isOnBanList,
};
