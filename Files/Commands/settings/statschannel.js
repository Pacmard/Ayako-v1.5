const Discord = require('discord.js');

module.exports = {
	perm: 32n,
	type: 1,
	displayEmbed(msg, r) {
		const embed = new Discord.MessageEmbed()
			.addFields(
				{
					name: msg.lanSettings.active,
					value: r.active ? msg.client.constants.emotes.tick + ' ' + msg.language.enabled : msg.client.constants.emotes.cross + ' ' + msg.language.disabled,
					inline: false
				},
				{
					name: msg.lan.channel,
					value: `${r.channel && r.channel.length ? ` <#${r.channel}>` : msg.language.none}`,
					inline: false
				},
				{
					name: msg.lan.stat,
					value: r.giveofficialwarnstof ? msg.client.constants.emotes.tick + ' ' + msg.language.enabled : msg.client.constants.emotes.cross + ' ' + msg.language.disabled,
					inline: false
				}
			);
		return embed;
	},
	buttons(msg, r) {
		const active = new Discord.MessageButton()
			.setCustomId(msg.lan.edit.active.name)
			.setLabel(msg.lanSettings.active)
			.setStyle(r.active ? 'SUCCESS' : 'DANGER');
		const rw = new Discord.MessageButton()
			.setCustomId(msg.lan.edit.readofwarnstof.name)
			.setLabel(msg.lan.readofwarnstof.replace(/\*/g, '').slice(0, 14))
			.setStyle(r.readofwarnstof ? 'SUCCESS' : 'DANGER');
		const wm = new Discord.MessageButton()
			.setCustomId(msg.lan.edit.giveofficialwarnstof.name)
			.setLabel(msg.lan.giveofficialwarnstof)
			.setStyle(r.giveofficialwarnstof ? 'SUCCESS' : 'DANGER');
		const mm = new Discord.MessageButton()
			.setCustomId(msg.lan.edit.muteenabledtof.name)
			.setLabel(msg.lan.muteenabledtof)
			.setStyle(r.muteenabledtof ? 'SUCCESS' : 'DANGER');
		const km = new Discord.MessageButton()
			.setCustomId(msg.lan.edit.kickenabledtof.name)
			.setLabel(msg.lan.kickenabledtof)
			.setStyle(r.kickenabledtof ? 'SUCCESS' : 'DANGER');
		const bm = new Discord.MessageButton()
			.setCustomId(msg.lan.edit.banenabledtof.name)
			.setLabel(msg.lan.banenabledtof)
			.setStyle(r.banenabledtof ? 'SUCCESS' : 'DANGER');
		const channel = new Discord.MessageButton()
			.setCustomId(msg.lan.edit.bpchannelid.name)
			.setLabel(msg.lan.bpchannelid)
			.setStyle('PRIMARY');
		const user = new Discord.MessageButton()
			.setCustomId(msg.lan.edit.bpuserid.name)
			.setLabel(msg.lan.bpuserid)
			.setStyle('PRIMARY');
		const role = new Discord.MessageButton()
			.setCustomId(msg.lan.edit.bproleid.name)
			.setLabel(msg.lan.bproleid)
			.setStyle('PRIMARY');
		const maw = new Discord.MessageButton()
			.setCustomId(msg.lan.edit.muteafterwarnsamount.name)
			.setLabel(msg.client.ch.stp(msg.lan.muteafterwarnsamount.replace(/\*/g, ''), { amount: r.muteafterwarnsamount ? r.muteafterwarnsamount : '--' }))
			.setStyle(!r.readofwarnstof ? 'DANGER' : 'SECONDARY');
		const kaw = new Discord.MessageButton()
			.setCustomId(msg.lan.edit.kickafterwarnsamount.name)
			.setLabel(msg.client.ch.stp(msg.lan.kickafterwarnsamount.replace(/\*/g, ''), { amount: r.kickafterwarnsamount ? r.kickafterwarnsamount : '--' }))
			.setStyle(!r.readofwarnstof ? 'DANGER' : 'SECONDARY');
		const baw = new Discord.MessageButton()
			.setCustomId(msg.lan.edit.banafterwarnsamount.name)
			.setLabel(msg.client.ch.stp(msg.lan.banafterwarnsamount.replace(/\*/g, ''), { amount: r.banafterwarnsamount ? r.banafterwarnsamount : '--' }))
			.setStyle(!r.readofwarnstof ? 'DANGER' : 'SECONDARY');
		return [[active], [channel, user, role], [rw, maw, kaw, baw], [wm, mm, km, bm]];
	}
};