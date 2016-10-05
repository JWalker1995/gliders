#!/bin/env node

'use strict';

var express = require('express');
var Primus = require('primus');
var browserify = require('browserify');
var fs = require('fs');

var Config = require('./config.js');
var Remote = require('./remote.js');
var Game = require('./game.js');
var ClientError = require('./clienterror.js');

var ServerApp = function()
{
    var _this = this;

    var app;
    var primus;
    var script = Config.uncompiled_script;

    var online_names = {};

    var games = [];

    var open_games = [];
    var open_games_subscribers = [];

    var running_games = [];
    var running_games_subscribers = [];

    var write_each = function(subscribers, data, except)
    {
        for (var i = 0; i < subscribers.length; i++)
        {
            if (subscribers[i] !== except)
            {
                subscribers[i].write(data);
            }
        }
    };

    this.make_guest_name = function()
    {
        while (true)
        {
            var name = 'guest_' + Math.random().toString().substr(2, 5);
            if (this.use_name(name)) {return name;}
        }
    };
    this.use_name = function(name)
    {
        if (typeof online_names[name] === 'undefined')
        {
            online_names[name] = true;
            return true;
        }
        else
        {
            return false;
        }
    };
    this.free_name = function(name)
    {
        online_names[name] = undefined;
    };

    this.get_game = function(data)
    {
        if (typeof data.game_id === 'number')
        {
            var game = games[game_id];
            if (typeof game !== 'object')
            {
                throw new ClientError('Game id does not exist');
            }
        }
    };

    this.subscribe_open_games = function(remote)
    {
        open_games_subscribers.push(remote);

        for (var i = 0; i < open_games.length; i++)
        {
            var game = games[open_games[i]];
            remote.write({
                'q': 'open_games_push',
                'game': game.serialize(),
            });
        }
    };
    this.unsubscribe_open_games = function(remote)
    {
        var index = open_games_subscribers.indexOf(remote);
        if (index !== -1)
        {
            open_games_subscribers.splice(index, 1);
        }
    };
    this.create_game = function(data)
    {
        var game = new Game(games.length);
        games[game.get_game_id()] = game;
        open_games.push(game.get_game_id());

        game.deserialize(data);

        write_each(open_games_subscribers, {
            'q': 'open_games_push',
            'game': game.serialize(),
        });

        return game;
    };
    this.join_game = function(game_id, remote)
    {
        var game = games[game_id];
        if (typeof game !== 'object')
        {
            throw new ClientError('Game id does not exist');
        }

        var full = game.join_player(remote);

        write_each(open_games_subscribers, {
            'q': 'join_game_notif',
            'game_id': game_id,
            'player_name': remote.get_name(),
        });

        if (full)
        {
            var index = open_games.indexOf(game_id);
            if (index !== -1)
            {
                open_games.splice(index, 1);
            }

            running_games.push(game);

            start_game(game);
        }
    };
    this.leave_game = function(game_id, remote)
    {
        var game = games[game_id];
        if (typeof game !== 'object')
        {
            throw new ClientError('Game id does not exist');
        }

        var empty = game.remove_player(remote);

        write_each(open_games_subscribers, {
            'q': 'leave_game_notif',
            'game_id': game_id,
            'player_name': remote.get_name(),
        });

        if (empty)
        {
            var index = open_games.indexOf(game_id);
            if (index !== -1)
            {
                open_games.splice(index, 1);
            }

            write_each(open_games_subscribers, {
                'q': 'open_games_pop',
                'game_id': game.get_game_id(),
            });
        }
    };

    var start_game = function(game)
    {
        var data = {
            'q': 'open_games_pop',
            'game_id': game.get_game_id(),
            'player_id': undefined,
        };

        for (var i = 0; i < open_games_subscribers.length; i++)
        {
            var index = game.get_players().indexOf(open_games_subscribers[i]);
            if (index === -1)
            {
                data.player_id = undefined;
            }
            else
            {
                open_games_subscribers[i].leave_other_games(game.get_game_id());
                data.player_id = index;
            }

            open_games_subscribers[i].write(data);
        }
    };

    this.do_turn = function(game_id, actions, remote)
    {
        var game = games[game_id];
        if (typeof game !== 'object')
        {
            throw new ClientError('Game id does not exist');
        }

        for (var i = 0; i < actions.length; i++)
        {
            var action = actions[i];
            var piece = game.get_board()[action.loc];
            if (!game.do_action(piece, action))
            {
                throw new ClientError('Invalid action ' + i);
            }
        }
        game.end_turn();

        write_each(game.get_players(), {
            'q': 'turn',
            'game_id': game_id,
            'actions': actions,
        }, remote);
    };

    var init = function()
    {
        // Log message when server goes down
        process.on('exit', function()
        {
            console.log('Server stopped at ' + new Date());
        });

        // Setup signal handlers
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array)
        {
            process.on(element, function()
            {
                console.log('Received ' + element + ' at ' + new Date() + ', exiting...');
                process.exit(1);
            });
        });

        // Create server
        app = express();

        // Setup routes
        app.get('/bundle.js', send_script);
        app.use(express.static(__dirname + '/public'));

        // Start listening
        var server = app.listen(get_port(), get_ip_address(), function()
        {
            var host = server.address().address;
            var port = server.address().port;

            console.log('Server listening at ' + host + ':' + port);
        });

        primus = new Primus(server, {
            'transformer': 'websockets',
        });
        compile_script();
        primus.on('connection', function(spark)
        {
            return new Remote(_this, spark);
        });
    };

    var get_ip_address = function()
    {
        return process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';
    };
    var get_port = function()
    {
        return process.env.OPENSHIFT_NODEJS_PORT || 8080;
    };

    var compile_script = function(callback)
    {
        script = Config.uncompiled_script;

        var b = browserify();
        b.add(__dirname + '/client.js');
        var res = b.bundle(function(err, buffer)
        {
            if (err)
            {
                console.error(err);
                return;
            }

            script = '// Autogenerated by js/server.js\n\n';
            script += primus.library() + '\n\n';
            script += buffer.toString() + '\n\n';

            var script_hash = require('crypto').createHash('md5').update(script).digest('hex');
            script += 'var script_hash = ' + JSON.stringify(script_hash) + ';';

            if (typeof callback === 'function')
            {
                callback();
            }
        });
    };

    var send_script = function(req, res)
    {
        // Debug: This re-compiles the script for every request to aid debugging
        compile_script(function()
        {
            res.send(script);
        });

        // Prod:
        // res.send(script);
    };

    init();
};

new ServerApp();

/*
var hex_pool = [];
var hex_pool_next = 0;

var hide_cells = function()
{
    hex_pool_next = 0;
};

var show_cell = function(row, col, type)
{
    if (hex_pool_next >= hex_pool.length)
    {
        hex_pool.push(make_cell());
    }

    set_transform(hex_pool[hex_pool_next], _this.get_loc(row, col));
    set_type(hex_pool[hex_pool_next], type);
    hex_pool_next++;
};

var finalize_cells = function()
{
    for (var i = hex_pool_next; i < hex_pool.length; i++)
    {
        hex_pool[i].style.display = 'none';
    }
};

box.onchange = box.onkeyup = function()
{
    hide_cells();

    var type_map = {
        'n': _this.CELL_EMPTY,
        'v': _this.CELL_EDGE,
        'w': _this.CELL_WALL,
    };
    var warning_callback = function(msg)
    {
        console.error(msg);
    };
    construct_hex_grid(this.value, type_map, _this.CELL_EMPTY, show_cell, warning_callback);

    finalize_cells();
};
*/
