const Discord = require('discord.js');

module.exports = {
	async execute() {
		const client = require('../../BaseClient/DiscordClient');
		const ch = client.ch;
		const res = await ch.query('SELECT * FROM reminders;');
		if (res && res.rowCount > 0) {
			for (const row of res.rows) {
				const text = row.text;
				const duration = row.duration;
				const channel = client.channels.cache.get(row.channelid);
				if (channel && channel.id) {
					const guild = channel.guild;
					const user = await client.users.fetch(row.userid).catch(() => {});
					if (user && user.id) {
						const timeLeft = duration - Date.now();
						if (timeLeft <= 0) end(guild, channel, user, text, duration);
						else setTimeout(() => end(guild, channel, user, text, duration), timeLeft);
					}
				}
			}
		}
		async function end(guild, channel, user, text, duration) {
			if (guild && guild.id) {
				const member = await guild.members.fetch(user.id).catch(() => { });
				if (member) {
					const language = await ch.languageSelector(guild);
					const embed = new Discord.MessageEmbed()
						.setDescription(`${language.ready.reminder.description}\n${text}`)
						.setColor(guild.me.displayHexColor)
						.setTimestamp();
					const m = await ch.send(channel, `${user}`, embed);
					if (!m || !m.id) ch.send(user, ch.stp(language.ready.reminder.failedMsg, { channel: channel }), embed);
					ch.query('DELETE FROM reminders WHERE userid = $1 AND duration = $2;', [user.id, duration]);
				} else {
					const language = await ch.languageSelector('en');
					const embed = new Discord.MessageEmbed()
						.setDescription(`${language.ready.reminder.description}\n${text}`)
						.setColor(guild.me.displayHexColor)
						.setTimestamp();
					ch.send(user, embed);
					ch.query('DELETE FROM reminders WHERE userid = $1 AND duration = $2;', [user.id, duration]);
				}
			}
		}
	}
};
