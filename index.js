const Discord = require('discord.js');
const { TOKEN, PREFIX, GOOGLE_API_KEY } = require('./config');
const YouTube = require('simple-youtube-api');
const ytdl = require('ytdl-core');
const superagent = require('superagent');

const client = new Discord.Client();

const youtube = new YouTube(GOOGLE_API_KEY);

const queue = new Map();

client.on('warn', console.warn);

client.on('error', console.error);

client.on('ready', () => console.log('Iniciado.'));

client.on('disconnect', () => console.log('Desconectado'));

client.on('reconnecting', () => console.log('Reconectando...'));

client.on('ready', () =>{
	
    client.user.setActivity('Feito com amor por: yNerdSz'
    {type: 'PLAYING', url: 'https://twitch.tv/olszera'});
    console.log('────────────────────────────');
    console.log('     Construtor    ');
    console.log('────────────────────────────');
});

client.on('message', async msg => { // eslint-disable-line
	if (msg.author.bot) return undefined;
	if (!msg.content.startsWith(PREFIX)) return undefined;

	const args = msg.content.split(' ');
	const searchString = args.slice(1).join(' ');
	const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
	const serverQueue = queue.get(msg.guild.id);

	let command = msg.content.toLowerCase().split(' ')[0];
	command = command.slice(PREFIX.length)

	if(command == "comandos") {
	

		msg.delete().catch(O_O=>{});

		var embed = new Discord.RichEmbed()
		.setAuthor("Construtor", client.user.avatarURL)
		.setColor('#365be2')
		.addField("- !help", "Mostra esta lista de comandos.")
		.addField("- !play", "Utilizado para adicionar uma música na lista")
		.addField("- !pause", "Pausa a música atual")
		.addField("- !resume", "Continua a música atual caso esteja pausada")
		.addField("- !skip", "Pula a música atual para próxima da lista")
		.addField("- !volume", "Altera o volume da música")
        .addField("- !queue ", "Mosta a queue atual")
        .setTimestamp()
		.setFooter('Construtor');


		msg.channel.send({embed});
	}
	
	
	if (command === 'play') {



		const voiceChannel = msg.member.voiceChannel;
		if (!voiceChannel) return msg.channel.send('Você tem que estar em um canal para colocar uma musica');
		const permissions = voiceChannel.permissionsFor(msg.client.user);
		if (!permissions.has('CONNECT')) {
			return msg.channel.send('Não tenho permissões para entrar no canal');
		}
		if (!permissions.has('SPEAK')) {
			return msg.channel.send('Não tenho permissões para entrar nesse canal');
		}

		if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
			const playlist = await youtube.getPlaylist(url);
			const videos = await playlist.getVideos();
			for (const video of Object.values(videos)) {
				const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
				await handleVideo(video2, msg, voiceChannel, true); // eslint-disable-line no-await-in-loop
			}
			return msg.channel.send(`? Playlist: **${playlist.title}** foi adicionado a queue!`);
		} else {
			try {
				var video = await youtube.getVideo(url);
			} catch (error) {
				try {
					var videos = await youtube.searchVideos(searchString, 10);
					let index = 0;
					msg.channel.send(`
__**Seleção de musica:**__
${videos.map(video2 => `**${++index} -** ${video2.title}`).join('\n')}
Escolha uma musica de 1-10.
					`);
					// eslint-disable-next-line max-depth
					try {
						var response = await msg.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 11, {
							maxMatches: 1,
							time: 10000,
							errors: ['time']
						});
					} catch (err) {
						console.error(err);
						return msg.channel.send('Nenhuma mensagem valida enviada');
					}
					const videoIndex = parseInt(response.first().content);
					var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
				} catch (err) {
					console.error(err);
					return msg.channel.send('Não consegui encontrar nenhum video.');
				}
			}
			return handleVideo(video, msg, voiceChannel);
		}
	} else if (command === 'skip') {


		if (!msg.member.voiceChannel) return msg.channel.send('Você não está em nenhum canal');
		if (!serverQueue) return msg.channel.send('Não tem nenhuma musica para dar skip.');
		serverQueue.connection.dispatcher.end('Deram skip');
		return undefined;
	} else if (command === 'stop') {
		


		if (!msg.member.voiceChannel) return msg.channel.send('Você não está em nenhum canal');
		if (!serverQueue) return msg.channel.send('Não tem nenhuma musica para dar stop');
		serverQueue.songs = [];
		serverQueue.connection.dispatcher.end('Deram stop.');
		msg.channel.send("A musica foi parada.")
		return undefined;
	} else if (command === 'volume') {

		if (!msg.member.voiceChannel) return msg.channel.send('Você não está em nenhum canal');
		if (!serverQueue) return msg.channel.send('Selecione um volume de 0 a 100');

		if (!args[1]) return msg.channel.send(`O volume atual é: **${serverQueue.volume}**`);
		serverQueue.volume = args[1];
		if(parseInt(args[1]) > 5) return msg.channel.send("Escolha o volume entre 1 e 5");
		serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);


		return msg.channel.send(`O volume agora é: **${args[1]}**`);
	} else if (command === 'queue') {
		if (!serverQueue) return msg.channel.send('Não tem nada em queue');
		return msg.channel.send(`
__**Queue:**__
${serverQueue.songs.map(song => `**-** ${song.title}`).join('\n')}
**Tocando agora:** ${serverQueue.songs[0].title}
		`);
	} else if (command === 'pause') {
		

		if (serverQueue && serverQueue.playing) {
			serverQueue.playing = false;
			serverQueue.connection.dispatcher.pause();

			return msg.channel.send("Pausei a musica!");
		}
		return msg.channel.send('Não tem nenhuma musica para pausar.');
	} else if (command === 'resume') {
		

		if (serverQueue && !serverQueue.playing) {
			serverQueue.playing = true;
			serverQueue.connection.dispatcher.resume();


			return msg.channel.send("Voltei a tocar!");
		}
		return msg.channel.send('Não tem nenhuma musica para voltar a tocar.');
	}

	return undefined;
});
 
async function handleVideo(video, msg, voiceChannel, playlist = false) {
	const serverQueue = queue.get(msg.guild.id);
	console.log(video);
	const song = {
		id: video.id,
		title: Discord.Util.escapeMarkdown(video.title),
		url: `https://www.youtube.com/watch?v=${video.id}`
	};
	if (!serverQueue) {
		const queueConstruct = {
			textChannel: msg.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 5,
			playing: true
		};
		queue.set(msg.guild.id, queueConstruct);

		queueConstruct.songs.push(song);

		try {
			var connection = await voiceChannel.join();
			queueConstruct.connection = connection;
			play(msg.guild, queueConstruct.songs[0]);
		} catch (error) {
			console.error(`Não consegui entrar no canal: ${error}`);
			queue.delete(msg.guild.id);
			return msg.channel.send(`Não consegui entrar no canal: ${error}`);
		}
	} else {

		serverQueue.songs.push(song);
		if (playlist) return undefined;
		else return msg.channel.send(`A musica **${song.title}** foi adicionada a queue!`);
	}
	return undefined;
}

function play(guild, song) {
	const serverQueue = queue.get(guild.id);

	if (!song) {
		serverQueue.voiceChannel.leave();
		queue.delete(guild.id);
		return;
	}

	const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
		.on('end', reason => {
			if (reason === 'Não está carregando rapido o sufuiciente.') console.log('Acabou a musica.');
			else console.log(reason);
			serverQueue.songs.shift();
			play(guild, serverQueue.songs[0]);
		})
		.on('error', error => console.error(error));
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);


    serverQueue.textChannel.send(`Tocando agora: **${serverQueue.songs[0].title}**`);
}

client.login(`NDY3MDU3Mzg0NTk0OTk3MjU4.DjF0pA.1HIEmX9ZYfqUa7ae_ZU6Ok_JKgY`);
