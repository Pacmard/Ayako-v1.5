module.exports = {
	async execute(member, user) {
		const client = user.client;
		const guild = member.guild;
		const ch = client.ch;
		let wasMuted = null;
		let timeLeft = undefined;
		const res = await ch.query('SELECT * FROM warns WHERE closed = $1 AND type = $2 AND guildid = $3 AND userid = $4 AND closed = $5;', [false, 'Mute', guild.id, user.id, null]);
		let Muterole;
		if (res && res.rowCount > 0) {
			const resM = await ch.query('SELECT * FROM guildsettings WHERE guildid = $1;', [guild.id]);
			if (resM && resM > 0) Muterole = guild.roles.cache.find(r => r.id == resM.rows[0].muteroleid);
			if (!Muterole) Muterole = guild.roles.cache.find(r => r.name.toLowerCase() == 'muted');
			if (Muterole) {
				if (!member.roles.cache.has(Muterole.id)) { 
					const mres = await member.roles.add(Muterole).catch(() => {});
					if (mres) {
						wasMuted = true;
						timeLeft = null;
					}
				} else wasMuted = false;
			}
		}
		const res2 = await ch.query('SELECT * FROM warns WHERE closed = $1 AND type = $2 AND guildid = $3 AND userid = $4 AND closed = $5;', [false, 'Mute', guild.id, user.id, false]);
		if (res2 && res2.rowCount > 0) {
			const resM = await ch.query('SELECT * FROM guildsettings WHERE guildid = $1;', [guild.id]);
			if (resM && resM > 0) Muterole = guild.roles.cache.find(r => r.id == resM.rows[0].muteroleid);
			else Muterole = guild.roles.cache.find(r => r.name.toLowerCase() == 'muted');
			if (!Muterole) Muterole = guild.roles.cache.find(r => r.name.toLowerCase() == 'muted');
			if (Muterole) {
				if (!member.roles.cache.has(Muterole.id)) { 
					const mres = await member.roles.add(Muterole).catch(() => {});
					if (mres) {
						wasMuted = true;
						timeLeft = +res2.rows[0].duration - Date.now();
					}
				} else wasMuted = false;
			}
		}
		if (wasMuted !== null) {
			const language = await ch.languageSelector(guild);
			const lan = language.mod.muteAdd;
			const msg = { author: client.user, client: client, language: language, guild: guild, source: 'guildMemberAdd' };
			if (wasMuted == true) {
				if (timeLeft == null) client.emit('modMuteAdd', client.user, user, lan.activeMute, msg);
				else client.emit('modTempmuteAdd', client.user, user, lan.activeMute, msg, timeLeft);
			} else if (wasMuted == false) client.emit('modMuteRemove', client.user, user, lan.activeMuteError, msg);
		}
	}
};