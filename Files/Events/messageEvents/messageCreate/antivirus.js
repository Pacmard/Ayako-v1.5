const urlCheck = require('valid-url');
const SA = require('superagent');
const request = require('request');
const fs = require('fs');
const Discord = require('discord.js');
const blocklists = require('../../../blocklist.json');
const axios = require('axios');
const auth = require('../../../BaseClient/auth.json');
const client = require('../../../BaseClient/DiscordClient');

module.exports = {
	async execute(msg) {
		let check = false;
		if (!msg.content || msg.author.id === msg.client.user.id) return;
		if (msg.channel.type === 'DM') check = true;
		msg.language = await msg.client.ch.languageSelector(check ? null : msg.guild);
		const lan = check ? msg.language.antivirus.dm : msg.language.antivirus.guild;
		if (check) {
			prepare(msg, lan, check);
			return;
		}
		const res = await msg.client.ch.query('SELECT * FROM antivirus WHERE guildid = $1;', [msg.guild.id]);
		if (res && res.rowCount > 0) {
			const r = res.rows[0];
			if (r.active !== true) return;
			prepare(msg, lan, check);
		}
	},
	async manualExecute(msg, enteredLinks) { 
		const check = true;
		const args = enteredLinks.replace(/\n/g, ' ').replace(/https:\/\//g, ' https://').replace(/http:\/\//, ' http://').split(/ +/);
		const links = [];
		args.forEach((arg) => {
			if (urlCheck.isUri(arg) && new URL(arg)?.hostname) links.push(arg);
		});
		const blocklist = [];
		const whitelist = [];
		const blacklist = [];
		const whitelistCDN = [];

		const fullLinks = await makeFullLinks(links);

		msg.language = await msg.client.ch.languageSelector(check ? null : msg.guild);
		const lan = check ? msg.language.antivirus.dm : msg.language.antivirus.guild;

		let includedBadLink = false;

		for (const linkObject of fullLinks) {
			await module.exports.run(msg, linkObject, lan, includedBadLink, check, blacklist, whitelist, whitelistCDN, blocklist);
			continue;
		}
	},
	async run(msg, linkObject, lan, includedBadLink, check, blacklist, whitelist, whitelistCDN, blocklist) {  
		const embed = new Discord.MessageEmbed();

		if (includedBadLink) return;

		const websiteExists = await checkIfWebsiteExists(linkObject);
		if (!websiteExists) {
			doesntExist(msg, lan, embed, linkObject);
			return;
		}

		if (check) embed.setDescription(`${lan.checking} \`${linkObject.href}\``);
		else embed.setDescription('');

		const note = getNote(blacklist, linkObject);
		if (note) {
			if (!check) includedBadLink = true;
			blacklisted(msg, lan, embed, linkObject, note, check);
			return;
		}

		const isFile = linkObject.contentType?.includes('video')
			|| linkObject.contentType?.includes('image')
			|| linkObject.contentType?.includes('audio')
			? true
			: false;

		if (
			whitelist.includes(linkObject.baseURLhostname)
			&& (
				linkObject.hostname.endsWith(linkObject.baseURLhostname)
				|| whitelist.includes(linkObject.hostname)
			)
			&& !isFile
		) {
			if (check) whitelisted(msg, lan, embed);
			return;
		}

		if (isFile && whitelistCDN.includes(linkObject.baseURLhostname)) {
			if (check) whitelisted(msg, lan, embed);
			return;
		}

		if (blocklist.includes(linkObject.baseURLhostname)) {
			if (!check) includedBadLink = true;
			blacklisted(msg, lan, embed, linkObject, note, check);
			return;
		}

		if (blacklist.includes(linkObject.baseURLhostname)) {
			if (!check) includedBadLink = true;
			blacklisted(msg, lan, embed, linkObject, note, check);
			return;
		}

		const spamHausIncluded = await getSpamHaus(linkObject);
		if (spamHausIncluded) {
			if (!check) includedBadLink = true;
			blacklisted(msg, lan, embed, linkObject, note, check);
			return;
		}

		const urlIsNew = await getURLage(linkObject);
		if (typeof urlIsNew == 'number' && urlIsNew < 7) {
			if (!check) includedBadLink = true;
			newUrl(msg, lan, embed, linkObject, check);
			return;
		}

		const postVTurlsRes = await postVTUrls(linkObject);
		const VTurls = postVTurlsRes?.stats, urlsAttributes = postVTurlsRes;
		const urlSeverity = getSeverity(VTurls);
		if (typeof urlSeverity !== 'number' && embed.fields.length == 0) {
			embed
				.addField(msg.language.result, msg.client.ch.stp(lan.VTfail, { cross: msg.client.constants.emotes.cross }))
				.setDescription(embed.description.replace(msg.client.ch.stp(lan.check, { loading: msg.client.constants.emotes.loading })))
				.setColor('#ffff00');
			msg.client.ch.reply(msg, embed);
			return;
		}

		if (urlSeverity > 2) {
			severeLink(msg, lan, embed, linkObject, urlSeverity, check);
			if (!check) includedBadLink = true;
			return;
		}

		const attributes = urlsAttributes;
		if (attributes && `${+attributes.creation_date}000` > Date.now() - 604800000) {
			if (!check) includedBadLink = true;
			newUrl(msg, lan, embed, linkObject, check);
			return;
		}

		if (attributes && !whitelist.includes(linkObject.baseURLhostname)) {
			fs.appendFile('S:/Bots/ws/CDN/whitelisted.txt', `\n${linkObject.baseURLhostname}`, () => { });
			msg.client.ch.send(msg.client.channels.cache.get(msg.client.constants.standard.trashLogChannel), { content: msg.client.ch.makeCodeBlock(linkObject.baseURLhostname) });
			if (check) whitelisted(msg, lan, embed);
		}

		if (attributes && !whitelist.includes(linkObject.hostname)) {
			fs.appendFile('S:/Bots/ws/CDN/whitelisted.txt', `\n${linkObject.hostname}`, () => { });
			msg.client.ch.send(msg.client.channels.cache.get(msg.client.constants.standard.trashLogChannel), { content: msg.client.ch.makeCodeBlock(linkObject.hostname) });
			if (check) whitelisted(msg, lan, embed);
		}
		return;
	}
};


const prepare = async (msg, lan, check) => {
	const { content } = msg;
	const args = content.replace(/\n/g, ' ').replace(/https:\/\//g, ' https://').replace(/http:\/\//, ' http://').split(/ +/);
	const links = [];
	args.forEach((arg) => {
		if (urlCheck.isUri(arg) && new URL(arg)?.hostname) links.push(arg);
	});
	const blocklist = getBlocklist();
	const whitelist = await getWhitelist();
	const blacklist = await getBlacklist();
	const whitelistCDN = await getWhitelistCDN();

	const fullLinks = await makeFullLinks(links);

	let includedBadLink = false;

	for (const linkObject of fullLinks) {
		await module.exports.run(msg, linkObject, lan, includedBadLink, check, blacklist, whitelist, whitelistCDN, blocklist);
		continue;
	}
};
const doesntExist = async (msg, lan, embed, linkObject) => {
	if (embed.fields.length == 0) {
		embed
			.addField(msg.language.result, msg.client.ch.stp(lan.notexistent, { url: linkObject.baseURLhostname }))
			.setDescription(msg.client.ch.stp(lan.done, { tick: msg.client.constants.emotes.tick }))
			.setColor('#00ff00');
		msg.client.ch.reply(msg, { embeds: [embed] }).catch(() => { });
	}
	msg.client.ch.send(msg.client.channels.cache.get(msg.client.constants.standard.trashLogChannel), { content: msg.url });
};

const blacklisted = async (msg, lan, embed, linkObject, note, check) => {
	if (note && note !== false) {
		if (embed.fields.length == 0) {
			embed
				.addField(msg.language.result, msg.client.ch.stp(lan.blacklisted, { cross: msg.client.constants.emotes.cross }))
				.addField(msg.language.attention, note.split(/\|+/)[1])
				.setDescription(embed.description.replace(msg.client.ch.stp(lan.check, { loading: msg.client.constants.emotes.loading }), msg.client.ch.stp(lan.done, { tick: msg.client.constants.emotes.tick })))
				.setColor('#ff0000');
			msg.m = await msg.client.ch.reply(msg, { embeds: [embed] }).catch(() => { });
		}
	} else {
		if (embed.fields.length == 0) {
			embed
				.addField(msg.language.result, msg.client.ch.stp(lan.blacklisted, { cross: msg.client.constants.emotes.cross }))
				.setDescription(embed.description.replace(msg.client.ch.stp(lan.check, { loading: msg.client.constants.emotes.loading }), msg.client.ch.stp(lan.done, { tick: msg.client.constants.emotes.tick })))
				.setColor('#ff0000');
			msg.m = await msg.client.ch.reply(msg, { embeds: [embed] }).catch(() => { });
		}
		msg.client.ch.send(msg.client.channels.cache.get(msg.client.constants.standard.trashLogChannel), { content: msg.url });
		if (!check) client.emit('antivirusHandler', msg, linkObject.baseURL, 'blacklist');
	}
};

const severeLink = async (msg, lan, embed, linkObject, urlSeverity, check) => {
	const severity = urlSeverity ? urlSeverity : null;
	if (embed.fields.length == 0) {
		embed
			.addField(msg.language.result, msg.client.ch.stp(lan.VTmalicious, { cross: msg.client.constants.emotes.cross, severity: severity }))
			.setDescription(embed.description.replace(msg.client.ch.stp(lan.check, { loading: msg.client.constants.emotes.loading }), msg.client.ch.stp(lan.done, { tick: msg.client.constants.emotes.tick })))
			.setColor('#ff0000');
		msg.m = await msg.client.ch.reply(msg, { embeds: [embed] }).catch(() => { });
	}
	msg.client.ch.send(msg.client.channels.cache.get(msg.client.constants.standard.trashLogChannel), { content: msg.url });
	if (!check) client.emit('antivirusHandler', msg, linkObject.baseURL, 'virustotal');
};

const newUrl = async (msg, lan, embed, linkObject, check) => {
	if (embed.fields.length == 0) {
		embed
			.addField(msg.language.result, msg.client.ch.stp(lan.newLink, { cross: msg.client.constants.emotes.cross }))
			.setDescription(embed.description.replace(msg.client.ch.stp(lan.check, { loading: msg.client.constants.emotes.loading }), msg.client.ch.stp(lan.done, { tick: msg.client.constants.emotes.tick })))
			.setColor('#ff0000');
		msg.m = await msg.client.ch.reply(msg, { embeds: [embed] }).catch(() => { });
	}
	msg.client.ch.send(msg.client.channels.cache.get(msg.client.constants.standard.trashLogChannel), { content: msg.url });
	if (!check) client.emit('antivirusHandler', msg, linkObject.baseURL, 'newurl');
	return true;
};

const whitelisted = async (msg, lan, embed) => {
	if (embed.fields.length == 0) {
		embed
			.addField(msg.language.result, msg.client.ch.stp(lan.whitelisted, { tick: msg.client.constants.emotes.tick }))
			.setDescription(embed.description.replace(msg.client.ch.stp(lan.check, { loading: msg.client.constants.emotes.loading }), msg.client.ch.stp(lan.done, { tick: msg.client.constants.emotes.tick })))
			.setColor('#00ff00');
		msg.client.ch.reply(msg, { embeds: [embed] }).catch(() => { });
	}
	msg.client.ch.send(msg.client.channels.cache.get(msg.client.constants.standard.trashLogChannel), { content: msg.url });
	return true;
};

const getBlocklist = () => {
	const blacklist = [...new Set(blocklists)];
	blacklist.forEach((entry, index) => {
		entry = entry.replace(/#{2}-{1}/g, '');
		if (entry.startsWith('#')) blacklist.splice(index, 1);
	});
	return blacklist;
};

const getWhitelist = async () => {
	const res = await SA.get('https://ayakobot.com/cdn/whitelisted.txt').catch(() => { });
	const whitelistRes = res ? res.text.split(/\n+/) : [];
	whitelistRes.map((entry, i) => {
		whitelistRes[i] = entry.replace(/\r/g, '');
	});
	return whitelistRes;
};

const getBlacklist = async () => {
	const res = await SA.get('https://ayakobot.com/cdn/blacklisted.txt').catch(() => { });
	const blacklistRes = res ? res.text.split(/\n+/) : [];
	blacklistRes.map((entry, i) => {
		blacklistRes[i] = entry.replace(/\r/g, '');
	});
	return blacklistRes;
};

const getWhitelistCDN = async () => {
	const res = await SA.get('https://ayakobot.com/cdn/whitelistedCDN.txt').catch(() => { });
	const whitelistCDNRes = res ? res.text.split(/\n+/) : [];
	whitelistCDNRes.map((entry, i) => {
		whitelistCDNRes[i] = entry.replace(/\r/g, '');
	});
	return whitelistCDNRes;
};

const makeFullLinks = async (links) => {
	const fullLinks = [];
	for (let i = 0; i < links.length; i++) {
		const url = new URL(links[i]);
		const [href, contentType] = await new Promise((resolve) => {
			request(
				{ method: 'HEAD', url, followAllRedirects: true },
				(_, response) => {
					resolve([response?.request?.href, response?.headers ? response?.headers['content-type'] : null]);
				},
			);
		});
		const object = { contentType: contentType, href: href, url: `${href ? href : url.href ? url.href : `${url.protocol}//${url.hostname}`}`, hostname: url.hostname};
		fullLinks.push(object);
	}

	fullLinks.forEach((linkObject) => {
		const urlParts = new URL(linkObject.url).hostname.split('.');
		const slicedURL = urlParts
			.slice(0)
			.slice(-(urlParts.length == 4 ? 3 : 2))
			.join('.');
		const newUrl = `${new URL(linkObject.url).protocol}//${slicedURL}`;
		linkObject.baseURL = newUrl;
		linkObject.baseURLhostname = new URL(newUrl).hostname;
	});

	return fullLinks;
};


const checkIfWebsiteExists = async (linkObject) => {

	const hostname = new URL(linkObject.url).protocol + '//' + linkObject.hostname;

	const [hrefRes, urlRes, baseUrlRes, hostnameRes] = await Promise.all([
		axios.get(linkObject.href).catch(() => { }),
		axios.get(linkObject.url).catch(() => { }),
		axios.get(linkObject.baseURL).catch(() => { }),
		axios.get(hostname).catch(() => { })
	]);

	const exists = !hrefRes
		|| hrefRes.code == 'ENOTFOUND'
		? !urlRes
			|| urlRes.code == 'ENOTFOUND'
			? !baseUrlRes
				|| baseUrlRes.code == 'ENOTFOUND'
				? !hostnameRes
					|| hostnameRes.code == 'ENOTFOUND'
					? false
					: true
				: true
			: true
		: true;
	return exists;
};

const getNote = (blacklist, url) => {
	const include = blacklist.map((entry) => {
		if (entry.includes('|') && entry.split(new RegExp(' | ', 'g'))[0] == url.baseUrl) entry;
	});
	
	return include.find((entry) => entry !== undefined);
};

const getSpamHaus = async (linkObject) => {
	const res = await SA
		.get(`https://apibl.spamhaus.net/lookup/v1/dbl/${linkObject.baseURLhostname}`)
		.set('Authorization', `Bearer ${auth.spamhausToken}`)
		.set('Content-Type', 'application/json').catch(() => { });

	return res && res.status == 200 ? true : false;
};

const getURLage = async (linkObject) => {
	let ageInDays = await ip2whois(linkObject);
	if (ageInDays && +ageInDays < 7) return ageInDays;
	else if (!ageInDays) ageInDays = await promptapi(linkObject);
	if (ageInDays && +ageInDays > 7) return ageInDays;
	else return false;
};

const ip2whois = async (linkObject) => {
	const res = await SA.get(`https://api.ip2whois.com/v2?key=${auth.ip2whoisToken}&domain=${linkObject.baseURLhostname}&format=json`).catch(() => { });

	if (res 
		&& res.text 
		&& JSON.parse(res.text).domain_age
	) {
		return JSON.parse(res.text).domain_age;
	} else {
		return undefined;
	}
};

const promptapi = async (linkObject) => {
	const promptapiRes = await SA.get(`https://api.promptapi.com/whois/query?domain=${linkObject.baseURLhostname}`)
		.set('apikey', auth.promptAPIToken)
		.catch(() => { });

	if (promptapiRes 
		&& promptapiRes.text
		&& JSON.parse(promptapiRes.text).result
		&& JSON.parse(promptapiRes.text).result.creation_date
	) {
		return Math.ceil(
			Math.abs(
				new Date(
					JSON.parse(
						promptapiRes.text
					).result.creation_date
				)
					.getTime() - new Date().getTime()
			) / (1000 * 3600 * 24)
		);
	} else {
		return undefined;
	}
};

const postVTUrls = async (linkObject) => {
	const res = await new Promise((resolve,) => {
		SA
			.post('https://www.virustotal.com/api/v3/urls')
			.set('x-apikey', auth.VTtoken)
			.field('url', linkObject.href)
			.then((r) => { resolve(r.body); })
			.catch((e) => { resolve(e.body); });
	});
	if (res.data?.id) return await getNewVTUrls(res.data.id, 0);
	else return null;
};

const getNewVTUrls = async (id, i) => {
	if (i > 5) throw new Error('Too many requests');
	// eslint-disable-next-line no-async-promise-executor
	const res = await new Promise(async (resolve,) => {
		await SA
			.get(`https://www.virustotal.com/api/v3/analyses/${id}`)
			.set('x-apikey', auth.VTtoken)
			.then((r) => { resolve(r.body); })
			.catch((e) => { resolve(e.body); });
	});
	if (res.data.attributes.status == 'completed') return res.data.attributes;
	else if (res.data.attributes.status == 'queued' || res.data.attributes.status == 'in-progress') {
		return await getNewVTUrlsTimeouted(id, 1);
	}
};

const getNewVTUrlsTimeouted = async (id, i) => {
	i++;
	let timeout = 5000 * i;
	if (i > 5) throw new Error('Too many requests');
	const timeoutRes = await new Promise((timeoutResolve,) => {
		setTimeout(async () => {
			const res = await new Promise((resolve,) => {
				SA
					.get(`https://www.virustotal.com/api/v3/analyses/${id}`)
					.set('x-apikey', auth.VTtoken)
					.then((r) => { resolve(r.body); })
					.catch((e) => { resolve(e.body); });
			});
			if (res.data.attributes.status == 'completed') timeoutResolve(res.data.attributes);
			else if (res.data.attributes.status == 'queued' || res.data.attributes.status == 'in-progress') {
				timeoutResolve(null);
				timeoutResolve(await getNewVTUrlsTimeouted(id, i));
			}
		}, timeout * i);
	});
	if (timeoutRes) return timeoutRes;
};

const getSeverity = (VTresponse) => {
	if (
		!VTresponse 
		|| VTresponse == 'QuotaExceededError' 
	|| typeof VTresponse.suspicious !== 'number'
	) return undefined;

	let severity = 0;

	if (VTresponse.suspicious) {
		severity = VTresponse.suspicious % 10;
	}

	if (VTresponse.malicious) {
		if (VTresponse.malicious > 1 && VTresponse.malicious < 5) {
			severity += 6;
		} else if (VTresponse.malicious > 50) {
			severity = 100;
		}

		severity += VTresponse.malicious * 2;
	}
	return severity;
};