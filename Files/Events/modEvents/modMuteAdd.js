const Discord = require('discord.js');

module.exports = {
	async execute(executor, target, reason, msg) {
		msg.m ? msg.m = await msg.m.fetch() : null;
		let mexisted = msg.m ? true : false;
		const language = await msg.client.ch.languageSelector(msg.guild);
		const lan = language.mod.muteAdd;
		const con = msg.client.constants.mod.muteAdd;
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
		if (mexisted) await msg.m?.edit({ embeds: [em] }).catch(() => {});
		else msg.m = await msg.client.ch.reply(msg, em);
		let role;
		const resM = await msg.client.ch.query('SELECT * FROM guildsettings WHERE guildid = $1;', [msg.guild.id]);
		if (resM && resM.rowCount > 0) role = msg.guild.roles.cache.get(resM.rows[0].muteroleid);
		const member = await msg.guild.members.fetch(target.id).catch(() => { });
		const exec = await msg.guild.members.fetch(executor.id).catch(() => { });
		const memberClient = msg.guild.me;
		if (!member) {
			if (mexisted) {
				em.fields.pop();
				em.addField('\u200b', msg.client.constants.emotes.cross + ' ' + lan.noMember);
				msg.m?.edit({ embeds: [em] });
			}
			else {
				em.setDescription(msg.client.constants.emotes.cross + ' ' + lan.noMemberHint);
				const Yes = new Discord.MessageButton()
					.setCustomId('yes')
					.setLabel(msg.language.Yes)
					.setStyle('SUCCESS');
				const No = new Discord.MessageButton()
					.setCustomId('no')
					.setLabel(msg.language.No)
					.setStyle('DANGER');
				msg.m?.edit({ embeds: [em], components: msg.client.ch.buttonRower([[Yes, No]]) });
			}
			if (mexisted) setTimeout(() => msg.m?.delete().catch(() => { }), 10000);
			else {
				const [aborted, answer] = await ask(executor, msg);
				if (aborted) {
					em.setDescription(msg.client.constants.emotes.cross + ' ' + lan.noMember);
					answer ? answer.update({ embeds: [em], components: [] }) : msg.m?.edit({ embeds: [em], components: [] });
					return false;
				} else return assingWarn(executor, target, reason, msg, answer, em, language, con, lan);
			}
		}
		if (exec?.roles.highest.rawPosition < member?.roles.highest.rawPosition || exec?.roles.highest.rawPosition == member?.roles.highest.rawPosition) {
			if (mexisted) em.fields.pop(), em.addField('\u200b', msg.client.constants.emotes.cross + ' ' + lan.exeNoPerms);
			else em.setDescription(msg.client.constants.emotes.cross + ' ' + lan.exeNoPerms);
			msg.m?.edit({ embeds: [em] }).catch(() => { });
			if (mexisted) setTimeout(() => msg.m?.delete().catch(() => { }), 10000);
			return false;
		}
		if ((memberClient.roles.highest.rawPosition < member?.roles.highest.rawPosition || memberClient.roles.highest.rawPosition == member?.roles.highest.rawPosition) || !memberClient.permissions.has(268435456n)) {
			if (mexisted) em.fields.pop(), em.addField('\u200b', msg.client.constants.emotes.cross + ' ' + lan.meNoPerms);
			else em.setDescription(msg.client.constants.emotes.cross + ' ' + lan.meNoPerms);
			msg.m?.edit({ embeds: [em] }).catch(() => { });
			if (mexisted) setTimeout(() => msg.m?.delete().catch(() => { }), 10000);
			return false;
		}
		if (role) {
			if (member?.roles.cache.has(role.id)) {
				if (mexisted) em.fields.pop(), em.addField('\u200b', msg.client.constants.emotes.cross + ' ' + lan.hasRole);
				else em.setDescription(msg.client.constants.emotes.cross + ' ' + lan.hasRole);
				msg.m?.edit({ embeds: [em] }).catch(() => { });
				if (mexisted) setTimeout(() => msg.m?.delete().catch(() => { }), 10000);
				return false;
			}
			let err;
			const Mute = await msg.guild.members.cache.get(target.id)?.roles.add(role).catch(() => {});
			if (Mute) {
				if (member && member.voice.channelId !== null && !member.voice.serverMute) member.voice.setMute(true, lan.vcReason).catch(() => { });
				const dmChannel = await target.createDM().catch(() => {});
				const DMembed = new Discord.MessageEmbed()
					.setDescription(`${language.reason}: \n${reason}`)
					.setColor(con.color)
					.setTimestamp()
					.setAuthor(msg.client.ch.stp(lan.dm.author, { guild: msg.guild }), lan.author.image, msg.client.ch.stp(con.author.link, { guild: msg.guild }));
				msg.client.ch.send(dmChannel, DMembed);
				const embed = new Discord.MessageEmbed()
					.setColor(con.color)
					.setAuthor(msg.client.ch.stp(lan.author, { user: target }), msg.client.ch.displayAvatarURL(target), msg.client.constants.standard.invite)
					.setDescription(msg.client.ch.stp(lan.description, {user: executor, target: target}))
					.setTimestamp()
					.addField(language.reason, `${reason}`)
					.setFooter(msg.client.ch.stp(lan.footer, {user: executor, target: target}));
				if (msg.logchannels && msg.logchannels.length) msg.client.ch.send(msg.logchannels, embed);
			} else {
				if (mexisted) em.fields.pop(), em.addField('\u200b', msg.client.constants.emotes.cross + lan.error + ` ${msg.client.ch.makeCodeBlock(err)}`);
				else em.setDescription(msg.client.constants.emotes.cross + lan.error + ` ${msg.client.ch.makeCodeBlock(err)}`);
				msg.m?.edit({ embeds: [em] }).catch(() => { });
				if (mexisted) setTimeout(() => msg.m?.delete().catch(() => { }), 10000);
				return false;
			}
		} else {
			if (mexisted) em.fields.pop(), em.addField('\u200b', msg.client.constants.emotes.cross + ' ' + lan.noRole);
			else em.setDescription(msg.client.constants.emotes.cross + ' ' + lan.noRole);
			msg.m?.edit({ embeds: [em] }).catch(() => { });
			if (mexisted) setTimeout(() => msg.m?.delete().catch(() => { }), 10000);
			return false;
		}
		let warnnr;
		const res = await msg.client.ch.query('SELECT * FROM warns WHERE guildid = $1 AND userid = $2;', [msg.guild.id, target.id]);
		if (res && res.rowCount > 0) warnnr = res.rowCount + 1;
		else warnnr = 1;
		if (!msg.source || msg.source !== 'guildMemberAdd') msg.client.ch.query('INSERT INTO warns (guildid, userid, reason, type, dateofwarn, warnedinchannelid, warnedbyuserid, warnedinchannelname, warnedbyusername, msgid) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);', [msg.guild.id, target.id, reason, 'Mute', Date.now(), msg.channel.id, executor.id, msg.channel.name, executor.username, msg.id]);
		if (mexisted) em.fields.pop(), em.addField('\u200b', msg.client.constants.emotes.tick + ' ' + msg.client.ch.stp(lan.success, { target: target, nr: warnnr }));
		else em.setDescription(msg.client.constants.emotes.tick + ' ' + msg.client.ch.stp(lan.success, { target: target, nr: warnnr }));
		await msg.m?.edit({ embeds: [em] }).catch(() => { });
		if (msg.source) msg.client.emit('modSourceHandler', msg);
		return true;
	}
};

async function ask(executor, msg) {
	if (!msg.m) return [true];
	else {
		const buttonsCollector = msg.m.createMessageComponentCollector({ time: 60000 });
		const resolved = new Promise((resolve) => {
			buttonsCollector.on('collect', async (button) => {
				if (button.user.id !== executor.id) return msg.client.ch.notYours(button, msg.m);
				if (button.customId == 'yes') {
					buttonsCollector.stop();
					resolve([false, button]);
				} else if (button.customId == 'no') {
					buttonsCollector.stop();
					resolve([true, button]);
				}
			});
			buttonsCollector.on('end', (col, reason) => {
				if (reason == 'time') {
					msg.client.ch.collectorEnd(msg);
					resolve([true]);
				}
			});
		});
		return resolved;
	}
}

async function assingWarn(executor, target, reason, msg, answer, em, language, con, lan) {
	const dmChannel = await target.createDM().catch(() => { });
	if (!msg.source || msg.source !== 'guildMemberAdd') msg.client.ch.query('INSERT INTO warns (guildid, userid, reason, type, dateofwarn, warnedinchannelid, warnedbyuserid, warnedinchannelname, warnedbyusername, msgid) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);', [msg.guild.id, target.id, reason, 'Mute', Date.now(), msg.channel.id, executor.id, msg.channel.name, executor.username, msg.id]);
	const DMembed = new Discord.MessageEmbed()
		.setDescription(`${language.reason}: \n${reason}`)
		.setColor(con.color)
		.setTimestamp()
		.setAuthor(msg.client.ch.stp(lan.dm.author, { guild: msg.guild }), lan.author.image, msg.client.ch.stp(con.author.link, { guild: msg.guild }));
	msg.client.ch.send(dmChannel, DMembed);
	const embed = new Discord.MessageEmbed()
		.setColor(con.color)
		.setAuthor(msg.client.ch.stp(lan.author, { user: target }), msg.client.ch.displayAvatarURL(target), msg.client.constants.standard.invite)
		.setDescription(msg.client.ch.stp(lan.description, { user: executor, target: target }))
		.setTimestamp()
		.addField(language.reason, `${reason}`)
		.setFooter(msg.client.ch.stp(lan.footer, { user: executor, target: target }));
	if (msg.logchannels.length) msg.client.ch.send(msg.logchannels, embed);	
	msg.client.ch.query('INSERT INTO warns (guildid, userid, reason, type, dateofwarn, warnedinchannelid, warnedbyuserid, warnedinchannelname, warnedbyusername, msgid) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);', [msg.guild.id, target.id, reason, 'Mute', Date.now(), msg.channel.id, executor.id, msg.channel.name, executor.username, msg.id]);
	em.setDescription(msg.client.constants.emotes.tick + ' ' + msg.client.ch.stp(lan.success, { target: target }));
	await answer.update({ embeds: [em], components: [] }).catch(() => { });
	return true;
}