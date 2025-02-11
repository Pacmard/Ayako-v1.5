//const { statcord } = require('../../BaseClient/Statcord');

module.exports = {
	once: true,
	async execute() {
		const client = require('../../BaseClient/DiscordClient');
		console.log(`|Logged in as Ayako\n|-> Bot: ${client.user.tag}`);
		console.log(`Login at ${new Date(Date.now()).toLocaleString()}`);
		client.guilds.cache.forEach(async guild => client.invites.set(guild.id, await guild.invites.fetch().catch(() => { })));
		// statcord.autopost();
		
		require('./slashcommands.js').execute();
		require('./muteManager.js').execute();
		require('./reminder.js').execute();
		require('./webhooks.js').execute();
		require('./disboard.js').execute();
		require('./giveaway.js').execute();
		require('./separators.js').execute();

		setInterval(() => {
			require('./colorReminder').execute();
			//require('./websiteFetcher').execute();
			if (new Date().getHours() == 0) {
				client.guilds.cache.forEach(g => {require('../guildevents/guildCreate/nitro').execute(g);});
				require('./nitro').execute();
				client.ch.query('DELETE FROM toxicitycheck;');
			}
		}, 3600000);
		require('./antivirusBlocklistCacher.js').execute();
		setInterval(() => require('./TimedManagers/timedManagerSplitter').execute(), 2000);
		setInterval(() => require('./prunelog.js').execute(), 120000);
		setInterval(() => require('./presence.js').execute(), 60000);
		setInterval(() => require('./antivirusBlocklistCacher.js').execute(), 1800000);
		setInterval(() => console.log(new Date().toLocaleString()), 600000);
	}
};