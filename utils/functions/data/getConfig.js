const { errorhandler } = require('../errorhandler/errorhandler');
const config_file = require('../../../src/assets/json/_config/config.json');
const guildConfig = require('../../../src/db/Models/tables/guildConfig.model');

module.exports.insertGuildIntoGuildConfig = async (guild_id) => {
    return new Promise(async (resolve, reject) => {
        await guildConfig
            .create({
                guild_id: guild_id,
            })
            .then(() => {
                return resolve(true);
            })
            .catch((err) => {
                errorhandler({ err });
                return reject(err);
            });
    });
};

module.exports.getGuildConfig = async ({ guild_id }) => {
    return await guildConfig
        .get({
            where: {
                guild_id,
            },
        })
        .then((res) => {
            return res.length > 0 ? res : false;
        })
        .catch((err) => {
            errorhandler({ err });
            return false;
        });
};

module.exports.updateGuildConfig = async ({ guild_id, value, valueName }) => {
    return new Promise(async (resolve, reject) => {
        await guildConfig
            .update(
                {
                    [valueName]: value,
                },
                {
                    where: {
                        guild_id,
                    },
                }
            )
            .then(() => {
                return resolve(true);
            })
            .catch((err) => {
                errorhandler({ err });
                return reject(err);
            });
    });
};

//######################################################################################################################
//? PREFIX

module.exports.checkPrefix = async ({ value }) => {
    let pass = 0;
    for (let i in config_file.settings.prefix.required) {
        if (!value.endsWith(config_file.settings.prefix.required[i])) pass++;
    }
    if (pass === config_file.settings.prefix.required.length) return false;

    return true;
};
