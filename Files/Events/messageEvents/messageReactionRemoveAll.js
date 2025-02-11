const Discord = require('discord.js');

module.exports = {
	async execute(msg) {
		const client = msg.client;
		const guild = msg.guild;
		const ch = client.ch;
		const Constants = client.constants;
		const res = await ch.query('SELECT * FROM logchannels WHERE guildid = $1;', [guild.id]);
		if (res && res.rowCount > 0) {
			const channels = res.rows[0].messageevents?.map((id) => typeof client.channels.cache.get(id)?.send == 'function' ? client.channels.cache.get(id) : null).filter(c => c !== null);
			if (channels && channels.length) {
				const language = await ch.languageSelector(guild);
				const con = Constants.messageReactionRemoveAll;
				const lan = language.messageReactionRemoveAll;
				const embed = new Discord.MessageEmbed()
					.setColor(con.color)
					.setAuthor(lan.author.name, con.author.image, con.author.link)
					.setTimestamp()
					.setDescription(ch.stp(lan.description, {link: ch.stp(con.author.link, {msg: msg})}));
				ch.send(channels, embed);
			}
		}
	}
};