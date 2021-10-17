const { Worker } = require('worker_threads');

module.exports = {
	async execute(oldMember, newMember) {
		return;
		const client = newMember ? newMember.client : oldMember.client;
		const ch = client.ch;
		const guild = newMember ? newMember.guild : oldMember.guild;
		const ress = await ch.query('SELECT stillrunning FROM roleseparatorsettings WHERE guildid = $1;', [guild.id]);
		if (ress && ress.rowCount > 0 && ress.rows[0].stillrunning) return; 
		const member = newMember;
		const res = await ch.query('SELECT * FROM roleseparator WHERE active = true AND guildid = $1;', [guild.id]);
		const giveThese = new Array, takeThese = new Array;
		const language = await ch.languageSelector(guild);
		if (res && res.rowCount > 0) {
			res.rows.forEach(async (row) => {
				const guild = client.guilds.cache.get(row.guildid);
				if (guild) {
					const sep = guild.roles.cache.get(row.separator);
					if (sep) {
						if (row.isvarying) {
							const stop = row.stoprole ? guild.roles.cache.get(row.stoprole) : null;
							const affectedRoles = new Array;
							if (stop) {
								if (sep.rawPosition > stop.rawPosition) for (let i = stop.rawPosition+1; i < guild.roles.highest.rawPosition && i < sep.rawPosition; i++) affectedRoles.push(guild.roles.cache.find(r => r.rawPosition == i));
								else for (let i = sep.rawPosition+1; i < guild.roles.highest.rawPosition && i < stop.rawPosition; i++) affectedRoles.push(guild.roles.cache.find(r => r.rawPosition == i));
							} else if (sep.rawPosition < guild.roles.highest.rawPosition) for (let i = sep.rawPosition+1; i < guild.roles.highest.rawPosition && i < guild.roles.highest.rawPosition; i++) affectedRoles.push(guild.roles.cache.find(r => r.rawPosition == i));
							const has = new Array;
							affectedRoles.map(o => o).forEach(role => {
								if (role) {
									if (member.roles.cache.has(role.id)) has.push(true);
									else has.push(false); 
								}
							});
							if (has.includes(true) && !member.roles.cache.has(sep.id)) giveThese.push(sep.id);
							else if (!has.includes(true) && member.roles.cache.has(sep.id)) takeThese.push(sep.id);
						} else {
							const has = new Array;
							row.roles.forEach(role => {
								if (member.roles.cache.cache.has(role)) has.push(true);
								else has.push(false);
							});
							if (has.includes(true) && !member.roles.cache.has(sep.id)) giveThese.push(sep.id);
							else if (!has.includes(true) && member.roles.cache.has(sep.id)) takeThese.push(sep.id);
						}
					} else ch.query('UPDATE roleseparator SET active = false WHERE separator = $1;', [row.separator]);
				}
			});
		}
		const roles = [...member._roles, giveThese];
		takeThese.forEach((r) => roles.splice(roles.indexOf(r), 1));
		if ((giveThese && giveThese.length > 0) || (takeThese && takeThese.length > 0)) await client.eris.editGuildMember(guild.id, member.user.id, { roles: roles }, language.autotypes.separators).catch(() => { }), console.log(1, guild.id, member.user.id);
	},
	async oneTimeRunner(msg, embed, clickButton) {
		const client = msg.client;
		const ch = client.ch;
		const res = await ch.query('SELECT * FROM roleseparator WHERE active = true AND guildid = $1;', [msg.guild.id]);
		let membersWithRoles;
		if ((await msg.client.ch.query('SELECT stillrunning FROM roleseparatorsettings WHERE guildid = $1;', [msg.guild.id]))?.rows[0]?.stillrunning && msg.author.id !== client.user.id) membersWithRoles = true;
		else {
			msg.client.ch.query('UPDATE roleseparatorsettings SET stillrunning = $2 WHERE guildid = $1;', [msg.guild.id, true]);
			await msg.guild.members.fetch();
			membersWithRoles = await this.getNewMembers(msg.guild, res);
		}
		if (clickButton) await clickButton.deleteReply().catch(() => {});
		if (membersWithRoles == 'timeout') {
			embed
				.setAuthor(
					msg.client.ch.stp(msg.lanSettings.author, {type: msg.lan.type}), 
					msg.client.constants.emotes.settingsLink, 
					msg.client.constants.standard.invite
				)
				.setDescription(msg.lan.edit.oneTimeRunner.timeout);
			msg.m.edit({embeds: [embed], components: []}).catch(() => {});
			msg.client.ch.query('UPDATE roleseparatorsettings SET stillrunning = $2, duration = $3, startat = $4 WHERE guildid = $1;', [msg.guild.id, false, null, null]);
			return;
		}
		if (!Array.isArray(membersWithRoles)) {
			if (!membersWithRoles) {
				embed
					.setAuthor(
						msg.client.ch.stp(msg.lanSettings.author, {type: msg.lan.type}), 
						msg.client.constants.emotes.settingsLink, 
						msg.client.constants.standard.invite
					)
					.setDescription(msg.lan.edit.oneTimeRunner.time);
				msg.m.edit({embeds: [embed], components: []}).catch(() => {});
			} else {
				embed
					.setAuthor(
						msg.client.ch.stp(msg.lanSettings.author, {type: msg.lan.type}), 
						msg.client.constants.emotes.settingsLink, 
						msg.client.constants.standard.invite
					)
					.setDescription(msg.lan.edit.oneTimeRunner.stillrunning);
				msg.m.edit({embeds: [embed], components: []}).catch(() => {});
			}
		} else {
			membersWithRoles.forEach((m, index) => {
				const fakeMember = m;
				const realMember = msg.guild.members.cache.get(m.id);
				if (realMember) {
					if (fakeMember.giveTheseRoles) fakeMember.giveTheseRoles.forEach((roleID, rindex) => {
						if (realMember.roles.cache.has(roleID)) membersWithRoles[index].giveTheseRoles.splice(rindex, 1); 
					});
					if (fakeMember.takeTheseRoles) fakeMember.takeTheseRoles.forEach((roleID, rindex) => {
						if (!realMember.roles.cache.has(roleID)) membersWithRoles[index].takeTheseRoles.splice(rindex, 1);
					});
				}
			});
			embed
				.setAuthor(
					msg.client.ch.stp(msg.lanSettings.author, {type: msg.lan.type}), 
					msg.client.constants.emotes.settingsLink, 
					msg.client.constants.standard.invite
				)								
				.setDescription(msg.client.ch.stp(msg.lan.edit.oneTimeRunner.stats, {members: membersWithRoles && membersWithRoles.length > 0 ? membersWithRoles.length : '0', roles: membersWithRoles && membersWithRoles.length > 0 ? (membersWithRoles.length * 3) : '0', finishTime: `<t:${Math.floor(Date.now()/1000) + (membersWithRoles ? membersWithRoles.length*3 : 0)}:F> (<t:${Math.floor(Date.now()/1000) + (membersWithRoles ? membersWithRoles.length*3 : 0)}:R>)`}));
			msg.m.edit({embeds: [embed], components: []}).catch(() => {});
		}
		msg.client.ch.query('UPDATE roleseparatorsettings SET stillrunning = $1, duration = $3, startat = $4, channelid = $5, messageid = $6 WHERE guildid = $2;', [true, msg.guild.id, Math.floor(Date.now()/1000) + (membersWithRoles ? membersWithRoles.length*3 : 0), Date.now(), msg.channel.id, msg.m.id]);
		this.assinger(msg, membersWithRoles, embed);
	},
	async getNewMembers(guild, res) {
		await guild.members.fetch();
		const obj = new Object;
		obj.members = new Array, obj.separators = new Array, obj.rowroles = new Array, obj.roles = new Array, obj.highestRole = new Object({id: guild.roles.highest.id, rawPosition: guild.roles.highest.rawPosition}), obj.clientHighestRole = new Object({id: guild.members.cache.get(guild.client.user.id).roles.highest.id, rawPosition: guild.members.cache.get(guild.client.user.id).roles.highest.rawPosition});
		guild.members.cache.forEach(member => {
			const roles = new Array; 
			member.roles.cache.forEach(role => {
				roles.push({id: role.id, rawPosition: role.rawPosition});
			});
			obj.members.push({id: member.user.id, roles: roles});
		});
		guild.roles.cache.forEach(role => {
			obj.roles.push({id: role.id, rawPosition: role.rawPosition});
		});
		res.rows.forEach(r => {
			if (r.stoprole) obj.separators.push({separator: {id: r.separator, rawPosition: guild.roles.cache.get(r.separator)?.rawPosition}, stoprole: {id: r.stoprole, rawPosition: guild.roles.cache.get(r.stoprole)?.rawPosition}});
			else obj.separators.push({separator: {id: r.separator, rawPosition: guild.roles.cache.get(r.separator)?.rawPosition}});
			if (r.roles && r.roles.length > 0) obj.roles.forEach(roleid => {
				const role = guild.roles.cache.get(roleid);
				obj.rowroles.push({id: role.id, rawPosition: role.rawPosition});
			});
		});
		const worker = new Worker('./Files/Events/guildEvents/guildMemberUpdate/separatorWorker.js', {workerData: {res: res.rows, obj: obj}});
		let output;
		await new Promise((resolve, reject) => {
			worker.once('message', result => {
				output = result;
				resolve();
				worker.terminate();
			});
			worker.once('error', error => {
				reject();
				throw error;
			});
		});
		return output;
	},
	async assinger(msg, membersWithRoles, embed) {
		if (membersWithRoles.length > 0) {
			if (!msg.client.separatorAssigner) msg.client.separatorAssigner = new Object;
			membersWithRoles.forEach((raw, index) => {
				if (!msg.client.separatorAssigner[msg.guild.id]) msg.client.separatorAssigner[msg.guild.id] = new Object;
				msg.client.separatorAssigner[msg.guild.id][index] = setTimeout(async () => {
					const giveRoles = raw.giveTheseRoles;
					const takeRoles = raw.takeTheseRoles;
					let member = await msg.guild.members.fetch(raw.id);
					if (member) {
						const roles = [...member._roles, giveRoles];
						takeRoles.forEach((r) => roles.splice(roles.indexOf(r), 1));
						if ((giveRoles && giveRoles.length > 0) || (takeRoles && takeRoles.length > 0)) await msg.client.eris.editGuildMember(msg.guild.id, member.user.id, { roles: roles }, msg.language.autotypes.separators).catch(() => {});
					}
					if (index == (membersWithRoles.length-1) && msg.lastTime) {
						embed
							.setAuthor(
								msg.client.ch.stp(msg.lanSettings.author, {type: msg.lan.type}), 
								msg.client.constants.emotes.settingsLink, 
								msg.client.constants.standard.invite
							)								
							.setDescription(msg.lan.edit.oneTimeRunner.finished);
						msg.m.edit({embeds: [embed], components: []}).catch(() => {});
						msg.client.ch.query('UPDATE roleseparatorsettings SET stillrunning = $1, duration = $3, startat = $4 WHERE guildid = $2;', [false, msg.guild.id, null, null]);
					} else if (index == (membersWithRoles.length-1)) {
						msg.lastTime = true;
						this.oneTimeRunner(msg, embed);
					} else msg.client.ch.query('UPDATE roleseparatorsettings SET index = $1, length = $3 WHERE guildid = $2;', [index, msg.guild.id, membersWithRoles.length-1]);
				}, index * 2000);
			});
		} else {
			embed
				.setAuthor(
					msg.client.ch.stp(msg.lanSettings.author, {type: msg.lan.type}), 
					msg.client.constants.emotes.settingsLink, 
					msg.client.constants.standard.invite
				)								
				.setDescription(msg.lan.edit.oneTimeRunner.finished);
			msg.m.edit({embeds: [embed], components: []}).catch(() => {});
			msg.client.ch.query('UPDATE roleseparatorsettings SET stillrunning = $1, duration = $3, startat = $4 WHERE guildid = $2;', [false, msg.guild.id, null, null]);
		}
	}
};

