const Discord = require('discord.js');

module.exports = {
	async execute(executor, target, reason, msg) {
		msg.m ? msg.m = await msg.m.fetch() : null;
		let mexisted = msg.m ? true : false;
		const con = msg.client.constants.mod.warnAdd;
		const language = await msg.client.ch.languageSelector(msg.guild);
		const lan = language.mod.warnAdd;
		let em;
		if (mexisted) {
			em = new Discord.MessageEmbed(msg.m.embeds[0])
				.setColor(con.color)
				.addField('\u200b', msg.client.constants.emotes.loading + ' ' + lan.loading);
		} else {
			em = new Discord.MessageEmbed()
				.setColor(con.color)
				.setDescription(msg.client.constants.emotes.loading + ' ' + lan.loading);
		}
		if (mexisted) await msg.m.edit({ embeds: [em] });
		else msg.m = await msg.client.ch.reply(msg, em);
		const member = await msg.guild.members.fetch(target.id).catch(() => { });
		const exec = await msg.guild.members.fetch(executor.id).catch(() => { });
		if (exec?.roles.highest.rawPosition < member?.roles.highest.rawPosition || exec?.roles.highest.rawPosition == member?.roles.highest.rawPosition) {
			if (mexisted) em.fields.pop(), em.addField('\u200b', msg.client.constants.emotes.cross + ' ' + lan.exeNoPerms);
			else em.setDescription(msg.client.constants.emotes.cross + ' ' + lan.exeNoPerms);
			msg.m?.edit({ embeds: [em] });
			if (mexisted) setTimeout(() => msg.m?.delete().catch(() => { }), 10000);
			return false;
		}
		const warnEmbed = new Discord.MessageEmbed()
			.setTitle(msg.client.ch.stp(lan.DMtitle, {guild: msg.guild}))
			.setColor(con.color)
			.setDescription(`${msg.language.reason}: \n${reason}`)
			.setTimestamp();
		msg.client.ch.send(target, warnEmbed);
		const WarnLogEmbed = new Discord.MessageEmbed()
			.setAuthor(msg.client.ch.stp(lan.log.author, {target: target}), msg.client.ch.displayAvatarURL(target), msg.url)
			.setDescription(msg.client.ch.stp(lan.log.description, {target: target, user: executor}))
			.addField(language.reason, `${reason}`)
			.setColor(con.color)
			.setTimestamp();
		if (msg.logchannels && msg.logchannels.length) msg.client.ch.send(msg.logchannels, WarnLogEmbed);
		let warnnr;
		const res = await msg.client.ch.query('SELECT * FROM warns WHERE guildid = $1 AND userid = $2;', [msg.guild.id, target.id]);
		if (res && res.rowCount > 0) warnnr = res.rowCount + 1;
		else warnnr = 1;
		msg.client.ch.query('INSERT INTO warns (guildid, userid, reason, type, dateofwarn, warnedinchannelid, warnedbyuserid, warnedinchannelname, warnedbyusername, msgid) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);', [msg.guild.id, target.id, reason, 'Warn', Date.now(), msg.channel.id, executor.id, msg.channel.name, executor.username, msg.id]);
		if (mexisted) em.fields.pop(), em.addField('\u200b', msg.client.constants.emotes.tick + ' ' + msg.client.ch.stp(lan.success, { target: target, nr: warnnr }));
		else em.setDescription(msg.client.constants.emotes.tick + ' ' + msg.client.ch.stp(lan.success, { target: target, nr: warnnr }));
		await msg.m?.edit({ embeds: [em] });
		if (msg.source) msg.client.emit('modSourceHandler', msg);
		return true;
	}
};