const {
    EmbedBuilder
} = require('discord.js');
const {
    SlashCommandBuilder
} = require('discord.js');
const Music = require('../../../utils/functions/data/Music');

module.exports.run = async ({
    main_interaction,
    bot
}) => {
    const musicApi = new Music(main_interaction, bot)

    await main_interaction.deferReply({
        ephemeral: true
    });

    if (!await musicApi.isUserInChannel()) return main_interaction.followUp({
        embeds: [
            new EmbedBuilder()
                .setColor('#ff0000')
                .setDescription('You must be in a voice channel to use this command!')
        ],
        ephemeral: true
    });


    const queue = await musicApi.getQueue();

    console.log(queue, queue.playing)

    if (!queue || !queue.playing) return main_interaction.followUp({
        embeds: [
            new EmbedBuilder()
                .setColor('#ff0000')
                .setDescription('There is no song playing right now!')
        ],
        ephemeral: true
    });

    
    return await main_interaction.followUp({
        embeds: [new EmbedBuilder()
            .setColor('#00ff00')
            .setDescription(`Now playing: ${queue.previousTracks[queue.previousTracks.length - 1].title}`)
        ],
        ephemeral: true
    });
    

};

module.exports.data = new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('What song is playing right now?')