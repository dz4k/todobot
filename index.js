
(async () => {

	const Discord = require('discord.js')
	const pg = require('pg')
	const _hyperscript = require('./_hyperscript/dist/_hyperscript_w9y.js')
	require('dotenv').config()

	_hyperscript(`log 'Hyperscript works!!!!' then throw 'done'`)

	// DB

	const db = new pg.Client
	await db.connect()

	var todos = {
		async all(guildId) {
			const qry = await db.query(
				'select id, content from todo where guildId = $1 order by id', 
				[guildId]
			)
			return qry.rows.map(({ content, id }) => ({ content, id }))
		},

		async add(guildId, todo) {
			await db.query(
				'insert into todo(guildId, content, id) select $1, $2, 1 + coalesce((select max(id) from todo where guildId = $1), 0)',
				[guildId, todo]
			)
		},

		async remove(guildId, id) {
			console.log("DBG ", guildId, id)
			await db.query(
				'delete from todo where guildId = $1 and id = $2',
				[guildId, id]
			)
		},
	}


	// DISCORD

	function tmpl(cb) {
		const rv = []
		const e = (str, ...parts) => {
			str.forEach((str, i) => {
				rv.push(str)
				if (i in parts) rv.push(parts[i])
			})
			if (!e.noNewline) rv.push('\n')
		}
		
		cb(e)
		return rv.join("")
	}

	const discord = new Discord.Client()

	discord.on('ready', () => {
		console.log(`LOGIN ${discord.user.tag}!`)
	})

	discord.on('message', async (message) => {
		if (message.content === '!todolist') {
			const ourTodos = await todos.all(message.channel.guild.id)
			await message.reply(tmpl(e => {
				e`TODOS:`
				for (const { id, content } of ourTodos) {
					e`${id}:\t${content}`
				}
			}))
		} else if (message.content.startsWith('!done ')) {
			const id = parseInt(message.content.substring('!done '.length))
			await todos.remove(message.channel.guild.id, id);
			await message.reply(`Removed ${id}.`)
		} else if (message.content.startsWith('TODO:')) {
			const todo = message.content.substring(5).trim()
			await todos.add(message.channel.guild.id, todo)
			await message.reply(`Added todo: ${todo}`)
		}
	})

	discord.login(process.env.TOKEN).catch(err => {
		console.error(err)
		db.end()
	})
})()
