const { ButtonBuilder } = require('discord.js');
const { ActionRowBuilder } = require('discord.js');
const { ButtonStyle } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const singasong = require('../../../src/db/Models/tables/singasong.model');
const { errorhandler } = require('../errorhandler/errorhandler');
const SingASongLogic = require('./SingASongLogic');

module.exports = class SingASong extends SingASongLogic {
    API_URL = 'https://api.quotable.io/random';
    #embed = new EmbedBuilder();
    quote = '';
    #finishButton = new ButtonBuilder();
    #upVoteButton = new ButtonBuilder();
    #row = new ActionRowBuilder();
    lastSentence = '';
    points = 0;

    constructor(main_interaction, bot) {
        super();
        this.author = main_interaction.user;
        this.bot = bot;
        this.voicechannel = main_interaction.member.voice.channel;
        this.main_interaction = main_interaction;

        return this;
    }

    initCheck() {
        if (!this.voicechannel) return 'You must be in a voice channel to use this command!';
        if(this.voicechannel.members.size < 2) return 'You must be in a voice channel with at least 1 other person to use this command!';

        return true;
    }

    start() {
        return new Promise(async (resolve, reject) => {
            await this.getSentence();
            if (!this.quote) return reject('An error occured while getting a sentence!');

            if (await this.isAlreadyOtherEventStarted())
                return reject('There is already another event running!');

            this.#generateSingEmbed();
            this.#generateFinishButton();

            const user = await this.getUser();
            if (!user) {
                await this.createUser().catch((err) => {
                    return reject(err);
                });
            } else {
                const check = this.checkUser(user);
                if (check) return reject(check);

                while (user.used_sentences.includes(this.quote)) {
                    await this.getSentence();
                    if (!this.quote) return reject('An error occured while getting a sentence!');
                }

                user.used_sentences.push(this.quote);

                await this.updateUser({
                    isCurrentlyPlaying: true,
                    used_sentences: user.used_sentences,
                }).catch(() => {
                    return reject(`An error occured while i updated some data!`);
                });
            }

            await this.#sendEmbed()
                .then(async () => {
                    return resolve(true);
                })
                .catch((err) => {});
        });
    }

    #generateSingEmbed() {
        this.#embed
            .setTitle('Sing A Song')
            .setImage(
                `https://4.bp.blogspot.com/-6-KJapp0Ptw/UNGyore_1dI/AAAAAAAACdk/eKDZDixzcQw/s1600/the+only+cat+that+can+sing+to+the+world.PNG`
            )
            .setDescription('Sing a song which describes the sentence below!')
            .addFields(
                {
                    name: '⬇️ Your sentence: ⬇️',
                    value: this.quote + '\n------------------------',
                },
                {
                    name: '❓What do i do when i finish?',
                    value: 'When you finished singing, click on the finish button below!',
                }
            )
            .setColor('#00FF00')
            .setTimestamp()
            .setFooter({
                text: `Requested by ${this.author.username}`,
                iconURL: this.author.displayAvatarURL(),
            });
    }

    #generateVoteEmbed() {
        return new Promise(async (resolve, reject) => {
            await this.getLastSentence();
            this.#embed
                .setDescription(
                    "Up-Vote if you liked the song! (or don't upvote if you didn't like it)\nYou have 60 seconds to upvote!"
                )
                .addFields({
                    name: '⬇️ The sentence was: ⬇️',
                    value: this.lastSentence,
                })
                .setColor('#00FF00')
                .setTimestamp()
                .setFooter({
                    text: `Requested by ${this.author.username}`,
                    iconURL: this.author.displayAvatarURL(),
                });
            resolve(true);
        });
    }

    #generateFinishButton() {
        this.#finishButton
            .setStyle(ButtonStyle.Success)
            .setLabel('Finished!')
            .setCustomId('singasong_finish');

        this.#row.addComponents(this.#finishButton);
    }

    #generateUpVoteButton() {
        this.#upVoteButton
            .setStyle(ButtonStyle.Success)
            .setLabel('Upvote')
            .setCustomId('singasong_upvote');

        this.#row.addComponents(this.#upVoteButton);
    }

    #sendEmbed() {
        return new Promise(async (resolve, reject) => {
            this.main_interaction
                .reply({
                    embeds: [this.#embed],
                    components: [this.#row],
                    fetchReply: true,
                })
                .then(() => {
                    return resolve(true);
                })
                .catch((err) => {
                    errorhandler({
                        err,
                        fatal: false,
                    });
                    this.main_interaction.reply({
                        content:
                            'I do not have permission to send embeds or messages to this channel!',
                        ephemeral: true,
                    });
                    return reject(false);
                });
        });
    }

    interaction() {
        return new Promise(async (resolve, reject) => {
            if (this.main_interaction.customId === 'singasong_finish') {
                if (this.main_interaction.user.id !== this.author.id) {
                    return this.main_interaction.reply({
                        content: 'You are not the one who started the game!',
                        ephemeral: true,
                    });
                }

                if (!(await this.isUserPlaying()))
                    return this.main_interaction.reply({
                        content: 'You are not playing an event!',
                        ephemeral: true,
                    });

                this.#finish();
            } else if (this.main_interaction.customId === 'singasong_upvote') {
                if (this.main_interaction.user.id === this.author.id) {
                    return this.main_interaction.reply({
                        content: 'You cannot upvote your own song!',
                        ephemeral: true,
                    });
                }

                this.#upvote()
                    .then(() => {
                        this.main_interaction.reply({
                            content: 'You upvoted the song!',
                            ephemeral: true,
                        });
                    })
                    .catch((err) => {
                        this.main_interaction.reply({
                            content:
                                typeof err === 'string'
                                    ? err
                                    : 'An error occured while upvoting the song! Please try again later!',
                            ephemeral: true,
                        });
                    });
            }
        });
    }

    #finish() {
        return new Promise(async (resolve, reject) => {
            this.#row = new ActionRowBuilder();
            this.#embed = new EmbedBuilder();
            await this.#generateVoteEmbed();
            this.#generateUpVoteButton();

            this.main_interaction
                .update({
                    embeds: [this.#embed],
                    components: [this.#row],
                })
                .catch((err) => {
                    errorhandler({
                        err,
                        fatal: false,
                    });
                });

            this.#startTimer();
        });
    }

    #getAllUpvotes() {
        return new Promise(async (resolve, reject) => {
            await singasong
                .findOne({
                    where: {
                        user_id: this.author.id,
                    },
                })
                .then((data) => {
                    return resolve(data.upvotes);
                })
                .catch((err) => {
                    errorhandler({
                        err,
                    });
                    return reject(false);
                });
        });
    }

    #upvote() {
        return new Promise(async (resolve, reject) => {
            if (!this.voicechannel.members.has(this.author.id)) {
                return reject(`You are not in the same voice channel as the Singer!`);
            }

            const allUpVotes = await this.#getAllUpvotes();
            if (!allUpVotes) return reject(false);

            const userHasVoted = allUpVotes.includes(this.main_interaction.user.id);
            if (userHasVoted) {
                return reject(`You have already upvoted this song!`);
            }

            allUpVotes.push(this.main_interaction.user.id);

            await singasong
                .update(
                    {
                        upvotes: allUpVotes,
                    },
                    {
                        where: {
                            user_id: this.author.id,
                        },
                    }
                )
                .then(() => {
                    return resolve(true);
                })
                .catch((err) => {
                    errorhandler({
                        err,
                    });
                    return reject(false);
                });
        });
    }

    #showResults(interaction) {
        return new Promise(async (resolve, reject) => {
            const allUpVotes = await this.#getAllUpvotes();
            if (!allUpVotes) return reject(false);

            this.points = allUpVotes.length;

            this.#embed
                .setDescription(`The Voting has finished! You got ${this.points} points!`)
                .setColor('#00FF00')
                .setTimestamp()
                .setFooter({
                    text: `Requested by ${this.author.username}`,
                    iconURL: this.author.displayAvatarURL(),
                });

            interaction.message.delete();

            interaction.channel
                .send({
                    embeds: [this.#embed],
                    components: [],
                })
                .then(() => {
                    return resolve(true);
                });
        });
    }

    #resetEvent() {
        return new Promise(async (resolve, reject) => {
            await singasong
                .update(
                    {
                        isCurrentlyPlaying: false,
                        guild_id: null,
                    },
                    {
                        where: {
                            user_id: this.author.id,
                        },
                    }
                )
                .then(() => {
                    return resolve(true);
                })
                .catch((err) => {
                    errorhandler({
                        err,
                    });
                    return reject(false);
                });
        });
    }

    #startTimer() {
        setTimeout(async () => {
            await this.#showResults(this.main_interaction);
            await this.givePoints();
            await this.#resetEvent();
        }, 60000);
    }

    viewMyPoints() {
        return new Promise(async (resolve, reject) => {});
    }

    view(type = 'all', user = null) {
        return new Promise(async (resolve, reject) => {});
    }
};
